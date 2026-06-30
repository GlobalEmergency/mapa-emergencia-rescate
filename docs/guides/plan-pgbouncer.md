# Plan: adoptar PgBouncer (pooler de conexiones a Postgres)

> Decisión y razonamiento en [ADR 0007](../adr/0007-pooler-de-conexiones-postgres.md).
> Este documento es el **cómo** (pasos de implementación), no el **por qué**.
>
> Estado: **implementado en el pipeline.** El deploy de prod
> (`deploy-hetzner.yml`) crea el secret `pgbouncer-auth` (derivado del
> DATABASE_URL de app-env), aplica `infra/k8s/pgbouncer.yaml` y enruta SOLO el
> tier API por el pooler (override `DATABASE_URL` en el contenedor api de
> `deployment.yaml`). Los carve-outs (migrate Job, migrate-worker,
> hub-credentials) siguen DIRECTOS. Probado en local con
> `DB_TARGET=pgbouncer:6432 docker compose --profile pgbouncer up`.

## Resumen en una línea

PgBouncer es un **proceso proxy aparte** (no código en el backend): se despliega
como un **Deployment + Service** central en el namespace `mapa`, en **modo
transacción**, con **2 réplicas** (una por nodo worker) + anti-afinidad + PDB. La
app solo cambia el **host de `DATABASE_URL`** para apuntar al Service de PgBouncer
en vez de a Postgres directo.

## Arquitectura objetivo

```
ANTES:   api/web/admin pods ──(pg)──▶ Postgres 10.0.1.10:5432
AHORA:   api/web/admin pods ──(pg)──▶ Service pgbouncer:6432 ──▶ Postgres 10.0.1.10:5432
                                         │ 2 pods (1 por worker)
                                         │ modo transacción
                                         └ multiplexa: ~1000 conns de app → ~50 reales

Carve-outs (NO pasan por PgBouncer, conexión DIRECTA a Postgres):
  • migrate Job (schema migrations necesitan sesión)         → DATABASE_URL directa
  • hub-credentials.ts → ya usa HUB_ADMIN_DATABASE_URL (otra BD, sin cambios)
```

## Dimensionamiento (cabe en los 2 workers actuales, sin nodo nuevo)

- 2 réplicas × ~50m CPU / 64Mi RAM. Los workers tienen ~1 core y ~2 GB libres
  (por requests) cada uno. Cabe holgado. No requiere nodo nuevo.
- `default_pool_size = 25` × 2 réplicas = ~50 conexiones reales máx a Postgres
  (`max_connections = 100`) → deja margen para migrate, admin y replicación.
- 2 réplicas (no 3) porque hay 2 workers base: con anti-afinidad `required`, 3
  réplicas dejarían 1 pod `Pending` hasta que el autoscaler sume un nodo. 2 = una
  por worker, sobrevive a la caída/scale-down de un nodo. Es el default de
  CloudNativePG.

## Pre-vuelo (verificar ANTES de desplegar)

Modo transacción rompe estado de sesión entre queries. Auditoría hecha:

- [x] **Sin `.prepare()` de Drizzle** en `backend/` (Drizzle+`pg` no usa prepared
      statements con nombre por default → compatible).
- [x] **Sin `LISTEN/NOTIFY` ni advisory locks** en el camino de request (el
      trabajo en background usa BullMQ/Redis, no pub/sub de Postgres).
- [x] **`hub-credentials.ts`** (`SET SESSION`, `ALTER ROLE`) usa
      `HUB_ADMIN_DATABASE_URL` (BD del Hub, conexión aparte) → **no** pasa por este
      pooler, sin cambios necesarios.
- [ ] Re-verificar estos puntos si se añade código nuevo antes de desplegar.

## Pasos

### 1. Crear el secret de auth de PgBouncer

PgBouncer necesita credenciales para conectar a Postgres. Reusar las del
`app-env` (mismo user/pass que ya usa la app). Crear un secret dedicado con
`userlist` (formato que PgBouncer espera):

```bash
# user/pass = los mismos del DATABASE_URL actual
kubectl -n mapa create secret generic pgbouncer-auth \
  --from-literal=DB_USER='<user>' \
  --from-literal=DB_PASSWORD='<pass>'
```

(En CI/deploy: añadir como secret del environment `production-hetzner`, igual que
`OBS_PUSH_TOKEN`, y que el workflow lo cree gateado.)

### 2. Escribir `infra/k8s/pgbouncer.yaml`

Un solo manifiesto con 4 objetos:

- **ConfigMap `pgbouncer-config`** — `pgbouncer.ini`:
  ```ini
  [databases]
  app = host=10.0.1.10 port=5432 dbname=app

  [pgbouncer]
  listen_addr = 0.0.0.0
  listen_port = 6432
  auth_type = scram-sha-256
  auth_file = /etc/pgbouncer/userlist.txt
  pool_mode = transaction
  max_client_conn = 1000
  default_pool_size = 25
  reserve_pool_size = 5
  server_idle_timeout = 300
  ```
  (Imagen recomendada: `edoburu/pgbouncer`, que genera `userlist.txt` desde
  `DB_USER`/`DB_PASSWORD` del secret vía variables de entorno.)

- **Deployment `pgbouncer`** — `replicas: 2`, imagen `edoburu/pgbouncer:latest`
  (pinear versión), env del secret `pgbouncer-auth`, monta el ConfigMap,
  `containerPort: 6432`, requests `cpu: 50m / memory: 64Mi`, limits `memory:
  128Mi`, readiness/liveness `tcpSocket: 6432`. **podAntiAffinity**
  `requiredDuringSchedulingIgnoredDuringExecution` sobre `kubernetes.io/hostname`
  (una réplica por nodo).

- **Service `pgbouncer`** — `ClusterIP`, puerto `6432 → 6432`. Da el DNS estable
  `pgbouncer.mapa.svc.cluster.local:6432`.

- **PodDisruptionBudget `pgbouncer`** — `minAvailable: 1` (el autoscaler/drenaje
  nunca deja el pool en 0 durante scale-down de nodos).

### 3. Aplicar y verificar (SIN tocar la app todavía)

```bash
kubectl apply -f infra/k8s/pgbouncer.yaml
kubectl -n mapa rollout status deploy/pgbouncer
kubectl -n mapa get pods -l app=pgbouncer -o wide   # 1 por nodo distinto
# probar que multiplexa: conectar a través del Service desde un pod
```

Dejarlo correr y observarlo sano un tiempo en Grafana antes del paso 4.

### 4. Enrutar la app al pooler (el cambio que activa todo)

Cambiar **solo el host** del `DATABASE_URL` del secret `app-env`:

```
postgres://user:pass@10.0.1.10:5432/app
            ↓ host → Service de PgBouncer
postgres://user:pass@pgbouncer.mapa.svc.cluster.local:6432/app
```

```bash
kubectl -n mapa create secret generic app-env \
  --from-literal=DATABASE_URL='postgres://user:pass@pgbouncer.mapa.svc.cluster.local:6432/app' \
  ... (resto de claves) --dry-run=client -o yaml | kubectl apply -f -
kubectl -n mapa rollout restart deploy/api deploy/web deploy/admin
```

**NO cambiar** el `DATABASE_URL` del **migrate Job** (`migrate-job.yaml`): sigue
directo a `10.0.1.10:5432`. Las migraciones necesitan sesión y no deben pasar por
el pooler en modo transacción.

### 5. Verificar post-corte

- `pg_stat_activity`: las conexiones reales a Postgres deben **bajar** (ahora las
  abre PgBouncer, no cada pod). Confirmar que `client_addr` ahora es el de los
  pods de PgBouncer.
- Dashboards `/api/missing/` p95/p99 bajo carga: la cola de pool desaparece.
- Probar un deploy con migración para confirmar que el migrate Job sigue directo.

## Rollback

Revertir el `DATABASE_URL` del `app-env` al host de Postgres directo
(`10.0.1.10:5432`) y `rollout restart`. PgBouncer queda corriendo pero sin
tráfico; borrarlo con `kubectl delete -f infra/k8s/pgbouncer.yaml` si se quiere.

## Resiliencia ante scale-down de nodos (ver ADR 0007)

- **App pods que mueren al calmarse el tráfico:** PgBouncer ve clientes
  desconectarse y libera slots. Sin impacto (es su trabajo).
- **Un nodo con una réplica de PgBouncer muere:** el Deployment recrea la réplica
  en otro nodo; la otra réplica sigue sirviendo; el driver `pg` reconecta. Blip de
  conexiones sub-segundo, sin outage. PDB `minAvailable:1` + anti-afinidad lo
  garantizan.

## Futuro (PgCat / nodo dedicado)

- Migrar a **PgCat** si se añaden réplicas de lectura (enrutado read/write) o se
  mueve a nodos grandes (8+ cores). Es compatible a nivel de protocolo: solo se
  reescribe la config (`.ini` → `.toml`) y se cambia la imagen; la app no cambia.
- Mover PgBouncer a un **nodo estable dedicado** (no autoscalado) si los blips de
  scale-down llegan a molestar.

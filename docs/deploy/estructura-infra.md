# Estructura de la infraestructura

Mapa rápido de qué hay dónde. Detalle arquitectónico en
[docs/architecture/despliegue-kubernetes.md](../architecture/despliegue-kubernetes.md).

## Carpetas

```
infra/
├── tofu/                 OpenTofu (provider hcloud) — provisiona la infra
│   ├── network.tf        Red privada 10.0.0.0/16 + subnet 10.0.1.0/24
│   ├── k3s-master.tf     mapa-master (control plane, 10.0.1.5)
│   ├── k3s-workers.tf    Workers FIJOS (k3s_worker_count default 0 → efímeros)
│   ├── postgres.tf       mapa-postgres (10.0.1.10) + volumen pgdata
│   ├── valkey.tf         mapa-valkey (10.0.1.11)
│   ├── firewall.tf       Solo 22 (SSH) y 6443 (API k3s para CI)
│   ├── backend.tf        Estado remoto S3 en Hetzner Object Storage
│   ├── ssh.tf            Clave SSH pública en cada servidor (mapa-key)
│   ├── versions.tf       required_version + provider hcloud pinneado
│   ├── variables.tf / outputs.tf
│   └── cloud-init/*.tftpl  Bootstrap de cada servidor (k3s/CCM, PG, Valkey)
├── k8s/                  Manifiestos del clúster
│   ├── service.yaml      Namespace + DOS Services LoadBalancer (TEMPLATE, TLS por target)
│   ├── deployment.yaml   DOS Deployments del mismo image: web + api (3 réplicas c/u)
│   ├── hpa.yaml          HPA por tier (web 3→20, api 3→30, CPU 60%)
│   ├── cluster-autoscaler.yaml  CA de Hetzner (escala NODOS, pool --nodes=2:5)
│   ├── worker-deployment.yaml   Workers BullMQ de migración
│   ├── hub-backfill-job.yaml    Job productor del backfill del hub (RFC 0002)
│   ├── secret.example.yaml      Template del Secret app-env (sin valores reales)
│   ├── migrate-job.yaml         Job gateado de migración de ESQUEMA (Drizzle)
│   └── migrate-enqueue-job.yaml Job productor de migración de DATOS (manual)
└── db/                   Esquema + migraciones (van en la imagen)
    ├── schema.ts         Fuente de verdad (Drizzle)
    ├── drizzle.config.ts
    └── migrations/*.sql  Migraciones versionadas + meta/_journal.json
```

## Componentes en runtime

| Componente | Dónde | Rol |
| --- | --- | --- |
| App Next.js (web) | Deployment `web` en k3s (tier=web, 3 pods, HPA 3→20) | UI/SSR + /api same-origin |
| App Next.js (api) | Deployment `api` en k3s (tier=api, 3 pods, HPA 3→30) | /api para terceros (mismo image) |
| Workers | Deployment `migrate-worker` | migración datos/fotos + schedulers (BullMQ) |
| Postgres | VPS `mapa-postgres` 10.0.1.10 | BD `app` (prod) + `imported` |
| Valkey | VPS `mapa-valkey` 10.0.1.11 | colas BullMQ |
| LB web | `mapa-lb` (creado por el CCM) | ingreso público (dominio terremoto…) |
| LB api | `mapa-api-lb` (creado por el CCM) | ingreso de terceros (api.terremoto…) |
| Cluster-autoscaler | pod en k3s (sobre el master) | escala NODOS efímeros (pool 2→5) |
| R2 (Cloudflare) | `bucket-vzla-terremoto.dreamit.software` | imágenes + assets estáticos Next |
| Cloudflare | borde | TLS, caché, bot-fight, WAF, DNS |
| Estado OpenTofu | Hetzner Object Storage `terremoto-vzla-bucket` | tfstate (NO en R2) |

## web + api: dos tiers del mismo image

`deployment.yaml` despliega el **mismo** image de Next.js (standalone, un solo
`server.js`) como dos Deployments separados:

- `web` (tier=web): UI/SSR + `/api` same-origin, lo enruta el LB `mapa-lb`.
- `api` (tier=api): la superficie `/api` para consumidores externos, lo enruta el
  LB `mapa-api-lb`.

Cada tier tiene su propio HPA (`hpa.yaml`) para escalar de forma independiente y
aislar el blast-radius. `service.yaml` declara el Namespace y los **dos** Services
LoadBalancer; el CCM de Hetzner aprovisiona un LB real por cada uno. Las
anotaciones de TLS se inyectan por target con `envsubst`
(`WEB_TLS_ANNOTATIONS` / `API_TLS_ANNOTATIONS`): `staging` = TLS en Cloudflare
(cf-origin, LB en HTTP plano), `prod` = cert managed de Hetzner en el LB.

## Nodos efímeros (modelo configurado)

`infra/tofu/variables.tf` trae `k3s_worker_count` con default **0**: no hay
workers fijos. El `cluster-autoscaler.yaml` (CA de Hetzner) es dueño de TODOS
los workers vía su pool `--nodes=2:5` y crea/destruye VPS efímeros según los pods
Pending. Es el estado **configurado** en los manifiestos y los defaults de tofu;
el cutover desde workers fijos tiene pasos manuales — ver el runbook en
[docs/rfcs/0004](../rfcs/0004-autoscaling-y-split-web-api.md) antes de bajar el
count a 0.

## Datos: dos bases en el mismo Postgres

- `app` — BD interna de la app (lo que la app lee/escribe; aquí viven los datos
  migrados de Neon). **Es el prod actual.**
- `imported` — reservada para sync/export.

Neon (`NEON_DATABASE_URL`) es la **fuente legada** de la migración; ya no recibe
el tráfico de la app.

## Cómo se relaciona con el deploy

- `infra/tofu/` se aplica **manualmente** (provision/recreate) — fuera del
  workflow de deploy.
- `infra/k8s/` + `infra/db/` los aplica el **workflow de deploy** (deploy-only,
  desde main). Ver [proceso-de-deploy.md](proceso-de-deploy.md).

# ADR 0007 — Pooler de conexiones a Postgres: PgBouncer cuando haga falta

> Estado: aceptada · Relacionado: [ADR 0003 (caché en proceso)](0003-cache-en-proceso.md),
> [arquitectura](../architecture/architecture.md)

## Contexto

El backend abre conexiones a Postgres con `node-postgres` (`pg`) vía Drizzle
(`backend/src/db/index.ts`). Hoy el `Pool` se crea **sin `max`**, así que toma el
default de `pg`: **10 conexiones por proceso**.

Una conexión de Postgres **no se multiplexa**: procesa **una query a la vez**, de
principio a fin (protocolo FE/BE, FIFO). El event loop de Node es async, pero esa
asincronía termina en el borde de la conexión. Por tanto el número de requests que
tocan la BD **en paralelo** por pod está topado por `max` (10). El request #11
**espera en cola** hasta que se libere una conexión — y esa espera es latencia de
cola (cola p95/p99), no tiempo de query.

Tensión estructural de nuestra infra: la API **autoescala 3→30 pods** (HPA), y el
Postgres de Hetzner tiene **`max_connections = 100`**. Si cada pod usara `max: 20`,
30 pods = 600 conexiones → **revienta** el límite del servidor. El presupuesto de
conexiones hay que razonarlo **sumando todos los pods**, no por pod.

Estado medido (jun 2026, tráfico bajo ~3 req/s): el endpoint caliente
`/api/missing/` da **p50 = 3 ms, p95 = 155 ms**, ráfaga de 30 concurrentes desde
dentro del pod = **60 ms p95, 0 errores**. `pg_stat_activity` muestreado 12 s: **0
momentos de pool fijado** (>=10 conexiones con 0 idle). El [caché en proceso
(ADR 0003)](0003-cache-en-proceso.md) colapsa el polling y mantiene las queries
reales bajísimas. **Hoy NO hay agotamiento de pool.** El riesgo es a futuro, con
tráfico de ONG ante desastre mundial.

Postgres **no trae pooling integrado** (cada conexión = un proceso del SO). A
escala, un pooler externo es práctica estándar de la industria (Instagram, Notion,
Figma; AWS RDS Proxy; Cloud SQL). Las opciones self-hosted relevantes son
**PgBouncer**, **PgCat** y Odyssey.

## Decisión

**No introducir un pooler todavía.** Los datos dicen que no hay problema que
resolver, y un pooler tiene costos reales (ver Consecuencias). Mientras tanto,
como higiene defensiva, fijar en el `Pool` un `max` explícito y
`connectionTimeoutMillis` para tener un techo conocido y fallar rápido bajo
presión, en vez del default implícito.

**Cuando el tráfico lo justifique, adoptar PgBouncer** (no PgCat), desplegado como
**tier compartido** (Deployment + Service de 2+ réplicas), en **modo transacción**.

Motivos de elegir **PgBouncer** sobre PgCat **para nuestro hardware actual**
(nodos Hetzner `cx22`: **2 vCPU / 4 GB**):

- PgBouncer es el más liviano (≈2 MB/1000 clientes), menor uso de CPU, el más
  battle-tested y de mayor comunidad.
- La única "debilidad" de PgBouncer (single-thread) **no nos afecta**: en un nodo
  de 2 cores no hay paralelismo que aprovechar, y queremos dejar CPU/RAM (la RAM
  ya es el recurso más ajustado) para los pods de la app.
- PgCat (Rust, multi-thread) **solo rinde su ventaja con muchos cores**; en nodos
  de 2 cores pagaríamos su mayor footprint de CPU/RAM **sin** el beneficio.

**Reconsiderar PgCat** únicamente si en el futuro: (a) movemos a nodos grandes
(8+ cores) donde el escalado multi-core paga, o (b) añadimos **réplicas de
lectura** y queremos enrutado read/write automático o sharding.

### Disparador (cuándo dejar de diferir)

Adoptar PgBouncer cuando la observabilidad muestre **agotamiento de pool real y
sostenido**: `pg_stat_activity` fijado cerca de `max_connections` y/o `p95` de
`/api/missing/` (u otra ruta caliente) que correlacione con concurrencia, no con
queries lentas. Señal canónica: `totalCount === max && idleCount === 0 &&
waitingCount > 0` durante más que unos segundos.

### Pre-vuelo antes de adoptar (modo transacción)

El modo transacción rompe el estado de sesión entre queries. Nuestra combinación
**Drizzle + `pg`** es de las más compatibles (no usa prepared statements con
nombre por default; ya auditado: **sin `.prepare()`** en `backend/`, sin
`LISTEN/NOTIFY` ni advisory locks en el camino de request). Carve-outs necesarios,
ambos **conexión DIRECTA a Postgres** (saltando el pooler):

1. **Migraciones** (`infra/k8s/migrate-job.yaml` / `worker/migrate.ts`): los
   schema-migrate siempre van directos; ya es un componente aparte con su propia
   `DATABASE_URL`.
2. **`backend/src/services/hub-credentials.ts`**: usa `SET SESSION` y `ALTER ROLE`
   (provisión de credenciales, no es camino caliente). Debe conectar directo.

## Consecuencias

- ✅ **Sin sobre-ingeniería hoy.** No añadimos un componente crítico ni costos
  operativos para un problema que las métricas dicen que no tenemos.
- ✅ **Camino de adopción seguro y registrado.** Cuando llegue el tráfico, el
  trabajo es: deploy de PgBouncer (tier compartido), apuntar la API a su Service,
  y los dos carve-outs directos. Sin reescribir código ni desactivar prepared
  statements (no los usamos).
- ✅ **Migrar PgBouncer → PgCat después es barato.** PgCat es **compatible a nivel
  de protocolo**: la app no cambia (`DATABASE_URL` sigue apuntando a "un pooler");
  solo se reescribe la config (`pgbouncer.ini` → `pgcat.toml`) y se cambia la
  imagen del Deployment. Los features de PgCat (read/write split, sharding) son
  opt-in. Diferir PgCat no cierra ninguna puerta.
- ⚠️ **Un pooler añade un SPOF** en el camino a la BD (pod → pooler → Postgres).
  PgBouncer no tiene HA propia (no detecta failover); por eso se despliega como
  **2+ réplicas detrás de un Service**, lo que es el patrón operativamente más
  complejo. Es el costo principal de adoptarlo.
- ⚠️ **Contrato de modo transacción.** Nuevo código debe respetar: nada de `SET
  SESSION` (usar `SET LOCAL`), nada de prepared statements con nombre que crucen
  transacciones, nada de `LISTEN/NOTIFY` ni advisory locks de sesión en el camino
  de la app. Si algún día se usa Drizzle `.prepare()`, revalidar.
- ⚠️ **Latencia:** un pooler añade ~µs en baseline (un hop extra en la red privada,
  despreciable) pero **reduce** drásticamente la latencia de cola (p95/p99) cuando
  la concurrencia dispara el agotamiento de pool — que es justo el motivo de
  usarlo. Neto: pro, no contra, una vez hay contención.
- ⚠️ **Mantener el presupuesto de conexiones global.** `Σ(max de todos los pods +
  workers + admin) ≤ ~80` (dejar ~20 % de `max_connections` para admin/replicación)
  si NO hay pooler; con PgBouncer en modo transacción, los pods abren un pool
  generoso al pooler y PgBouncer multiplexa sobre un set pequeño de conexiones
  reales a Postgres.

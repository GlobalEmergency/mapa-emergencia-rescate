# Migraciones de base de datos (Drizzle)

El esquema se gestiona con **Drizzle ORM + drizzle-kit**. Ya NO hay creación
perezosa de tablas en runtime dentro de la API.

## Fuente de verdad

- **Esquema:** `infra/db/schema.ts` (Drizzle). Define las 38 tablas (incluye el
  tier RBAC/auth del panel admin, `api_keys` y `hub_credentials`; ver
  [modelo de datos](../db/modelo-de-datos.md)).
- **Migraciones generadas:** `infra/db/migrations/*.sql` (+ `meta/_journal.json`).
- **Config drizzle-kit:** `infra/db/drizzle.config.ts`.
- **Acceso desde la app:** `backend/src/db` (`getDb()`, helper central).

## Flujo para cambiar el esquema

1. Edita `infra/db/schema.ts`.
2. Genera la migración:
   ```bash
   cd backend
   npm run db:generate   # drizzle-kit generate -> infra/db/migrations/NNNN_*.sql
   ```
3. **Revisa el `.sql`** y commitea el archivo + `meta/_journal.json`.
4. Deploy. El Job gateado la aplica.

> Regla **expand-contract**: las migraciones deben ser compatibles hacia atrás.
> Durante el roll los pods viejos siguen sirviendo, así que el esquema nuevo
> tiene que funcionar con el código viejo (agrega columnas nullable, no las
> elimines en la misma release, etc.).

> NUNCA edites una migración ya aplicada. Drizzle guarda el hash de cada `.sql`;
> si cambia, falla (no la re-corre en silencio). Agrega una migración nueva.

## Cómo se aplican (Job gateado, automático en deploy)

- Imagen: la **backend** (lleva node_modules + tsx + los `.sql`; la imagen
  frontend es standalone y no los incluye).
- Comando: `npm run migrate` → `backend/worker/migrate.ts` → `migrate()` de
  `drizzle-orm/node-postgres/migrator`.
- Manifiesto: `infra/k8s/migrate-job.yaml` (CI le pone nombre `migrate-<sha>` e
  inyecta la imagen `:<sha>`).
- En el workflow corre como **"Apply DB migrations (gated)"** ANTES del roll:
  bloquea con `kubectl wait --for=condition=complete`. Si falla, la app NO rota.

### Idempotencia / "skip" tipo Django

Drizzle registra lo aplicado en la tabla **`drizzle.__drizzle_migrations`**
(equivalente a `django_migrations`). Re-correr salta lo ya aplicado. La baseline
`0000` se hizo idempotente (`IF NOT EXISTS` + FK guardada) para una BD que ya
existía.

## Manual (si hace falta correrlo fuera del deploy)

```bash
cd backend
# genera (offline, no toca la BD)
npm run db:generate
# aplica contra $DATABASE_URL
npm run migrate
```

## Migración de DATOS (distinto de esquema)

Mover datos de Neon → Hetzner y fotos (base64/URLs externas) → R2 es otro
sistema: los **workers BullMQ** en `backend/worker/`. Ver
[backend/worker/README.md](../../backend/worker/README.md). Se dispara con el Job
`migrate-enqueue` (manual), es re-ejecutable e idempotente.

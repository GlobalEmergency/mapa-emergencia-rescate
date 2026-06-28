# ADR 0001 — Identidad de registros externos por (source, external_id)

> Estado: aceptada · Relacionado: [RFC 0001](../rfcs/0001-sincronizacion-fuentes.md)

## Contexto

Al sincronizar fuentes externas necesitamos una identidad estable por registro
para que re-correr la sync **actualice** en vez de **duplicar**. La tabla
`missing_persons` ya tenía un índice único parcial sobre `external_id`.

Validando contra una copia real de producción descubrimos que los ~33k registros
ya importados manualmente guardaron el `external_id` **crudo** (ej.
`p8fd01c513881`). Si lo hubiéramos *namespaced* (`source:rawId`) los nuevos
upserts no harían match y se habrían **duplicado ~33k filas**.

## Decisión

- Guardar el `external_id` **crudo**, tal como viene de la fuente.
- Mover la unicidad a un índice compuesto parcial
  `UNIQUE (source, external_id) WHERE external_id IS NOT NULL`.
- El upsert usa `ON CONFLICT (source, external_id)`.
- El esquema (incluido el índice único compuesto
  `missing_persons_source_external_id_idx`) vive en `infra/db/schema.ts` y se
  aplica por **migraciones Drizzle** (el `ensureSchema` a nivel de app fue
  eliminado). La migración crea el compuesto y suelta el antiguo de solo
  `external_id`, dejando la unicidad siempre protegida. Las migraciones las
  corre el Job `migrate` (`worker/migrate.ts` → `migrate()` de drizzle-orm) en
  cada deploy.

## Consecuencias

- ✅ Dos fuentes pueden reusar el mismo id crudo sin chocar.
- ✅ Los datos ya importados siguen funcionando sin reescritura masiva; la
  migración en prod es solo un *swap de índice* (no reescribe filas).
- ✅ Confirmado read-only contra prod: los ids de la API coinciden 20/20 con los
  `external_id` ya importados → la sync actualiza, no duplica.
- ⚠️ El `source` es obligatorio en registros externos (el upsert lo exige); sin
  `source` no hay identidad.
- ⚠️ El script legacy `scripts/import-missing.mjs` se alineó al nuevo
  `ON CONFLICT` e índice.

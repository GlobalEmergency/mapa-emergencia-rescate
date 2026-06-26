# ADR 0006 — Estrategia de búsqueda de personas (trigram + mínimo, conteo acotado y caché)

> Estado: aceptada · Relacionado: [ADR 0003 (caché)](0003-cache-en-proceso.md) · [guía de rendimiento](../guides/rendimiento-y-pruebas-de-carga.md)

## Contexto

La búsqueda de personas desaparecidas (`GET /api/missing?q=…`) es un punto
crítico: con exposición mediática mucha gente busca por nombre. Es además el caso
donde el micro-caché ayuda menos (cada término distinto es una clave nueva).

El esquema ya tenía un índice **GIN de trigramas** (`idx_missing_search`) sobre
`f_unaccent(name || ' ' || last_seen || ' ' || description)`. Midiendo el plan
real con `EXPLAIN ANALYZE` sobre **59.514 filas**:

| Operación | Costo | Observación |
| --- | --- | --- |
| SELECT de página, término común (`jose`) | ~1,6 ms | el planner camina el índice ordenado y filtra |
| SELECT de página, término raro | ~13 ms | el planner usa el GIN (bitmap) |
| **`count(*)` exacto, por request** | **~42 ms** | el costo dominante; se repetía en cada poll |
| Término **<3 caracteres** | **~43 ms (seq scan)** | el trigram no indexa <3 chars |

Conclusión: el **SELECT de página ya estaba bien** (el planner elige bien según
la selectividad). El problema era el **`count(*)`** que se ejecuta en cada
request — agravado porque el cliente no exigía un mínimo de caracteres y porque
la búsqueda seguía refrescándose en el polling.

## Decisión

Tres optimizaciones, **sin cambiar el esquema** (se mantiene el índice trigram):

1. **Mínimo `MIN_SEARCH_LEN = 3` caracteres** por término, en cliente y servidor
   (`searchTerms` descarta los más cortos). Evita el seq scan de los términos de
   1-2 letras, que el trigram no puede servir.
2. **Conteo acotado a `SEARCH_COUNT_CAP = 500`**:
   `SELECT count(*) FROM (SELECT 1 … LIMIT 500) t`. El conteo para temprano
   (**42 ms → 17 ms**) y la UI muestra "500+". El listado **sin** búsqueda
   conserva el conteo exacto (es el número de titular).
3. **TTL de caché más largo para búsquedas** (2 s → 30 s, y `s-maxage` 2 → 30).
   Las búsquedas no necesitan frescura de 2 s; el TTL largo colapsa los re-counts
   del polling y comparte las búsquedas populares entre usuarios.

**Descartado:** `count(*) OVER()` para combinar conteo y página en una query
(medido: ~144 ms — peor, porque la ventana obliga a contar todo sin parar en el
`LIMIT`).

**No adoptado (futuro):** Full-Text Search (`tsvector` + `ts_rank`). No hace
falta por rendimiento (la página ya es rápida), pero daría ranking por
relevancia (hoy los resultados salen por fecha). Es un cambio de esquema y de
semántica (prefijo de palabra vs substring); se evaluará aparte si se quiere
mejorar la *calidad* de los resultados, no su velocidad.

## Consecuencias

- ✅ Una búsqueda activa pasa de "~42 ms a la BD cada 8 s por usuario" a
  "~17 ms una vez cada 30 s, compartido entre buscadores".
- ✅ Los términos de <3 caracteres ya no tocan la BD con seq scans.
- ✅ Validado en runtime (59.514 filas): `q=jo` → no filtra (igual que el
  listado); `q=jose` → `total=500, totalCapped=true`; término raro → conteo
  exacto; multi-término intersecta; paginación correcta.
- ⚠️ Para búsquedas con >500 coincidencias se muestra "500+" y la paginación se
  acota a esas 500 (el usuario refina el término). Es un compromiso aceptable: en
  una búsqueda nadie necesita el total exacto ni la página 30.

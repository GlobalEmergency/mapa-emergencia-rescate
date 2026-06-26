# ADR 0003 — Caché en proceso (SWR + single-flight) para el camino de lectura

> Estado: aceptada · Relacionado: [guía de rendimiento](../guides/rendimiento-y-pruebas-de-carga.md)

## Contexto

La app es de **polling masivo**: el cliente refresca mapas y listas cada ~5 s
mientras la pestaña está visible. Con exposición mediática se esperan picos de
cientos de miles a millones de usuarios.

Cada GET caliente ya traía `Cache-Control: s-maxage=…` pensando en el CDN de
Vercel. Pero ese header **no hace nada si no hay un CDN delante**, y el
despliegue real no está garantizado. Sin CDN, cada poll llegaba al proceso Node
y, antes de este cambio, **cada poll era una query a la base de datos**:

| Usuarios en polling | Queries/s a la BD (antes) |
| --- | --- |
| 100.000 | ~60.000 ❌ (Postgres/Neon se cae por mucho) |

La BD era el **techo duro** del sistema.

## Decisión

Añadir un **micro-caché en proceso** (`lib/cache.ts`) que cachea la respuesta ya
construida de los GET calientes durante el mismo TTL que su `s-maxage`:

- `cached(key, ttlMs, fn)` aplicado a `reports`, `missing/stats`, `missing`,
  `missing/map`, `hospitals`, `hospitals/[id]` y `donations`.
- **single-flight**: una sola recomputación concurrente por clave. Si la entrada
  expira mientras llegan miles de requests a la vez, solo **una** dispara la
  query; el resto no genera estampida.
- **stale-while-revalidate**: si hay un valor viejo, se sirve al instante y la
  recomputación ocurre en segundo plano.
- **LRU acotado** (500 claves) para los endpoints parametrizados.
- Clave normalizada por parámetros: el caso por defecto (sin búsqueda, sin
  viewport, página 1 — el ~95 % del tráfico) cachea perfecto; el resto entra al
  LRU con TTL corto.

Complemento en el camino de lectura: **ETag / 304** (`lib/http.ts`,
`jsonWithEtag`) + cliente con `cache: "no-cache"`. Cuando el dato no cambia, el
poll recibe un `304 Not Modified` vacío y el navegador reusa el body cacheado
(ahorra ancho de banda y parseo). El valor ya está serializado por el caché, así
que solo se hashea.

## Consecuencias

- ✅ **La BD deja de ser el techo.** Las queries pasan a ser
  `instancias × (duración / TTL)`, **no** una por usuario. Medido: 200 requests
  concurrentes a `stats` → **1 sola query**; carga sostenida de ~10 s → 2-3
  queries.
- ✅ Una sola instancia (build de prod) sirvió **~5.958 req/s** en `stats`,
  p99 = 56 ms, 0 fallos. Ver [guía de rendimiento](../guides/rendimiento-y-pruebas-de-carga.md).
- ✅ El primitivo está validado en aislamiento (single-flight con 1.000
  concurrentes → la función corre 1 vez; SWR; TTL; LRU; aislamiento por clave;
  manejo de errores).
- ⚠️ El caché es **por instancia** (no compartido). Cada instancia paga su
  primera query por ventana de TTL. Es aceptable justamente porque el costo a la
  BD escala con instancias, no con usuarios.
- ⚠️ Ventana de obsolescencia = TTL (2–10 s). Tolerable para datos de emergencia
  (ya estaba implícito en el `s-maxage`).
- ⚠️ Sin CDN, **cada request sigue llegando al Node**: el techo pasa a ser
  CPU/ancho de banda del proceso (~3.000–5.000 usuarios activos por instancia).
  Un CDN que respete el `s-maxage` colapsa el polling en el edge y vuelve el
  origin casi irrelevante para lectura — recomendado para escala de millones
  (ver guía, sección "Recomendación de infraestructura").

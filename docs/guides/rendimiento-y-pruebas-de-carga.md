# Rendimiento, capacidad y pruebas de carga

Cómo se comporta la app bajo tráfico masivo, cuánto aguanta, y cómo reproducir
las mediciones. La estrategia detrás de estos números está en los ADRs
[0003 (caché)](../adr/0003-cache-en-proceso.md),
[0004 (CTE)](../adr/0004-escrituras-atomicas-cte.md),
[0005 (seguridad)](../adr/0005-endurecimiento-superficie-http.md) y
[0006 (búsqueda)](../adr/0006-estrategia-de-busqueda.md).

## Resultados medidos

Medido con un build de **producción** del backend (`cd backend && npm run build
&& npm start`, API en `:8080`) contra Postgres local, en una sola instancia.

| Prueba | Resultado |
| --- | --- |
| `GET /api/missing/stats` (ApacheBench, c=200) | **~5.958 req/s**, p50 21 ms, p95 31 ms, p99 56 ms, 0 fallos |
| 200 requests concurrentes a `stats` | **1 sola query** a la BD (single-flight) |
| Carga sostenida ~10 s sobre un GET caliente | 2-3 queries a la BD (≈ duración / TTL) |
| 50 confirmaciones concurrentes, IPs distintas | `confirmations = 50` (sin updates perdidos) |
| 50 confirmaciones concurrentes, misma IP | `confirmations = 1` (dedup atómico) |
| Flood de 500 POST a `/api/reports` | 8 escrituras reales (rate-limit frenó el resto); servidor vivo |
| Anti-DoS body (20 KB / 3 MB / chunked) | `413` sin bufferizar |

**Lectura clave:** la base de datos dejó de ser el cuello de botella. Las queries
escalan con `instancias × (duración / TTL)`, **no** con el número de usuarios.

## Búsqueda (`/api/missing?q=…`)

Plan medido con `EXPLAIN ANALYZE` sobre 59.514 filas (ver
[ADR 0006](../adr/0006-estrategia-de-busqueda.md) para la estrategia):

| Operación | Antes | Después |
| --- | --- | --- |
| SELECT de página (término común/raro) | 1,6 / 13 ms | igual (ya óptimo) |
| `count(*)` por término | ~42 ms exacto | **~17 ms** acotado a 500 ("500+") |
| Término <3 caracteres | ~43 ms (seq scan) | **0** (se ignora) |
| Re-count durante el polling | cada 8 s por usuario | cada 30 s, compartido (TTL de caché) |

Para ver el plan real (sustituir el término):

```bash
EXPR="f_unaccent(name||' '||last_seen||' '||coalesce(description,''))"
psql "$DATABASE_URL" -c "EXPLAIN (ANALYZE, COSTS OFF) \
  SELECT count(*) FROM (SELECT 1 FROM missing_persons \
    WHERE status='active' AND $EXPR ILIKE '%jose%' LIMIT 500) t;"
```

## Modelo de capacidad

Cada usuario con la pestaña activa hace polling de ~3 endpoints cada 5 s
≈ **0,6–1 req/s** (la mayoría resueltos con `304` vacío gracias al ETag).

Tomando un techo conservador de **~3.000 req/s sostenidos por instancia**
(descontando red/TLS reales del pico medido de ~6.000):

| Despliegue | Usuarios activos simultáneos |
| --- | --- |
| 1 instancia (1 proceso) | **~3.000–5.000** |
| 1 VM con cluster (4–8 procesos) | ~15.000–40.000 |
| Autoescalado (k3s/HPA + cluster-autoscaler en Hetzner) | cientos de miles (limitado por ancho de banda, no por la BD) |

**Concurrentes → diarios.** Depende casi por completo de la duración de sesión:

```
Diarios ≈ Simultáneos_pico × (horas_activas × 3600) / (sesión_seg × factor_pico)
```

Con ~16 h activas y pico ≈ 3× el promedio, **5.000 simultáneos** equivalen a
grandes rasgos a **~50.000–300.000 usuarios diarios** para sesiones de 10–30 min
(la franja típica de esta app, donde la gente deja la pestaña abierta
monitoreando). Sesiones cortas (entra-mira-sale) disparan los diarios a las
centenas de miles.

## Qué se rompe primero (cuellos de botella actuales)

1. **CPU / ancho de banda del proceso Node** — sin CDN, cada request llega al
   origin (ya no a la BD). Es el techo de los ~3-5k usuarios/instancia.
2. **Egress de ancho de banda** cuando los datos cambian y muchos reciben el
   payload completo a la vez (entre cambios son `304` vacíos).
3. **La base de datos** — la última, con muchísimo margen.

## Recomendación de infraestructura

Para escala de millones, el multiplicador es un **CDN** (Cloudflare, ya delante
de la API) que respete los `Cache-Control: s-maxage` que ya emiten los
endpoints. El CDN absorbe el polling en el edge y al origin le llega ~1 request
por TTL por PoP, dejando la BD y el Node casi ociosos. Verificar con:

```bash
curl -sI https://api.terremotovenezuela.app/api/reports | grep -i cache
# Buscar  cf-cache-status: HIT  (Cloudflare)
```

El rate-limit en memoria es *best-effort* (por instancia); la protección real
ante DDoS distribuido también es el CDN/WAF.

## Cómo reproducir las pruebas

Requisitos: `psql`, `ab` (ApacheBench) y una BD local (`DATABASE_URL` a
`127.0.0.1`). Build de producción del backend para números realistas:

```bash
cd backend && npm run build && npm start   # build de prod (no usar `npm run dev`); API en :8080
```

**1. Primitivo de caché en aislamiento** (single-flight / SWR / TTL / LRU). El
primitivo vive en `backend/src/lib/cache.ts` y se puede ejercitar sin servidor ni
BD con Vitest:

```bash
cd backend && npm test                # vitest run (toda la suite)
```

**2. ETag / 304:**

```bash
ETAG=$(curl -s -D - -o /dev/null localhost:8080/api/missing/stats \
  | awk 'tolower($1)=="etag:"{print $2}' | tr -d '\r')
curl -s -o /dev/null -w "%{http_code}\n" -H "If-None-Match: $ETAG" \
  localhost:8080/api/missing/stats          # -> 304
```

**3. Atomicidad del CTE bajo concurrencia** (50 confirmaciones simultáneas):

```bash
RID=$(curl -s -X POST localhost:8080/api/reports -H 'content-type: application/json' \
  -d '{"type":"critical","lat":1,"lng":1,"place":"x","affected":1,"needs":"x"}' \
  | python3 -c 'import sys,json;print(json.load(sys.stdin)["report"]["id"])')
# misma IP -> debe quedar en 1
seq 1 50 | xargs -P 50 -I {} curl -s -o /dev/null \
  -X POST "localhost:8080/api/reports/$RID/confirm" -H 'X-Real-IP: 7.7.7.7'
psql "$DATABASE_URL" -tAc "select confirmations from reports where id='$RID';"
```

**4. Stress + conteo de queries a la BD.** Para contar las queries reales que
llegan a Postgres, instrumentar **temporalmente** el acceso en
`backend/src/db/index.ts` (envolver `pool.query` con un `console.error("[DBQ] …")`
detrás de un flag de entorno, p. ej. `LOG_DB`), arrancar con `LOG_DB=1 npm start`,
y:

```bash
ab -n 30000 -c 250 -k -t 10 http://localhost:8080/api/missing/stats
# contar las líneas [DBQ] del log durante la ventana -> ~2-3 en 10 s
```

> Esta instrumentación es solo para medir; **revertir**
> (`git checkout backend/src/db/index.ts`) antes de commitear.

**Ojo (zsh):** no uses una variable de bucle llamada `path`. En zsh, `path` es la
forma en minúscula del array `PATH`; asignarle URLs rompe la resolución de
comandos (`command not found: curl`). Usa otro nombre (`route`, `r`, etc.).

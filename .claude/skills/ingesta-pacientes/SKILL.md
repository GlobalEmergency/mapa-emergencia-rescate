---
name: ingesta-pacientes
description: >-
  Normaliza, deduplica e ingiere listas de personas hospitalizadas/afectadas que
  llegan en cualquier formato (foto, PDF, CSV, JSON, XLSX, texto) a la base de
  datos del proyecto, con dry-run obligatorio y guardas de privacidad. Úsala
  cuando aparezca una lista nueva de pacientes para cargar, cruzar o deduplicar
  (ej. "sube estos pacientes", "ingiere este CSV/JSON de hospitalizados",
  "cruza esta lista con lo que tenemos"). Pensada para que un agente
  (Claude/Cursor/Codex) sepa adaptar y normalizar data de entrada heterogénea.
---

# Ingesta de pacientes hospitalizados

Playbook + librería + scripts para convertir listas crudas y heterogéneas en
filas limpias, deduplicadas y seguras dentro de `hospital_patients`.

## Manual vs automatizado (importante)
Esta skill es la forma **MANUAL / interina** de ingerir listas. En paralelo se
está construyendo el **flujo automatizado**:
`WhatsApp/Telegram → transcripción LLM → verificación humana → BD`
(ver la issue de ingesta del hub central `venezuela-ayuda`). Mientras ese
pipeline no esté en producción, esta skill es el camino. Su lógica de
normalización/dedup es la misma que debería reusar el flujo automatizado.

**Recomendada para cargas en lote (bulk).** Para agregar UNA sola persona, usar
el formulario del panel admin, no esta skill.

## Requisitos
- **Node.js** (scripts `.mjs`, sin build).
- **Correr desde la raíz del repo** con las deps del backend instaladas
  (`cd backend && npm install`): los scripts leen `.env.local` por ruta relativa
  y `lib/db.mjs` resuelve `pg` desde `backend/` (con fallback a la raíz). Si los
  corres desde otro directorio puede no resolver `pg`.
- **Variables de entorno** en `.env.local` (no se commitean):
  - `DATABASE_URL` (o `POSTGRES_URL`) → cadena de conexión Postgres.
    **Es el único requisito real.** Sirve para local, Neon (habla TCP) o el
    Postgres de Hetzner. ⚠️ Para cargar contra **prod (Hetzner)** hace falta
    además acceso de red al Postgres privado (túnel SSH o un Job en k3s); la URL
    sola no alcanza.
- **Para XLSX**: el CLI `unzip` del sistema (un XLSX es un zip; se descomprime
  sin dependencias npm).

## Dependencias y supuestos
**Autocontenida:** solo builtins de Node + su `lib/` + `pg` (node-postgres) del
repo, resuelto desde `backend/` por su propio `lib/db.mjs` (**NO importa código
de la app** ni usa Drizzle). El repo es pg-only tras el split monorepo. Necesita
`DATABASE_URL` y, para XLSX, `unzip`.

**Supuestos del esquema (vía SQL crudo, NO Drizzle - si cambian, actualizar la skill):**
- Tablas `hospital_patients` (id, hospital_id, name, age, condition, status, notes,
  contact, admitted_at, updated_at) y `hospitals` (id, external_id, name, facility_type, …).
- Los `external_id` `MANUAL-HOSP-*` del mapa curado en `lib/hospitals.mjs`.
- `status`/`facility_type`/`condition` como columnas `TEXT` (sin enum de Postgres).

> El repo manda usar Drizzle para el acceso a datos; esta skill usa SQL crudo a
> propósito (herramienta de ops portable/standalone). Si el esquema migra, revisar
> `lib/hospitals.mjs` y los `INSERT`/`SELECT` de `scripts/`.

## Formatos de entrada
- **Los scripts leen** (`readInput`): **JSON**, **CSV** y **XLSX de una sola hoja**.
- **Foto / PDF / texto libre**: el AGENTE los transcribe primero a JSON/CSV (con
  esquema fijo) y luego pasan por la skill. Los scripts **NO hacen OCR**.
- **XLSX multi-hoja** (varias pestañas o filas de título): `readXlsx` solo lee la
  primera hoja → necesita un adaptador propio por archivo.

## Entrada por imágenes / PDF: transcripción + verificación (opcional)
Los scripts NO hacen OCR. Si la entrada son **fotos o PDFs** (listas manuscritas,
capturas), el flujo es:

1. **Transcribir** (visión/LLM) a un esquema fijo - las mismas columnas que el
   resto (apellido, nombre, cédula, edad, hospital, estado, notas) **+ un campo
   `confianza` 0-1 por fila**. Guardar como JSON/CSV; de ahí sigue el pipeline normal.
2. **Verificación (OPCIONAL, recomendada para manuscritos)** - antes de ingerir,
   comprobar que la transcripción es fiel:
   - **Cédulas = el check más fuerte:** una cédula de 7-8 dígitos que aparece
     exacta en la imagen indica transcripción fiel (no alucinada). Cruza una muestra.
   - **Muestra ciega:** re-lee 5-10 filas contra la imagen y compara nombre/edad/hospital.
   - **Confianza:** las filas con `confianza` baja → a la cola de moderación, no directo a la BD.
   - **Señales de error a vigilar:** letra ambigua, columnas pegadas/desalineadas,
     totales que no cuadran, caracteres `�`.
3. **No inventar:** si una imagen está dañada/ilegible, marca esas filas como
   "ilegible" y déjalas fuera; nunca rellenes datos.

(Para listas grandes y recurrentes, esta verificación manual será reemplazada por
el flujo semi-automatizado - ver "Manual vs automatizado".)

## ⛔ Reglas de oro (no negociables)
1. **Dry-run SIEMPRE** antes de escribir. Mostrar conteos y muestra; pedir
   **OK explícito del maintainer** antes de cualquier escritura a producción.
2. **Respaldo a CSV** completo de TODA la BD **antes y después** de cada escritura
   real (`backup_pacientes_antes_<ts>.csv` / `..._despues_<ts>.csv`; columnas:
   `nombre, edad, lugar, tipo_lugar, estado, municipio, cedula, notas`). Permite
   restaurar/auditar el lote. Se guardan en `~/ingesta-backups/` (o
   `$INGESTA_BACKUP_DIR`), **fuera del repo**. Es PII: local/restringido, nunca a repos.
3. **Privacidad:** nombres + cédulas + diagnósticos son **PII**. NUNCA subir la
   data a repos públicos, issues, PRs ni gists; viaja por canal con control de
   acceso. En el chat/stdout: solo **conteos, rutas y muestra REDACTADA** - nunca
   pegues filas crudas, cédulas ni teléfonos (los CSV de respaldo/revisión sí los
   llevan, pero quedan locales/restringidos). (Ver `AGENTS.md` y `SECURITY.md`.)
4. **No crear hospitales/refugios/tablas ni auto-fusionar conflictos** sin OK. Idempotente.
5. **No inventar ubicaciones.** Un lugar nuevo (hospital o refugio) solo se crea con
   datos reales **investigados en la web** (estado, municipio, dirección + `source`).
   Sin internet o sin poder verificar: **pídele al usuario que busque/confirme, o
   NO crees el lugar** (sus personas quedan pendientes). Nunca adivines el estado ni
   dejes la dirección vacía.

## Pipeline
```
inspeccionar → detectar lugares nuevos → (investigar+curar+crear) → normalizar
→ mapear → deduplicar → dry-run → (OK) → confirmar
```
1. **Inspeccionar** la entrada: `node scripts/inspect.mjs <archivo>` (columnas, conteos, valores distintos, `tipo`, cobertura de cédula). Nunca asumas el esquema.
2. **Detectar lugares nuevos**: `node scripts/detectar-lugares.mjs` divide los lugares
   en *probables hospitales* y *probables refugios* que NO existen aún, y genera la
   plantilla `lugares_nuevos.TEMPLATE.json`. Ver sección **"Lugares nuevos"** abajo.
3. **Normalizar** con `lib/normalize.mjs` (ver abajo).
4. **Mapear hospital/refugio** con `lib/hospitals.mjs` (alias curado + lugares nuevos creados → `hospital_id`). Lo no mapeado → pendientes, **no** se inventa lugar.
5. **Deduplicar**: cédula (global) + nombre fuzzy **por hospital** + exacto global; guardia de conflicto (no fusiona si edad/cédula chocan).
6. **Dry-run → revisar → `--confirm`** (hospitalizados con `ingest.mjs`, refugiados con `ingest-refugios.mjs`).

## Lugares nuevos (hospitales y refugios): detectar → investigar → confirmar → crear
Cuando una lista trae lugares que **no están en la BD ni en el mapa curado**, el
agente NO los inventa. El flujo es:

1. **Detectar y clasificar** (`detectar-lugares.mjs`): lista los lugares nuevos
   separados en *probable hospital/clínica* vs *probable refugio/centro* (usa
   `isNonHospital` por nombre+`tipo`) y escribe la plantilla
   `lugares_nuevos.TEMPLATE.json` (un objeto por lugar, con campos vacíos).
2. **Preguntar al usuario** si quiere agregar esos hospitales y/o refugios. No
   asumas que sí: confirma alcance (¿todos? ¿solo los grandes? ¿solo La Guaira?).
   **Avísale que crear lugares nuevos toma varios minutos extra** (la fase de
   investigación web es lugar por lugar), y que los pacientes ya mapeados pueden
   ingerirse sin esperar a esto.
3. **Investigar en la web** la ubicación real de cada lugar **que el usuario aprobó**
   (hospitales Y refugios): nombre oficial, `state`, `municipality`, `address` y una
   `source` (URL/cita). Rellena `lugares_nuevos.json` con eso. **Refugios igual que
   hospitales: tienen dirección física real; hay que buscarla, no dejarla vacía.**
   - **Sin internet / no verificable:** pide al usuario que busque y confirme, o
     deja ese lugar fuera (sus personas quedan pendientes). Nunca adivines.
4. **Crear los lugares** (`crear-lugares.mjs`, dry-run → `--confirm`): solo crea las
   entradas con `name+type+state+municipality+address+source` completos; las
   incompletas las **rechaza y lista** (no inventa). Idempotente por `external_id`.
5. **Re-correr** `ingest.mjs` / `ingest-refugios.mjs`: ahora mapean a los lugares
   recién creados e insertan a sus personas (con su `--confirm`).

**Esquema de `lugares_nuevos.json`** (array de objetos):
```json
[{ "match": "Hospital Lídice", "type": "hospital",
   "name": "Hospital Dr. Jesús Yerena (Lídice)", "state": "Distrito Capital",
   "municipality": "Libertador", "address": "Av. Sucre, Catia",
   "source": "https://… (de dónde verificaste la ubicación)" }]
```
- `match`: texto(s) del origen que mapean a este lugar (string o array). `type`:
  `hospital | clinica | refugio | …` (va a `facility_type`). `source` es
  **obligatorio** (de dónde salió la ubicación) - es la guarda anti-invención.
- Opcionales: `level`, `priority_zone` (default `P3`), `is_priority`, `external_id`.

## Normalización (lo que SIEMPRE hay que arreglar)
- **Mojibake** (`â€"`→`—`, `Ã±`→`ñ`): `fixMojibake()`. Pasar todo texto por esto.
- **Nombres**: combinar nombre+apellido (vienen mal etiquetados/invertidos),
  dedupe de tokens repetidos, Title Case. **Descartar** si no hay ≥2 tokens de
  ≥2 letras (filtra basura tipo "Parra R").
- **Cédula**: solo dígitos; validar rango **500.000–40.000.000**; aceptar con/sin
  puntos. Va a `notas` como `CI: <digitos>` (la búsqueda por cédula lee `notas`).
- **Edad**: entero 0–120; descartar fuera de rango (deja `null`).
- **Hospital**: texto libre → canónico vía alias. **No** confíes en `tipo`
  (a veces "hospital" es en realidad un albergue, ej. Campo de Golf) → excluir
  también por nombre.
- **Dedup de nombres**: **orden-insensible** (palabras ordenadas), NUNCA por
  orden exacto. `sortN()` + Levenshtein.

## Vocabularios (mapear, no inventar)
- `status` válidos: `hospitalized | discharged | transferred | deceased`
- `condition` válidos: `stable | serious | critical | recovering | unknown`
- Origen típico → nuestro: `Estable→stable`, `Delicado→serious`, `Crítico→critical`,
  `FALLECIDO→status=deceased`, resto (`Se desconoce`,`En observación`)→`unknown`.

## Pitfalls aprendidos (no repetir)
- **Dedup por orden exacto** crea duplicados ("Apellido Nombre" vs "Nombre Apellido"). Usar `sortN`.
- **OCR desalinea columnas** → fijar el esquema en la transcripción, no después.
- **No fusionar** si hay **edad** (gap ≥2) o **cédula** distintas → van a revisión humana.
- **`tipo=hospital` miente** a veces → excluir albergues/puntos por nombre.
- Listas "Por revisar"/viejas pueden estar **obsoletas y con duplicados** → confirmar versión y volumen.
- Teléfono/columnas extra del OCR pueden traer **fragmentos** ("15") → validar formato.
- **Mojibake recuperable vs `�`**: `â€"`/`Ã±` se arreglan re-decodificando (`fixMojibake`);
  pero `�` (U+FFFD) es **daño irrecuperable** del origen (el byte ya se perdió) →
  filtrar/marcar para revisión, NO se puede reconstruir.
- **PII a repos/issues/gists = NO** (ni gist "secreto": el link en un sitio
  público lo vuelve público). La data viaja por canal con control de acceso o push API.
- **Edad en texto / "7 meses"**: un bebé puede aparecer como edad `7` vs `0` →
  NO tratarlo como conflicto de personas distintas en el dedup.
- **El export puede ser un SUPERSET** que ya incluye tu data → medir el
  solapamiento (cédula/nombre) antes de tratar todo como "nuevo".
- **Cédula con/sin puntos**: normaliza a solo dígitos antes de comparar, o los
  match fallan (`12.660.680` vs `12660680`).
- **Correr desde el directorio equivocado** → `.env.local`/`node_modules` no
  resuelven. Siempre desde la raíz del repo.
- **`tipo` poco fiable**: el "Campo de Golf" venía etiquetado `tipo=hospital`
  siendo un refugio → excluir también por nombre del lugar.

## Scripts
- `scripts/inspect.mjs <archivo>` — perfila la entrada (columnas, mapeo detectado, muestra redactada).
- `scripts/detectar-lugares.mjs [--src <archivo>] [--lugares <json>]` — detecta lugares nuevos (hospitales vs refugios) y genera `lugares_nuevos.TEMPLATE.json` a investigar.
- `scripts/crear-lugares.mjs [--lugares <json>] [--confirm]` — crea hospitales/refugios desde `lugares_nuevos.json` (exige ubicación real + `source`; rechaza incompletos).
- `scripts/ingest.mjs [--src <archivo>] [--lugares <json>] [--confirm]` — hospitalizados: normaliza, mapea, dedup, dry-run/confirm. Auto-detecta columnas.
- `scripts/ingest-refugios.mjs [--src <archivo>] [--lugares <json>] [--confirm]` — personas a salvo en refugios (status `sheltered`); solo a refugios ya creados.
- `scripts/dedupe.mjs [--confirm] [--fuzzy]` — depura duplicados que ya están en la BD (respaldo + guardia de conflicto).

**Ejecutar desde la raíz del repo** con las deps del backend instaladas (`pg` se
resuelve desde `backend/`). Conexión: `lib/db.mjs` lee `DATABASE_URL` de
`.env.local` y usa `pg` (node-postgres). Ver Requisitos.

## Cómo adaptar a una fuente nueva (para el agente)
1. `inspect.mjs` para ver columnas/valores y el **mapeo de columnas detectado**.
2. El `ingest.mjs` **auto-detecta** las columnas (`guessFieldMap`, por sinónimos:
   `CI/cédula`, `Status/estado`, `APELLIDOS Y NOMBRES` combinado, etc.) e imprime
   el mapeo. **Verifícalo.** Si algo quedó mal, fuérzalo poniendo `CONFIG.FIELD`.
3. Correr `detectar-lugares.mjs`: si hay hospitales/refugios nuevos, **pregunta al
   usuario**, investígalos en la web y cúralos en `lugares_nuevos.json`; créalos con
   `crear-lugares.mjs` (ver sección "Lugares nuevos"). Alternativa para hospitales
   recurrentes: añadir una regla fija en `lib/hospitals.mjs`. Nunca inventar.
4. Dry-run, revisar pendientes (sin curar vs falta-crear) y conflictos, pedir OK, `--confirm`.

## Patrones de skills hermanas (referencia / fase automatizada)
> ⚠️ Solo **referencia/ideas**. Esta skill **NO depende de estos repos ni los
> invoca**; corre standalone. No instales ni ejecutes nada de aquí para usar la skill.

Ideas tomadas de **dos repos de TERCEROS** (de otro equipo, `@anon` en
GitHub) - no son parte de este repo ni se instalan:
- `humanitarian-csv-dedupe` → en `github.com/anon/humanitarian-federation-platform`
- `respuesta-ingest` → en `github.com/anon/respuesta-ve`
- **Dedup canónico:** existe `@humanitarian-federation/core dedupe:csv` (soporta
  hojas VE: `--identifier-country-code VE --ignore-status --column admin2=Hospital`,
  con `--rejects` y `--groups-output`). Para dedup cross-fuente, evaluar **delegar
  en ese motor** en vez de mantener uno propio (el hub dice que ese equipo lo dueña).
- **"Solo candidatos, nunca merge":** su dedup entrega candidatos para revisión.
  El nuestro auto-fusiona solo los seguros y manda los dudosos a revisión (con respaldo).
- **Privacidad:** ese skill nunca imprime cédulas/IDs → ya adoptado (regla #3).
- **Para el pipeline automatizado** (de `respuesta-ingest`): orquestador **headless**
  (no metas el firehose crudo en el contexto del agente; Node hace todo y el modelo
  solo anota los ≤N finales), **`seen`** (idempotencia incremental por fuente),
  **`trust`** (score de credibilidad por fuente) y `moderation_status='pending'`.

# Seguridad y privacidad

Gracias por ayudar a proteger este proyecto y a las personas que dependen de él.
Por favor no publiques vulnerabilidades, fugas de datos ni información sensible
en issues, PRs o discusiones públicas.

## Qué reportar por canal privado

Usa el canal privado si encuentras:

- Credenciales, tokens, variables de entorno o URLs internas expuestas.
- Acceso no autorizado a paneles admin, datos de reportes o endpoints de sync.
- Fugas de teléfonos, correos, documentos de identidad, notas privadas,
  coordenadas sensibles, fotos privadas o hashes de fotos.
- Formas de evadir rate limits, modificar reportes ajenos o borrar datos sin
  autorización.
- Logs, analítica o capturas que revelen datos personales.

## Cómo reportarlo

Escribe a `info@terremotovenezuela.app` con el asunto
`[Seguridad] mapa-emergencia-rescate`.

Incluye, si es seguro hacerlo:

- Resumen del problema.
- URL, endpoint o archivo afectado.
- Pasos mínimos para reproducirlo.
- Impacto potencial.
- Capturas redaccionadas, sin datos personales visibles.
- Tu contacto para seguimiento.

## Reglas de investigación responsable

- No descargues ni compartas datos personales.
- No hagas pruebas de carga, scraping agresivo ni intentos de explotación contra
  sistemas de producción.
- No modifiques, borres ni publiques reportes reales.
- Detente si una prueba empieza a exponer información de personas afectadas.

El objetivo es corregir rápido y con cuidado, sin aumentar el riesgo para la
comunidad.

## Dependencias: hallazgos de `npm audit` evaluados (2026-06-28)

`npm audit` reporta 5 vulnerabilidades. Todas se evaluaron y NO aplican a nuestro
uso; los "fix" disponibles son `--force` (breaking) y uno rompería una función en
producción. Por eso NO se aplican y NO se regenera el lockfile (mantener el
formato npm 10 de CI; ver más abajo).

- **turbo-stream <3.0.0 (alta, GHSA-rxv8-25v2-qmq8 — DoS en single-fetch de
  React Router).** NO aplica: no ejecutamos un servidor React Router. Solo usamos
  `decode()` como CLIENTE para parsear el feed de una fuente externa
  (`backend/worker/sync/sources/venezuela-te-busca.ts`). Además **v3 NO es
  compatible** con
  el formato turbo-stream **v2** que emite esa fuente (v3 devuelve un array
  plano), así que actualizar rompería ese sync. Se mantiene en v2 a propósito.
- **esbuild <=0.24.2 (moderada, GHSA-67mh-4wv8-2f99 — el dev-server acepta
  requests de cualquier web).** NO aplica: entra solo como dependencia transitiva
  de `drizzle-kit` (devDependency, se usa en build/migraciones), nunca se expone
  un dev-server de esbuild a internet en producción. Se revisará cuando
  `drizzle-kit` publique una versión con esbuild parcheado sin breaking changes.

### Por qué NO corremos `npm audit fix [--force]`

1. Los dos fixes son breaking (`--force`); turbo-stream@3 rompe el decoder de la
   fuente externa (arriba).
2. El lockfile DEBE generarse con la MISMA major de npm que CI (node:20 → npm 10).
   Local suele tener npm 11; cualquier `npm install`/`audit fix` reescribe el
   lockfile en formato npm 11 y reintroduce el fallo de CI `EBADPLATFORM`
   (@esbuild/*). Si en el futuro hay que tocar dependencias, hacerlo con
   `npx npm@10 install` para preservar el formato.

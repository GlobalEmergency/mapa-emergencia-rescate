# Guía para contribuir

Gracias por ayudar a mejorar Mapa de Emergencia y Rescate. Este proyecto recibe
aportes de código, documentación, pruebas, accesibilidad, rendimiento, datos
públicos verificables y operaciones. Como la app se usa en un contexto
humanitario, la prioridad es proteger a las personas afectadas y mantener la
plataforma confiable.

## Antes de empezar

- Revisa si ya existe una issue o PR relacionado.
- Para bugs, mejoras pequeñas o documentación, abre una issue usando las
  plantillas de GitHub.
- Para cambios grandes de arquitectura, datos, sincronización, admin, despliegue
  o UX crítica, abre primero una issue y, si hace falta, un RFC en `docs/rfcs/`.
- No publiques datos personales, coordenadas privadas, teléfonos, correos,
  documentos de identidad, fotos privadas, secretos ni dumps de base de datos en
  GitHub.
- GitHub no es un canal de emergencia. Los reportes reales deben entrar por la
  app o por los canales de coordinacion del proyecto.

## Formas de contribuir

- **Bugs:** reproduce el problema, describe el impacto y adjunta capturas
  redaccionadas cuando ayuden.
- **Mejoras de producto:** explica a que usuario ayuda, en que flujo ocurre y
  que comportamiento esperas.
- **Datos o fuentes externas:** documenta origen, licencia/permiso, frescura,
  formato, campos sensibles y estrategia de deduplicacion.
- **Documentación:** mantén el español claro, enlaza archivos existentes y
  actualiza `docs/README.md` si agregas un documento nuevo.
- **Seguridad o privacidad:** no abras issue pública; sigue `SECURITY.md`.

## Flujo fork-first

Usa este flujo si no eres maintainer con permiso de escritura en el repo
principal.

1. Haz fork de `terremotovenezuela/mapa-emergencia-rescate` en GitHub.
2. Clona tu fork:

   ```bash
   git clone https://github.com/TU_USUARIO/mapa-emergencia-rescate.git
   cd mapa-emergencia-rescate
   ```

3. Agrega el repo original como `upstream`:

   ```bash
   git remote add upstream https://github.com/terremotovenezuela/mapa-emergencia-rescate.git
   git fetch upstream
   ```

4. Crea una rama desde `upstream/staging` (NO desde `main`):

   ```bash
   git switch -c fix/descripcion-corta upstream/staging
   ```

   > El trabajo se integra primero en `staging` y de ahí se promociona a `main`.
   > A `main` solo se llega por un PR **desde** `staging` (lo verifica un check de
   > CI). Ver [docs/deploy/ramas-y-promocion.md](docs/deploy/ramas-y-promocion.md).

5. Corre la app. Docker Compose es la vía preferida y levanta el stack completo
   (frontend + admin + backend + Postgres + Valkey) sin instalar dependencias a
   mano:

   ```bash
   docker compose up --build
   ```

   Para el detalle del entorno local y la tabla de puertos, mira el
   [`README.md`](README.md).

6. Haz cambios pequeños y enfocados. Si el alcance crece, abre una issue nueva o
   separa otro PR.
7. Valida antes de subir, en cada paquete que tocaste:

   ```bash
   cd frontend && npm run lint && npm run typecheck && npm run build
   cd backend  && npm run lint && npm run typecheck && npm run build
   cd admin    && npm run lint && npm run typecheck && npm run build
   ```

8. Sube tu rama y abre un PR contra la rama **`staging`** del repo principal
   (`terremotovenezuela/mapa-emergencia-rescate:staging`), NO contra `main`.

Si eres maintainer, puedes crear una rama en el repo principal, pero conserva la
misma disciplina: rama desde `staging`, PR pequeño contra `staging`, issue
enlazada y validación clara. La promoción `staging` → `main` (que despliega a
prod) la hace un maintainer con un PR aparte.

## Crear issues útiles

Antes de abrir una issue:

- Busca duplicados en issues abiertas y cerradas.
- Usa la plantilla más cercana: bug, mejora o documentación.
- Incluye pasos para reproducir, resultado actual, resultado esperado y contexto
  técnico cuando aplique.
- Redacta capturas: tapa nombres, teléfonos, direcciones, IDs y ubicaciones
  sensibles.
- Para incidentes de seguridad, privacidad o datos sensibles, escribe por el
  canal privado indicado en `SECURITY.md`.

Una buena issue debe dejar claro:

- **Impacto:** a quién afecta y por qué importa.
- **Alcance:** que parte de la app toca.
- **Evidencia:** enlaces, capturas redaccionadas, logs sin secretos o pasos
  reproducibles.
- **Criterio de cierre:** cómo sabremos que quedó resuelta.

## Expectativas para pull requests

Cada PR debe incluir:

- Issue relacionada (`Closes #123`) o una explicación de por qué no aplica.
- Descripción breve del problema y de la solución.
- Capturas o video si cambia UI.
- Validaciones ejecutadas (`npm run lint`, `npm run build`, pruebas manuales).
- Riesgos conocidos y plan de rollback si toca datos, cache, sync, despliegue o
  endpoints públicos.
- Notas de privacidad/seguridad si se agregan campos, logs, analítica,
  formularios, imágenes, geocodificación o integraciones externas.

Manten el PR revisable:

- Prefiere cambios pequeños a un PR grande con muchas responsabilidades.
- No mezcles refactors estéticos con fixes funcionales.
- No subas credenciales, `.env.local`, dumps o datos reales.
- Rebasea o actualiza tu rama si `staging` cambió mucho antes de mergear.
- Responde comentarios con commits nuevos; evita resolver conversaciones sin
  explicar el cambio.

## Estilo de código

- TypeScript estricto, sin `as any` salvo justificacion clara.
- Validaciones del lado servidor para entradas públicas.
- Mensajes de error visibles cuando una escritura falla.
- Helpers compartidos en `frontend/lib/`, `backend/src/lib/` o
  `backend/src/middleware/` antes de duplicar lógica.
- UI accesible en movil y escritorio.
- Variables de entorno nuevas documentadas en `.env.example`.

## Crear endpoints de API (OBLIGATORIO)

La API vive en el backend Express (`backend/src/routes/` para el sitio público +
admin, `backend/src/public-api/` para la superficie autenticada por capacidades).
Las reglas se **enforcan con ESLint** (`backend/eslint-rules/`, corren en
`npm run lint` + CI); romperlas falla el PR. Reglas duras:

- **`require-rate-limit`**: TODA ruta declara `rateLimit({ scope, limit })`.
- **`user-facing-mutation-needs-guard`**: toda mutación de `src/routes/*` lleva
  `requireHuman` (Turnstile) o un gate (`requireAdmin` / `requireCapability` /
  `requireCron` / `requireSupplyWrite`). La excepción anónima se documenta con
  `// eslint-disable-next-line local/user-facing-mutation-needs-guard -- razón`.
- **`no-turnstile-in-public-api`**: `src/public-api/*` no usa Turnstile.
- **Sin I/O largo de terceros inline**: ese trabajo se ENCOLA en BullMQ y el
  handler responde `202 {jobId}` (status-poll en `/api/sync/status`).
- Bloque **`@swagger`** sobre el primer handler de los routes a mano (los routers
  de la fábrica CRUD auto-documentan desde su esquema zod).

Recomendado: lecturas en paralelo (`Promise.all`), GET público con `cached()` +
`jsonWithEtag()`, IP siempre hasheada (`hashIp`), nunca serializar el objeto
completo a respuestas públicas.

Detalle completo y ejemplos: `AGENTS.md` ("Endpoints del backend") y
`docs/guides/documentar-endpoints-openapi.md`.

## Estilo de documentación

- Escribe en español.
- Usa nombres de archivo en `kebab-case.md`.
- Para propuestas grandes usa `docs/rfcs/`.
- Para decisiones aceptadas usa `docs/adr/`.
- Para instrucciones operativas usa `docs/guides/`.
- Enlaza documentos existentes en lugar de copiar bloques largos.

## Conducta esperada

Este repositorio existe para ayudar en una emergencia. Se espera trato
respetuoso, colaboración de buena fe y cuidado especial al hablar de personas
afectadas. No se aceptan doxxing, acoso, especulación sobre víctimas, uso de
datos sensibles para demostrar un punto, ni presión para publicar información
que no haya sido verificada por los canales del proyecto.

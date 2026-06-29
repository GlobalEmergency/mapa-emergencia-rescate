# AGENTS.md

Guía operativa para agentes de código que trabajen en este repositorio. Esta
guía sigue el patrón de contexto portable descrito en
[Harness Engineering](https://openai.com/index/harness-engineering/): dejar aquí
las reglas que un agente necesita antes de editar.

`CLAUDE.md` es un enlace simbólico a este archivo. No lo reemplaces por una copia
separada salvo que el equipo decida cambiar esa relación; actualizar
`AGENTS.md` actualiza también la guía de Claude.

## Antes de tocar código

- Lee `README.md`, `CONTRIBUTING.md` y el archivo que vas a modificar.
- Si el cambio toca arquitectura, sincronización, datos, endpoints públicos,
  workers o despliegue, revisa también `docs/README.md`,
  `docs/architecture/architecture.md` y los ADR/RFC relacionados.
- Si el cambio toca Kubernetes, OpenTofu, DNS/TLS, GHCR, Cloudflare, R2 o el
  workflow de deploy, revisa `docs/architecture/despliegue-kubernetes.md` y
  `docs/deploy/`.
- Si el cambio toca UI pública, estilos, layout, componentes visuales o copy de
  experiencia, revisa `docs/design/DESIGN.md` antes de editar y conserva sus
  tokens y criterios como fuente de verdad visual.
- Trabaja desde una rama nueva basada en `main`. Si no eres maintainer, usa el
  flujo fork-first descrito en `CONTRIBUTING.md`.
- No reescribas historial, no borres ramas ajenas y no reviertas cambios que no
  hiciste.
- Mantener el proyecto operativo vale más que una refactorización amplia. Haz
  cambios pequeños, revisables y con una razón clara.

## Regla de arquitectura

Si cambias la arquitectura real del sistema, no dejes la documentación atrás:

- Actualiza `docs/architecture/architecture.md` en el mismo cambio.
- Si cambias deploy/infra, actualiza también
  `docs/architecture/despliegue-kubernetes.md` y los runbooks en `docs/deploy/`.
- Si cambia una regla que los agentes deben seguir, actualiza `AGENTS.md`
  (y recuerda que `CLAUDE.md` apunta a este archivo).
- Si agregas, mueves o renombras documentación, actualiza `docs/README.md`.
- Si agregas variables de entorno, actualiza `.env.example` y, cuando aplique,
  `infra/k8s/secret.example.yaml`.

## Seguridad y privacidad

Este proyecto opera en contexto humanitario. GitHub es público y no debe usarse
como canal de emergencia ni como base de datos de personas afectadas.

- Nunca publiques en código, issues, PRs, fixtures o capturas: teléfonos,
  correos personales, documentos de identidad, direcciones privadas completas,
  coordenadas sensibles no publicadas, notas médicas, fotos privadas, hashes de
  fotos reales, secretos, tokens o credenciales.
- No inventes datos reales. Para ejemplos y pruebas usa datos anónimos,
  sintéticos y claramente marcados como demo.
- No confirmes ni elimines reportes reales desde automatizaciones sin
  instrucciones explícitas de un maintainer.
- Si encuentras una vulnerabilidad o fuga de datos, no abras una issue pública.
  Sigue `docs/SECURITY.md`.
- La información de rescate, desaparición, hospitales y acopio debe tratarse
  como sensible aunque ya sea visible en la web.

## Estado actual del stack

El repo ya no es una app Next monolítica en la raíz. Es un monorepo simple con
dos paquetes npm y una carpeta de infraestructura compartida:

- `frontend/`: Next.js 16 + React 19. Es UI/SSR; no debe acceder directo a la
  base de datos ni reintroducir rutas `app/api/**`.
- `backend/`: Express 5 + TypeScript. Sirve toda la superficie `/api`, valida
  entorno al arrancar, usa Drizzle sobre Postgres y reutiliza la misma imagen
  para API, worker y migraciones.
- `backend/worker/`: workers BullMQ para sync, geocode, deduplicación,
  federación hub y migraciones/backfills.
- `infra/db/`: esquema Drizzle y migraciones versionadas.
- `infra/k8s/` + `infra/tofu/`: manifiestos Kubernetes y OpenTofu para Hetzner.
- Despliegue canónico: Hetzner Cloud + k3s + Postgres/Valkey privados,
  Cloudflare delante, R2 para fotos/assets y GHCR para imágenes.

La raíz no tiene `package.json`. Ejecuta comandos dentro de `frontend/` o
`backend/`, o usa `docker compose` para levantar el stack completo.

## Comandos útiles

Frontend:

```bash
cd frontend
npm install
npm run dev
npm run lint
npm run typecheck
npm run build
npm test
```

Backend/API/worker:

```bash
cd backend
npm install
npm run dev
npm run typecheck
npm run build
npx tsc --noEmit -p worker/tsconfig.json
```

Stack local completo:

```bash
docker compose up --build
docker compose down
```

Base de datos:

```bash
cd backend
npm run db:generate
npm run migrate
```

> Importante: Next.js 16 puede tener APIs distintas a versiones anteriores.
> Antes de tocar rutas, metadata, server components, acciones, cache o config,
> consulta la documentación local instalada en
> `frontend/node_modules/next/dist/docs/`.

## Convenciones de implementación

- Mantén las validaciones de entrada en el servidor. No confíes en validaciones
  solo del cliente.
- Usa respuestas de error visibles y accionables. No silencieces fallos ni
  devuelvas éxito cuando la escritura no se guardó.
- Evita `as any`, casts innecesarios y helpers duplicados. Busca primero si ya
  existe una función en `frontend/lib/`, `backend/src/lib/` o
  `backend/src/middleware/`.
- Conserva los límites de rate-limit, cache y tamaño de payload salvo que el PR
  explique el riesgo operativo.
- No serialices objetos completos de entrada hacia respuestas públicas. Expone
  solo campos permitidos.
- Para cambios de contrato público, actualiza el bloque `@swagger` del route y
  el artefacto OpenAPI que corresponda.
- Para trabajo largo o de terceros (sync, geocode, scrapers, backfills, IA/API
  externa), encola en BullMQ y devuelve un estado consultable; no lo bloquees en
  el request path.

### Endpoints del backend (reglas ESLint, gate en CI)

El backend tiene DOS superficies HTTP y cada una sigue su patrón. Las reglas se
**enforcan con ESLint** (`backend/eslint-rules/`, corren en `npm run lint` + CI);
romperlas falla el PR. Hay tests propios de las reglas y una matriz de
autorización (`backend/test/`).

- **`src/public-api/*` — superficie autenticada (integraciones + admin).**
  - NO es navegador: **no** lleva `requireHuman` (Turnstile) — la regla
    `no-turnstile-in-public-api` lo prohíbe.
  - Es **deny-by-default**: todo va gateado por `requireCapability("<rec>:<verbo>")`.
    Para un CRUD de modelo NO escribas el router a mano: añade un
    `resources/<modelo>.resource.ts` (config) y la **fábrica** (`crud-factory.ts`)
    monta router + valida + auditoría + doc OpenAPI desde esa config.
  - Capacidades CRUD = `read | create | edit | delete`. El catálogo fijo vive en
    `src/auth/capabilities.ts` (se siembra en la tabla `capabilities`).

- **`src/routes/*` — sitio público (anónimo) + admin.**
  - Toda **mutación** (POST/PUT/PATCH/DELETE) lleva `requireHuman` (Turnstile) O
    un gate (`requireAdmin` / `requireCapability` / `requireCron` /
    `requireSupplyWrite`). La regla `user-facing-mutation-needs-guard` lo exige.
  - Excepción legítima (mutación pública protegida solo por rate-limit, p.ej.
    analítica/confirm anónimo): documenta con
    `// eslint-disable-next-line local/user-facing-mutation-needs-guard -- razón`.

- **Ambas:** TODA ruta declara `rateLimit({ scope, limit })` (regla
  `require-rate-limit`, sin excepción — el rate-limit no se desactiva por
  comentario). Mantén `@swagger` en los routes escritos a mano; los routers de la
  fábrica auto-documentan vía sus esquemas zod.

### Frontend

- Todo acceso HTTP debe pasar por `frontend/lib/api.ts`,
  `frontend/lib/server-api.ts` o hooks en `frontend/hooks/`.
- El navegador llama al backend por `NEXT_PUBLIC_API_URL`; no asumas same-origin
  para `/api`.
- Las mutaciones públicas que escriben datos sensibles deben obtener un token de
  Cloudflare Turnstile con `useTurnstile()` y enviarlo como `turnstileToken` o
  `cf-turnstile-token`, según el helper existente.
- Mantén TanStack Query como capa de cache/dedup del cliente; no dupliques fetch
  manual cuando ya existe un hook.
- Las URLs de fotos que vengan como rutas relativas deben pasar por
  `mediaUrl()` para anclarlas al backend.

### Backend/API

- Las rutas viven en `backend/src/routes/`; la lógica de negocio vive en
  `backend/src/services/`.
- Monta rutas con `Router`, `asyncHandler`, `validate()` y los middlewares
  existentes (`rateLimit`, `requireHuman`, `requireAdmin`, auth de hospital)
  antes de crear helpers nuevos.
- GETs públicos/polleados deben usar `cached()` y/o `jsonWithEtag()` cuando el
  contrato lo permita.
- Mutaciones públicas deben validar con Zod, rate-limitear por IP y usar
  `requireHuman` salvo que exista una razón documentada.
- No uses `*` en CORS. Ajusta `CORS_ORIGINS` para orígenes frontend permitidos.
- Si persistes o comparas IPs, usa `clientIp()` y `hashIp()`; nunca guardes IPs
  crudas.
- `TURNSTILE_SECRET_KEY` ausente desactiva `requireHuman` para desarrollo local;
  en producción debe estar configurada.

### Acceso a datos (Drizzle ORM)

- Todo acceso ordinario a la base va por Drizzle. Importa desde
  `backend/src/db` (`getDb`, `hasDbEnv`, `schema`).
- El esquema es la fuente de verdad en `infra/db/schema.ts`. NO crees tablas en
  runtime dentro de la API.
- Si cambias el esquema:
  1. edita `infra/db/schema.ts`,
  2. corre `cd backend && npm run db:generate`,
  3. commitea el `.sql` + el journal en `infra/db/migrations/`.
- El Job `migrate` aplica las migraciones antes del roll. Las migraciones deben
  ser expand-contract porque pods viejos siguen sirviendo durante el deploy.
- La excepción a "no crear tablas en runtime" es el backfill/migración one-time
  de Neon en `backend/worker/jobs/`, que espeja tablas históricas para importar
  datos; no copies ese patrón a endpoints públicos.

## Documentación

- Escribe documentación en español.
- Usa Markdown con líneas razonablemente cortas para diffs legibles.
- Cambios grandes propuestos antes de construir van en `docs/rfcs/`.
- Decisiones ya tomadas van en `docs/adr/`.
- Guías de operación van en `docs/guides/`.
- Estado actual del sistema va en `docs/architecture/`.
- Si agregas docs nuevas, actualiza `docs/README.md`.

## Mapa rápido del repo

```text
frontend/               Next.js UI/SSR, hooks, componentes, assets publicos
backend/src/            Express API, servicios, middleware, acceso Drizzle
backend/worker/         BullMQ workers, sync, migraciones y backfills
infra/db/               Esquema Drizzle + migraciones
infra/k8s/              Deployments, Services, HPA, Jobs y Secrets ejemplo
infra/tofu/             OpenTofu para Hetzner (red, k3s, Postgres, Valkey)
docs/                   RFCs, ADRs, arquitectura, despliegue, guias y seguridad
scripts/                Importaciones y tareas manuales; revisa antes de usar
.github/                Workflows, templates, CODEOWNERS y automatizacion
```

## Pull requests

Antes de abrir o actualizar un PR:

- Enlaza la issue que rastrea el trabajo, o explica por qué el cambio es
  pequeño y no la necesita.
- Incluye capturas o video si cambia UI pública.
- Marca los comandos ejecutados (`frontend`/`backend` lint, typecheck, build,
  pruebas manuales) o explica por qué no aplican.
- Describe cualquier impacto en privacidad, datos de crisis, performance,
  cache, variables de entorno, despliegue o migraciones.
- Mantén el PR enfocado. Si aparecen cambios vecinos, abre issues separadas.

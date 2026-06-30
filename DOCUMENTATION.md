# Documentation Index

This file lists all documentation-related documents in the repository.

## Root-level
- [README.md](README.md) — project overview
- [AGENTS.md](AGENTS.md) — agent/project instructions
- [CLAUDE.md](CLAUDE.md) — agent/project instructions
- [CONTRIBUTING.md](CONTRIBUTING.md) — contribution guide
- [TODO.md](TODO.md) — pending work
- [.github/pull_request_template.md](.github/pull_request_template.md) — PR template

## `docs/` — main documentation hub

### Top-level
- [docs/README.md](docs/README.md) — docs index
- [docs/FRONTEND_STANDARD.md](docs/FRONTEND_STANDARD.md) — frontend standards
- [docs/SECURITY.md](docs/SECURITY.md) — security policy
- [docs/analytics-tracking-plan.md](docs/analytics-tracking-plan.md) — analytics tracking plan

### ADRs (Architecture Decision Records) — `docs/adr/`
- [0001-identidad-source-external-id.md](docs/adr/0001-identidad-source-external-id.md)
- [0002-upsert-por-lotes.md](docs/adr/0002-upsert-por-lotes.md)
- [0003-cache-en-proceso.md](docs/adr/0003-cache-en-proceso.md)
- [0004-escrituras-atomicas-cte.md](docs/adr/0004-escrituras-atomicas-cte.md)
- [0005-endurecimiento-superficie-http.md](docs/adr/0005-endurecimiento-superficie-http.md)
- [0006-estrategia-de-busqueda.md](docs/adr/0006-estrategia-de-busqueda.md)

### RFCs — `docs/rfcs/`
- [0001-sincronizacion-fuentes.md](docs/rfcs/0001-sincronizacion-fuentes.md)
- [0002-federacion-hub-venezuela-ayuda.md](docs/rfcs/0002-federacion-hub-venezuela-ayuda.md)
- [0003-refactor-async-http-y-colas.md](docs/rfcs/0003-refactor-async-http-y-colas.md)
- [0004-autoscaling-y-split-web-api.md](docs/rfcs/0004-autoscaling-y-split-web-api.md)
- [0005-panel-admin-standalone.md](docs/rfcs/0005-panel-admin-standalone.md)
- [0006-hub-replica-sql-publico.md](docs/rfcs/0006-hub-replica-sql-publico.md)

### Architecture — `docs/architecture/`
- [architecture.md](docs/architecture/architecture.md)
- [despliegue-kubernetes.md](docs/architecture/despliegue-kubernetes.md)

### Deploy — `docs/deploy/`
- [README.md](docs/deploy/README.md)
- [dominio-y-dns.md](docs/deploy/dominio-y-dns.md)
- [estructura-infra.md](docs/deploy/estructura-infra.md)
- [migraciones-de-base-de-datos.md](docs/deploy/migraciones-de-base-de-datos.md)
- [proceso-de-deploy.md](docs/deploy/proceso-de-deploy.md)
- [ramas-y-promocion.md](docs/deploy/ramas-y-promocion.md)
- [replica-publica-hub.md](docs/deploy/replica-publica-hub.md)

### Guides — `docs/guides/`
- [documentar-endpoints-openapi.md](docs/guides/documentar-endpoints-openapi.md)
- [rendimiento-y-pruebas-de-carga.md](docs/guides/rendimiento-y-pruebas-de-carga.md)
- [sincronizacion-cron-vercel.md](docs/guides/sincronizacion-cron-vercel.md)

### Other `docs/` subfolders
- [docs/db/modelo-de-datos.md](docs/db/modelo-de-datos.md) — data model
- [docs/design/DESIGN.md](docs/design/DESIGN.md) — design doc
- [docs/audits/2026-06-27-auditoria-pesada.md](docs/audits/2026-06-27-auditoria-pesada.md) — audit
- [docs/audits/2026-06-28-cambios-refactor-async.md](docs/audits/2026-06-28-cambios-refactor-async.md) — audit
- [docs/security/TODO-pii-patient-notes.md](docs/security/TODO-pii-patient-notes.md) — security TODO
- [docs/infra/INFORMATION_SEND.MD](docs/infra/INFORMATION_SEND.MD) — infra info

## Component-level READMEs
- [backend/worker/README.md](backend/worker/README.md)
- [admin/README.md](admin/README.md)
- [infra/README.md](infra/README.md)
- [infra/db/README.md](infra/db/README.md)
- [infra/tofu/README.md](infra/tofu/README.md)

## Other text/docs-adjacent
- [frontend/public/llms.txt](frontend/public/llms.txt) — LLM guidance file
- [frontend/app/opengraph-image.alt.txt](frontend/app/opengraph-image.alt.txt) — image alt text
- [frontend/app/twitter-image.alt.txt](frontend/app/twitter-image.alt.txt) — image alt text

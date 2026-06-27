# Despliegue y operación

Cómo se construye, despliega y opera **Mapa de Emergencia y Rescate** en
producción. Índice de esta carpeta:

- [proceso-de-deploy.md](proceso-de-deploy.md) — el workflow de deploy (qué hace,
  cómo correrlo, restricciones).
- [dominio-y-dns.md](dominio-y-dns.md) — dónde vive el dominio, DNS, Cloudflare,
  TLS.
- [migraciones-de-base-de-datos.md](migraciones-de-base-de-datos.md) — esquema
  con Drizzle + el Job de migración gateado.
- [estructura-infra.md](estructura-infra.md) — mapa de la infraestructura
  (OpenTofu + k3s + servicios).

> Relacionado: [docs/architecture/despliegue-kubernetes.md](../architecture/despliegue-kubernetes.md)
> (arquitectura del clúster) y [docs/db/modelo-de-datos.md](../db/modelo-de-datos.md)
> (esquema de la BD).

## TL;DR operativo

| Quiero… | Cómo |
| --- | --- |
| Desplegar a prod/staging | Workflow **Deploy to Hetzner (k3s)** desde `main` (ver proceso-de-deploy) |
| Cambiar el esquema de BD | Edita `infra/db/schema.ts` → `npm run db:generate` → commitea el `.sql` → deploy |
| Documentar un endpoint | Bloque `@swagger` en el route (ver [guía](../guides/documentar-endpoints-openapi.md)); doc en `/api/docs` |
| Provisionar/recrear infra | **Manual** (tofu/kubectl) — ya NO está en el workflow de deploy |
| Migrar datos Neon→Hetzner / fotos→R2 | Job `migrate-enqueue` manual (ver [worker/README.md](../../worker/README.md)) |

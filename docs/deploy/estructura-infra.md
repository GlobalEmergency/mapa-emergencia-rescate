# Estructura de la infraestructura

Mapa rápido de qué hay dónde. Detalle arquitectónico en
[docs/architecture/despliegue-kubernetes.md](../architecture/despliegue-kubernetes.md).

## Carpetas

```
infra/
├── tofu/                 OpenTofu (provider hcloud) — provisiona la infra
│   ├── network.tf        Red privada 10.0.0.0/16 + subnet 10.0.1.0/24
│   ├── k3s-master.tf     mapa-master (control plane, 10.0.1.5)
│   ├── k3s-workers.tf    mapa-worker-1/2 (10.0.1.20/.21)
│   ├── postgres.tf       mapa-postgres (10.0.1.10) + volumen pgdata
│   ├── valkey.tf         mapa-valkey (10.0.1.11)
│   ├── firewall.tf       Solo 22 (SSH) y 6443 (API k3s para CI)
│   ├── backend.tf        Estado remoto S3 en Hetzner Object Storage
│   ├── variables.tf / outputs.tf
│   └── cloud-init/*.tftpl  Bootstrap de cada servidor (k3s/CCM, PG, Valkey)
├── k8s/                  Manifiestos del clúster
│   ├── service.yaml      Namespace + Service LoadBalancer (TEMPLATE, TLS por target)
│   ├── deployment.yaml   App Next.js (2 réplicas, rolling maxUnavailable:0)
│   ├── worker-deployment.yaml   Workers BullMQ de migración
│   ├── migrate-job.yaml         Job gateado de migración de ESQUEMA (Drizzle)
│   └── migrate-enqueue-job.yaml Job productor de migración de DATOS (manual)
└── db/                   Esquema + migraciones (van en la imagen)
    ├── schema.ts         Fuente de verdad (Drizzle)
    ├── drizzle.config.ts
    └── migrations/*.sql  Migraciones versionadas + meta/_journal.json
```

## Componentes en runtime

| Componente | Dónde | Rol |
| --- | --- | --- |
| App Next.js | Deployment `app` en k3s (2 pods) | UI + API |
| Workers | Deployment `migrate-worker` | migración datos/fotos (BullMQ) |
| Postgres | VPS `mapa-postgres` 10.0.1.10 | BD `app` (prod) + `imported` |
| Valkey | VPS `mapa-valkey` 10.0.1.11 | colas BullMQ |
| Load Balancer | `mapa-lb` 65.109.41.170 | ingreso (creado por el CCM) |
| R2 (Cloudflare) | `bucket-vzla-terremoto.dreamit.software` | imágenes + assets estáticos Next |
| Cloudflare | borde | TLS, caché, bot-fight, WAF, DNS |
| Estado OpenTofu | Hetzner Object Storage `terremoto-vzla-bucket` | tfstate (NO en R2) |

## Datos: dos bases en el mismo Postgres

- `app` — BD interna de la app (lo que la app lee/escribe; aquí viven los datos
  migrados de Neon). **Es el prod actual.**
- `imported` — reservada para sync/export.

Neon (`NEON_DATABASE_URL`) es la **fuente legada** de la migración; ya no recibe
el tráfico de la app.

## Cómo se relaciona con el deploy

- `infra/tofu/` se aplica **manualmente** (provision/recreate) — fuera del
  workflow de deploy.
- `infra/k8s/` + `infra/db/` los aplica el **workflow de deploy** (deploy-only,
  desde main). Ver [proceso-de-deploy.md](proceso-de-deploy.md).

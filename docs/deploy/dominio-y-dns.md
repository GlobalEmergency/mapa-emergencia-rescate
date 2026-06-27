# Dominio, DNS y TLS

## Dónde vive el dominio

- **Dominio prod:** `terremotovenezuela.app`
- **Registrar:** **Vercel** (el dominio se compró ahí).
- **DNS autoritativo:** **Cloudflare** (los nameservers de Vercel apuntan a los
  de Cloudflare — `*.ns.cloudflare.com`).
- **Hosting / cómputo:** **Hetzner k3s** (NO Vercel). Vercel solo es el
  registrador; el sitio lo sirve el clúster.

> Dominio de **staging:** `vzla-terremoto.dreamit.software` (también detrás de
> Cloudflare, perfil TLS con cert Origin `cf-origin-dreamit`).

## El camino de una petición (prod)

```
usuario → Cloudflare (proxy: TLS edge, caché, bot-fight, WAF)
        → Hetzner LB (65.109.41.170, "mapa-lb")
        → pods de la app (k3s) → Next.js
```

## Registros DNS (en Cloudflare)

| Tipo | Nombre | Valor | Proxy |
| --- | --- | --- | --- |
| A | `@` | `65.109.41.170` (LB) | 🟠 Proxied |
| A | `www` | `65.109.41.170` (LB) | 🟠 Proxied |

`65.109.41.170` es el IP público del Hetzner Load Balancer (`mapa-lb`), creado y
gestionado por el Hetzner CCM a partir del `Service` tipo LoadBalancer.

## TLS

- **Borde (usuario ↔ Cloudflare):** cert de Cloudflare (automático).
- **Origin (Cloudflare ↔ LB):** SSL mode **Full**. El LB sirve su cert; en
  staging es el **Origin cert** de Cloudflare (`cf-origin-dreamit`). En prod, el
  workflow con `target=prod` pide un **cert gestionado Let's Encrypt** para
  `PROD_HOST`.
- Endurecer a **Full (strict)** requiere un Cloudflare **Origin cert** para
  `terremotovenezuela.app` subido a Hetzner + cambiar el perfil prod del workflow
  a ese cert. Pendiente/opcional.

## Cómo se migró el DNS (historial, por si hay que rehacerlo)

1. Dominio en Vercel (NS de Vercel).
2. Se movieron NS a **Hetzner DNS** para probar el cert gestionado (DNS-01).
3. Se decidió usar **Cloudflare** (bot-fight/caché/WAF). En Free/Pro la única
   opción es **Full setup**: mover NS al de Cloudflare (el CNAME/partial es solo
   Business+).
4. En Vercel se cambiaron los NS a los de Cloudflare; se agregaron los A `@`/`www`
   proxied en Cloudflare; SSL = Full.
5. La zona en Hetzner DNS quedó sin uso (se puede borrar).

## Verificar

```bash
# debe resolver a IPs de Cloudflare (104.x / 172.x) si está proxied
dig +short A terremotovenezuela.app @1.1.1.1
# la cadena autoritativa debe mostrar *.ns.cloudflare.com
dig +trace NS terremotovenezuela.app
# health a través de todo el stack
curl -s https://terremotovenezuela.app/api/readyz   # {"ok":true,"db":"up"}
```

## Features de Cloudflare (todo en el panel, sin código)

- **Bot Fight Mode:** Security → Bots.
- **Caché:** Caching → Cache Rules. Nota: las fotos se sirven desde R2
  (`bucket-vzla-terremoto.dreamit.software`, su propio CDN/caché), así que las
  reglas en este dominio aplican sobre todo a respuestas de API.
- **WAF:** Security → WAF.
- **Redirect www↔apex:** Rules → Redirect Rules.

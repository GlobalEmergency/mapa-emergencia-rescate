# ADR 0005 — Endurecimiento de la superficie HTTP ante el pico mediático

> Estado: aceptada · Relacionado: [guía de rendimiento](../guides/rendimiento-y-pruebas-de-carga.md)

## Contexto

Una exposición mediática masiva también atrae abuso. Una auditoría de la
superficie HTTP (verificada línea por línea) encontró:

- **DoS por body:** ningún endpoint validaba `Content-Length`. `request.json()`
  bufferiza el body **completo** antes de poder validar su tamaño, así que un
  POST de cientos de MB agotaba memoria del proceso. El límite de foto se
  validaba *después* de parsear.
- **Brute-force de admin:** `POST /api/admin/login` no tenía rate-limit ni
  lockout (la comparación sí era de tiempo constante).
- **Rate-limit evadible:** `clientIp` tomaba el primer valor de
  `x-forwarded-for`, que el cliente controla (un proxy lo antepone), dejando el
  límite por IP **falsificable**.

Nota: **no** se encontró SQL injection (toda la SQL dinámica usa placeholders
`$n`; lo interpolado son constantes del código) ni SSRF explotable en `/geocode`
(host hardcodeado). El `DELETE` de reportes y pacientes ya exigía admin.

## Decisión

- **`lib/body.ts` `readJson(request, maxBytes)`**: rechaza por `Content-Length`
  declarado y, además, **corta el stream** apenas se supera el límite — cubre el
  caso sin `Content-Length` (transfer-encoding chunked). Reemplaza a
  `request.json()` en los 9 endpoints POST. Topes por tipo: foto ~2 MB, texto
  16 KB, login/donaciones 4 KB, proxy 32 KB.
- **Rate-limit en `/api/admin/login`** (5 intentos por IP) + nota en
  `.env.example`: `ADMIN_PASSWORD`/`CRON_SECRET` de 32+ caracteres aleatorios.
- **`clientIp` deja de confiar en `x-forwarded-for`**: usa `TRUSTED_IP_HEADER`
  (configurable, la cabecera no falsificable de tu proxy/CDN) y, si no, `x-real-ip`.
- Endurecidos los rate-limits de mutación pública (`found` 6→2, `patients`
  10→5); `found` ya no devuelve `err.message` crudo; JSON-LD escapa `<`.

## Consecuencias

- ✅ Validado: body de 20 KB / 3 MB / **chunked sin Content-Length** → `413`;
  JSON inválido → `400`; login 6.º intento → `429`; tras agotar el bucket `anon`,
  spoofear solo `x-forwarded-for` sigue dando `429` (no evade el límite).
- ⚠️ El rate-limit es **en memoria, por instancia** → es *best-effort*: frena
  abuso puntual, **no** es protección DDoS. La defensa real ante tráfico
  distribuido es un CDN/WAF (infra; ver guía).
- ⚠️ Decisión de producto: el teléfono de `contact` de personas desaparecidas
  **sigue público** en `/api/missing` (scrapeable). Si aparece abuso, el "botón
  de pánico" es de una línea: quitar `contact` de `SELECT_COLS` en
  `lib/missing.ts` y desplegar en caliente.

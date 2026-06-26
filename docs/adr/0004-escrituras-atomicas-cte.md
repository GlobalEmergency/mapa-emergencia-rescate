# ADR 0004 — Escrituras atómicas con CTE (en vez de INSERT + UPDATE en dos queries)

> Estado: aceptada · Relacionado: [ADR 0002](0002-upsert-por-lotes.md)

## Contexto

Tres caminos de escritura hacían un `INSERT` seguido de un `UPDATE` en **dos
queries separadas sin transacción**:

- `confirmReport` (`lib/store.ts`): inserta dedup `(report_id, ip_hash)` y luego
  incrementa el contador del reporte.
- `addMessage` (`lib/chat.ts`): inserta el mensaje y luego "bumpea"
  (`thread_bumped_at`) todos los mensajes del hilo.
- `incrementPsychologyHelpClick` (`lib/click-counters.ts`): inserta dedup por IP
  y luego incrementa el contador.

El driver HTTP de Neon no facilita transacciones interactivas, así que estos
pares quedaban sin atomicidad. Problemas:

- **2-3 round-trips por escritura** (latencia y carga innecesarias).
- **Ventana de carrera**: si el proceso cae entre ambas queries, el contador
  queda desincronizado; bajo concurrencia, dos confirmaciones simultáneas de la
  misma IP podían colarse y **contar doble**.
- `confirmReport` además ejecutaba `CREATE TABLE IF NOT EXISTS
  report_confirmations` (DDL) **en cada confirmación**.

## Decisión

Colapsar cada par `INSERT + UPDATE` en **una sola sentencia CTE**, p. ej.:

```sql
WITH ins AS (
  INSERT INTO report_confirmations (report_id, ip_hash, created_at)
  VALUES ($1, $2, $3) ON CONFLICT DO NOTHING RETURNING report_id
)
UPDATE reports r SET confirmations = confirmations + 1
FROM ins WHERE r.id = ins.report_id
RETURNING r.confirmations;
```

0 filas devueltas ⇒ la IP ya había confirmado ⇒ `null`. El mismo patrón se aplica
a `addMessage` y al contador de clicks.

Además: mover el `CREATE TABLE report_confirmations` a `ensureSchema` (fuera del
hot path) y añadir el índice `idx_reports_created_at` (`listReports` ordenaba por
`created_at DESC` sin índice).

## Consecuencias

- ✅ **1 round-trip** en vez de 2-3, y **atómico**: sin desync ni doble conteo.
- ✅ Validado bajo concurrencia real (50 requests simultáneos):
  - 50 confirmaciones con **IPs distintas** → `confirmations = 50` (sin updates
    perdidos).
  - 50 confirmaciones con la **misma IP** → `confirmations = 1` (dedup atómico).
- ✅ El bump de hilo se validó en BD: la respuesta hereda `thread_root_id` y el
  hilo sube correctamente.
- Nota técnica: dentro de un CTE, el `UPDATE` **no ve** el `INSERT` del mismo
  statement (comparten snapshot). En `addMessage` no importa: el mensaje nuevo ya
  entra con `thread_bumped_at = now`, así que basta con bumpear el resto del hilo.

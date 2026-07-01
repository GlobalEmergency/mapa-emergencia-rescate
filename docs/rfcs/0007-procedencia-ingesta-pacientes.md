> Estado: propuesta (pendiente de revisión del equipo) · Autor: equipo ·
> Relacionado: #151 (ingesta de pacientes), #160 (PR de ingesta), convención de
> procedencia ya usada en `missing_persons` y las tablas `hub_*`.

# RFC 0007 — Procedencia en la ingesta de pacientes (sin confundirla con autoría)

## Contexto

La ingesta de pacientes (#151/#160) guarda un campo `source` en `patient_imports`.
Hoy ese campo es **ambiguo**: el comentario lo describe como "etiqueta de la
integración/origen del lote", viene del body del cliente, y se usó como si fuera
una pista de procedencia. Pero no estaba claro si representa **quién subió** el
lote (autoría) o **de dónde salió el dato** (origen).

Esa ambigüedad importa porque las fuentes de datos en este proyecto **no son de
una sola naturaleza**: pueden venir de redes sociales (un tweet), de Telegram o
WhatsApp (un mensaje), de archivos (CSV/XLSX/imagen), o de carga manual de un
admin. En unos casos la fuente aporta **contexto operativo valioso** (la URL de
un tweet permite rastrear más información); en otros (un archivo suelto) la
fuente no rastrea nada más.

## Lo que ya hace el repo (no inventamos convención)

El repositorio **ya resolvió** este problema para otros datos externos, con un
patrón consistente: separar el "feed/sistema de origen" de "el id del registro
dentro de ese feed".

- `missing_persons` (desaparecidos sincronizados): `source` (qué feed) +
  `external_id` (id dentro de ese feed) + `source_url`. Índice único
  `(source, external_id)` para upsert idempotente.
- Tablas de federación `hub_*`: `source` = "sitio socio que lo publicó",
  `external_id` = "id del socio dentro de su sistema", `hub_id` = identidad
  estable. (Ver RFC 0002.)
- `reports`: también `external_id`.

Y las otras fuentes de verdad coinciden:

- **#71 (venezuela-ayuda):** separa `intake_channel` (`manual|file|api`) +
  `sources[]` + procedencia por-fila. Allá `source` es confiable **porque viene
  de la API key del partner** (cada integración tiene su llave).
- **La issue #151:** pide textualmente conservar *"provenance (`source`,
  `sourceRecordId`, integración)"* — el modelo multi-campo ya está sancionado.

## El problema concreto

1. **Autoría vs origen mezclados.** `source` no es autoría. La autoría verificada
   ya existe en `created_by` (sale de `req.user`, no del body → no spoofeable) y
   en el `audit_log` (`actor_user_id`). Convertir `source` en `user:<id>` sería un
   error: duplica `created_by` y borra el contexto de origen.
2. **`source` aplanado.** Un solo campo de texto no captura ni el **tipo de
   canal** (¿tweet? ¿archivo?) ni la **referencia** (¿qué tweet? ¿qué archivo?).

## Propuesta

Modelar la procedencia con **tres conceptos distintos**:

| Concepto | Campo | Confiable | De dónde sale | Ejemplo |
|---|---|---|---|---|
| Autoría | `created_by` | ✅ sí | `req.user` (credencial) | `usr_abc123` |
| Tipo de canal | `source_type` | ❌ declarado | body / config de la integración | `social`, `telegram`, `whatsapp`, `file`, `image`, `manual`, `api`, `unknown` |
| Referencia de origen | `source_ref` (por-fila) | ❌ declarado | body por fila | URL del tweet, id de mensaje, `sha256:` del archivo |

Reglas:

- `created_by` es la única **autoría verificada**. Lo declarado nunca la
  sobrescribe.
- `source_type` y `source_ref` son **declarados, no confiables**: se validan
  (longitud, set cerrado para `source_type`), se muestran en revisión/auditoría,
  y **nunca** se usan para autorización ni para dedup automática fuerte.
- `source_ref` es **por-fila** (cada paciente puede venir de un tweet distinto
  dentro del mismo lote) — esto es el ítem C3 del plan de #160.

### Ejemplos de payload

```json
{ "sourceType": "social", "sourceLabel": "twitter",
  "rows": [ { "name": "…", "hospital": "…",
              "sourceRef": "https://x.com/…/status/123" } ] }
```

```json
{ "sourceType": "file", "sourceLabel": "lista_hospital_central_2026-06-29.xlsx",
  "sourceRef": "sha256:…", "rows": [ … ] }
```

## Qué ya se hizo en #160 (no esperar a este RFC)

El PR de endurecimiento ya **separó autoría de origen declarado** (D5), sin tocar
el esquema:

- `created_by` documentado como autoría verificada (no spoofeable).
- `source` documentado en código y Swagger como **etiqueta declarada, no
  confiable, que no es autoría**.
- Test que fija el contrato (`created_by` viene de la credencial; `source`
  declarado se guarda tal cual, no como autoría).

Este RFC propone el **modelo rico** (canal + referencia por-fila) como paso
siguiente, que implica esquema nuevo y por eso requiere acuerdo del equipo.

## Preguntas abiertas (para el equipo)

- ¿`source_type` como set cerrado (enum) o texto libre validado?
- ¿`source_ref` por-fila desde ya, o primero a nivel lote y luego por-fila?
- ¿Hace falta un `integration_id`/`partner_id` confiable (estilo API key de #71)
  si modelamos integraciones con credencial propia, en vez de usuarios genéricos?
- ¿Renombrar el actual `source` a `source_type`/`source_label`, o conservarlo y
  agregar los nuevos campos?

## Alternativas consideradas

- **`source = user:<id>` (descartada):** colapsa autoría y origen, duplica
  `created_by`, borra contexto. Es lo que este RFC evita explícitamente.
- **Dejar `source` como único campo de texto libre (status quo):** insuficiente
  para distinguir canal de referencia; no permite rastrear el origen real.

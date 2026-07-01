# TODO de seguridad — fuga de PII en pacientes (`notes`) sin autenticación

> Hallazgo de la auditoría de seguridad del 2026-06-28, **re-verificado contra el
> backend Express actual**. Severidad **MEDIA-ALTA**. Contexto humanitario: las
> `notes` contienen cédula y datos médicos de personas afectadas por el
> terremoto. Esta es la deuda concreta a cerrar.
>
> **Actualización:** tras el split a Express el GET **ya tiene rate-limit**
> (`rateLimit({ scope: "hospitals:patients:list", limit: 120 })`), así que ese
> punto del hallazgo está cubierto. Lo que **sigue abierto** es la fuga de
> `notes` sin redactar.

## El problema

`GET /api/hospitals/:id/patients`
([backend/src/routes/hospitals.ts](../../backend/src/routes/hospitals.ts) →
`service.listPatients`) es **público y sin auth**, y devuelve los pacientes
mapeados con `rowToPatient`
([backend/src/services/hospitals.ts](../../backend/src/services/hospitals.ts)),
que serializa el registro **incluyendo `notes` y `contact` sin redactar**.

- `notes` es texto libre que **contiene cédula (documento de identidad) y detalle
  médico** — lo confirma el propio código: `searchPatients`
  ([backend/src/services/patients.ts](../../backend/src/services/patients.ts))
  extrae los dígitos de la cédula *de las notas* con
  `REGEXP_REPLACE(p.notes, '[^0-9]', '')`.
- `contact` es el teléfono de la familia.

### Camino de explotación

1. Un anónimo llama al público `GET /api/hospitals` → obtiene todos los `id`.
2. Itera `GET /api/hospitals/<id>/patients` para cada hospital.
3. Cosecha el roster con **notas médicas + cédula + teléfono** en todos los
   hospitales. El rate-limit (120/ventana) frena el ritmo, pero NO impide que un
   anónimo lea `notes`: el control que falta es la **redacción del DTO público**.

### El matiz

El proyecto decidió **a propósito y documentado** que el **contacto** del
paciente es público (decisión C-1: "las familias optan por ser contactables",
ver [backend/src/routes/patients.ts](../../backend/src/routes/patients.ts), que
SIEMPRE usa `publicSafe=true`). Así que `name`/`status`/`contact` públicos son
por diseño. Lo que **no** es defendible es exponer las `notes` crudas (cédula +
médico) sin auth. La ruta hermana de búsqueda pública ya limita a buscar solo por
nombre (no enumerable por cédula) y aplica rate-limit; esta ruta de listado aún
devuelve `notes`.

## Mitigación parcial aplicada (#160, ingesta de pacientes)

El PR de ingesta de pacientes (#160) NO propaga las `notes` crudas del lote al
paciente final: `applyImport` crea el paciente con `notes: ""`. Esto evita que la
importación **agrave** esta fuga (una cédula/nota médica del input no llega al
campo público). El dato crudo sigue confinado en `raw_data` (staging restringido).

Es una **mitigación temporal**, no el fix de raíz: la lectura pública sigue
devolviendo `notes` para pacientes creados por otras vías (formulario admin, etc.).
La corrección de abajo sigue pendiente. Pendiente de decidir con el maintainer: si
los pacientes importados deben conservar notas en un campo restringido (estilo
`public_hospitalized_patients` de #71 en venezuela-ayuda) en vez de vaciarlas.

## La corrección

- [ ] **Proyección pública sin `notes`.** En `listPatients`/`rowToPatient`,
      mapear por un DTO que **omita `notes`** (y revisar si `contact` debe seguir
      o también gatearse). Devolver el registro completo (con `notes`) solo cuando
      el caller sea admin o POC del hospital (vía `requireAdmin` /
      `requireSupplyWrite`, igual que las rutas de escritura de insumos).
      → Espejo de la postura `publicSafe` que ya usa `/api/patients/search`.
- [x] **Rate-limit en el GET.** Hecho en el split a Express:
      `rateLimit({ scope: "hospitals:patients:list", limit: 120 })`.
- [ ] **Swagger.** Actualizar el bloque `@swagger` del `GET` para reflejar el DTO
      público (sin `notes`) y, si aplica, un nuevo modelo `PublicHospitalPatient`
      en `backend/src/lib/swagger.ts`.
- [ ] **Test.** Un test (`backend/test/`) que verifique que el GET anónimo NO
      devuelve `notes` (y que admin/POC sí).

## Contexto (resto de la auditoría: limpio)

El resto de la superficie quedó bien endurecida y **no** requiere acción:
comparación de tokens en tiempo constante (`safeEqual`), SQL parametrizado en
todos lados (los únicos `sql.raw` operan sobre listas de columnas fijas),
allowlist de DTO que excluye `ip_hash`/`user_agent`, `hashIp` en toda IP
persistida, allowlist cerrada de MIME de imagen (rechaza svg/gif/html), auth por
header `x-admin-token` (sin CSRF), sin `dangerouslySetInnerHTML` sobre datos de
usuario, sin SSRF (hosts fijos), sin secretos hardcodeados, sin bypass de TLS.

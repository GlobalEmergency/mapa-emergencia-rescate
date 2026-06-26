# Documentación

Documentación técnica del proyecto **Mapa de Emergencia y Rescate**.

> El `README.md` de la raíz cubre el *qué* y el *cómo correr* el proyecto.
> Esta carpeta cubre el *por qué* de las decisiones y el *cómo funciona* por
> dentro.

## Organización

```
docs/
├── README.md          ← este archivo (índice + convenciones)
├── rfcs/              📝 Propuestas de diseño (antes de construir algo grande)
├── adr/              ✅ Decisiones de arquitectura (el "qué se decidió y por qué")
├── architecture/     🏗️  Cómo funciona el sistema HOY (estado actual)
└── guides/           📘 Guías operativas y how-tos (despliegue, sync, runbooks)
```

### `rfcs/` — Request for Comments

Propuestas de cambios **antes** de implementarlos. Sirven para discutir el
enfoque con los maintainers (y en Discord) antes de escribir código.

- Nombre: `NNNN-titulo-en-kebab.md` (número correlativo de 4 dígitos).
- Empieza siempre con un encabezado de estado:
  `> Estado: propuesta | aceptada | implementada | descartada · Autor: … · Relacionado: #issue`
- Un RFC describe **un cambio futuro**. Cuando se implementa, su estado pasa a
  `implementada` y, si toca, se resume la decisión final en un ADR.

### `adr/` — Architecture Decision Records

Registro corto e inmutable de **una** decisión ya tomada. A diferencia de un
RFC (que propone y discute), un ADR **deja constancia** de lo que se decidió.

- Nombre: `NNNN-titulo-en-kebab.md`.
- Formato sugerido: **Contexto → Decisión → Consecuencias**.
- No se editan una vez aceptados; si la decisión cambia, se escribe un ADR nuevo
  que reemplaza al anterior (y se enlaza).

### `architecture/` — Arquitectura actual

Cómo está construido el sistema **hoy** (no lo que se propone). Diagramas,
modelo de datos, flujo de datos, módulos y sus responsabilidades. Se mantiene
al día con el código.

### `guides/` — Guías y runbooks

Documentos de "cómo hacer X": desplegar, configurar variables de entorno, correr
una sincronización, geocodificar, operar el panel admin, etc. Orientados a la
acción.

## Convenciones

- **Idioma:** español (igual que el resto del proyecto y la comunidad).
- **Formato:** Markdown, líneas envueltas a ~80 columnas para diffs legibles.
- **Nombres:** `kebab-case.md`. Los RFC/ADR llevan prefijo numérico correlativo.
- **Una idea por archivo.** Si un doc crece demasiado, divídelo y enlaza.
- **Enlaza, no copies.** Referencia otros docs/issues en vez de duplicar texto.
- **Mantén este índice al día** al agregar un documento nuevo.

## ¿Dónde pongo mi documento?

| Quiero… | Va en… |
| --- | --- |
| Proponer un cambio grande antes de hacerlo | `rfcs/` |
| Dejar constancia de una decisión ya tomada | `adr/` |
| Explicar cómo funciona algo que ya existe | `architecture/` |
| Escribir un how-to / runbook operativo | `guides/` |

## Índice

### RFCs

- [0001 — Sincronización automática de fuentes de desaparecidos](rfcs/0001-sincronizacion-fuentes.md)
  · _propuesta_ · relacionado con la issue #1 (sync PFIF).

### ADRs

- [0001 — Identidad de registros externos por (source, external_id)](adr/0001-identidad-source-external-id.md) · _aceptada_
- [0002 — Upsert por lotes (batched)](adr/0002-upsert-por-lotes.md) · _aceptada_
- [0003 — Caché en proceso (SWR + single-flight) para el camino de lectura](adr/0003-cache-en-proceso.md) · _aceptada_
- [0004 — Escrituras atómicas con CTE](adr/0004-escrituras-atomicas-cte.md) · _aceptada_
- [0005 — Endurecimiento de la superficie HTTP ante el pico mediático](adr/0005-endurecimiento-superficie-http.md) · _aceptada_
- [0006 — Estrategia de búsqueda (trigram + mínimo, conteo acotado y caché)](adr/0006-estrategia-de-busqueda.md) · _aceptada_

### Arquitectura

_(pendiente)_

### Guías

- [Desplegar la sincronización con Vercel Cron](guides/sincronizacion-cron-vercel.md)
- [Rendimiento, capacidad y pruebas de carga](guides/rendimiento-y-pruebas-de-carga.md)
</content>

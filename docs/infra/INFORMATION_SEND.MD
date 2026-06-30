# Información compartida con APIs externas

Resumen de qué datos cruzan el límite del sistema hacia/desde terceros. El
detalle de diseño vive en los RFC enlazados; esto es solo el índice.

## Lo que CONSUMIMOS (entra)

- **Fuentes de desaparecidos** (scraping/sync): el worker ingesta registros de
  sitios externos y los normaliza a `missing_persons`. Código en
  [`backend/worker/sync/sources/`](../../backend/worker/sync/sources/)
  (`desaparecidos-terremoto`, `venezuela-te-busca`). Ver
  [RFC 0001](../rfcs/0001-sincronizacion-fuentes.md).
- **Hub central "Venezuela Ayuda"** (federación): espejo **read-only** de datos
  de sitios socios en las tablas `hub_*`. Ver
  [RFC 0002](../rfcs/0002-federacion-hub-venezuela-ayuda.md) y el
  [modelo de datos](../db/modelo-de-datos.md).

## Lo que ENVIAMOS (sale)

- **Desaparecidos hacia el hub federado**: la data unificada de personas se
  comparte con el hub central. El alcance exacto (campos, PII redactada) se
  define en [RFC 0002](../rfcs/0002-federacion-hub-venezuela-ayuda.md).

> ⚠️ Contexto humanitario: antes de agregar un campo a lo que se envía, revisa
> que no exponga PII sensible (cédula, teléfono, notas médicas, coordenadas
> precisas). Ver [`docs/SECURITY.md`](../SECURITY.md) y las reglas de privacidad
> en [`AGENTS.md`](../../AGENTS.md).

> 📝 TODO: completar con el contrato concreto (endpoint, auth, campos exactos)
> de cada integración cuando se estabilice.

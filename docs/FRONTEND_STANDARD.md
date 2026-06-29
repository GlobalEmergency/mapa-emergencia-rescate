# Estándar de componentes frontend (v3)

Reglas OBLIGATORIAS para todo componente nuevo o refactorizado. El objetivo:
**velocidad de carga, limpieza, modularización y buenas prácticas** consistentes.

La arquitectura es **feature-based** (no Atomic Design): el eje principal es el
dominio (`features/<dominio>`), con una capa de primitivas reutilizables (`ui/`)
y una capa de chrome de aplicación (`layout/`). Razón: a esta escala y con este
dominio, los límites por feature son objetivos y hacen el código fácil de
encontrar, mover y **borrar** (cada feature es una carpeta autocontenida).

---

## 1. Árbol canónico

```
app/                          # SOLO rutas. page/layout/loading/error/not-found finos.
  (content)/                  # route group — páginas de contenido (guía, legales, contacto…). NO cambia URLs.
  (app)/                      # route group — superficie principal (home, hospitales…).
  (admin)/                    # route group — panel admin.
  layout.tsx · sitemap.ts · robots.ts · opengraph-image…

components/
  ui/                         # primitivas SIN dominio (solo props): Button, Modal,
                              # SearchInput, Pagination, ChipFilter, TabNav, ErrorBox,
                              # SuccessBox, Spinner, Lightbox, LinkText…
  layout/                     # chrome global de la app: SiteNav, SiteFooter, HeroSection,
                              # AlertTicker, SubPageShell, Providers (theme/analytics/PWA).
  features/<dominio>/         # módulos de feature. Un dominio = una carpeta.
    index.tsx                 # contenedor: compone hooks + subcomponentes.
    <Algo>Card.tsx            # presentacional, React.memo.
    <Algo>List.tsx · <Algo>Modal.tsx · …
    use<Algo>.ts              # hooks SOLO-de-esta-feature (UI/derivación local).
    types.ts                  # tipos locales de la feature.

hooks/<dominio>.ts            # data hooks compartidos (TanStack Query). Ver §3.
lib/                          # framework-agnostic: api, query-keys, get-query-client,
  data/                       # datos estáticos (seeds, catálogos, tablas grandes).
  …                           # metadata (SEO), format, types, severity, site, share, analytics…
```

Reglas del árbol:
- **`app/` no contiene componentes de presentación.** Solo rutas que importan de
  `components/*`. Si un `page.tsx` tiene JSX de negocio, va a una feature.
- **`components/` no contiene lógica de ruta** ni `fetch` directo (eso es `hooks/`).
- **Ningún archivo suelto en la raíz de `components/`**: todo cae en `ui/`,
  `layout/` o `features/<dominio>/`.

## 2. ¿Dónde va cada cosa? (regla de decisión)

1. ¿Es una **ruta** (URL)? → `app/(grupo)/<ruta>/page.tsx` (fino).
2. ¿Es **chrome global** presente en muchas rutas (nav, footer, providers, shell)?
   → `components/layout/`.
3. ¿Es **genérico y sin dominio** (sirve en cualquier feature, solo props)?
   → `components/ui/`.
4. ¿Pertenece a **un dominio** (hospitales, desaparecidos, reportes…)?
   → `components/features/<dominio>/`.
5. ¿Es **datos** (consultas/mutaciones)? → `hooks/<dominio>.ts`.
6. ¿Es **dato estático grande** (catálogo, tabla, seed)? → `lib/data/<algo>.ts`.
7. ¿Es **utilidad pura** (format, geo, severity)? → `lib/<algo>.ts`.

Duda "¿ui o feature?": si el componente nombra o conoce un concepto del dominio
(`Hospital`, `MissingPerson`, `Report`) → es feature. Si no → `ui/`.

## 3. Capas y responsabilidad única

- **Datos** → hooks en `hooks/<dominio>.ts` (TanStack Query). NUNCA `fetch` +
  `setInterval` + `setState` a mano en un componente.
- **UI presentacional** → `components/ui/*` (sin datos, solo props).
- **Componentes de feature** → `components/features/<dominio>/*`: orquestan hooks
  + UI. Un archivo = una responsabilidad. **Meta de tamaño:** presentacionales y
  listas **< 250 líneas (dura)**; forms/modales con estado cohesivo pueden quedar
  ~300-450 cuando partirlos exigiría prop-drilling que empeora la cohesión.
  Extraer SIEMPRE lo que NO es la orquestación del form: data estática
  (`lib/data`), helpers puros, iconos/SVG, tipos, y secciones genuinamente
  independientes.
- **Hooks de UI locales** (derivación/estado de una sola feature, p. ej.
  `useHospitalGridColumns`) → dentro de la carpeta de la feature, no en `hooks/`.

## 4. Datos (TanStack Query)

- `useQuery` con `queryKey` de `lib/query-keys.ts` (NUNCA array inline → dedup).
- `queryFn` usa `apiGet(path, signal)` de `lib/api.ts`. Mutaciones: `apiSend` +
  `useMutation` + `invalidateQueries(qk.<dominio>.all)` en `onSuccess`.
- Polling: `refetchInterval` (el client ya pausa en background). Listas
  paginadas: `placeholderData: (prev) => prev` (sin parpadeo).
- Reusar hooks existentes (`useMissingList`, etc.) antes de crear uno nuevo.

## 5. Velocidad de carga (PRIORIDAD)

- **Code-splitting:** lo pesado (mapas Leaflet, modales grandes, vistas no
  iniciales) va con `next/dynamic` + `ssr:false` cuando aplica. El bundle inicial
  solo carga lo visible above-the-fold.
- **Lazy de imágenes:** `loading="lazy"` + tamaños explícitos (evita layout shift).
- **Memoización donde paga:** `React.memo` en items de lista (tarjetas), `useMemo`
  para derivaciones caras, `useCallback` para handlers pasados a hijos memoizados.
  No memoizar por reflejo — solo donde hay re-render real.
- **Identidad estable:** TanStack `structuralSharing` ya evita re-render si los
  datos no cambian; no romperlo mapeando a objetos nuevos en el render.
- **Debounce** de inputs de búsqueda y de eventos de alta frecuencia (p.ej.
  bounds del mapa) — ~300-400ms — para no disparar requests por cada tecla/pan.

## 6. Limpieza / buenas prácticas

- TypeScript estricto: nada de `any`, sin casts innecesarios. Tipos en el hook.
- Sin estado derivable: si se puede calcular en render, no es `useState`.
- Accesibilidad: `aria-label` en botones-icono, foco manejado en modales, `alt`
  en imágenes. (El proyecto es humanitario — la a11y no es opcional.)
- Nada de lógica de negocio en JSX; extraer a helpers puros.
- Sin dependencias nuevas salvo que se pida.
- **Alcanzabilidad:** todo componente nuevo debe ser alcanzable desde una ruta
  viva. Si no lo enlaza nadie, no se mergea (evita el dead code que estamos
  limpiando).

## 7. Convenciones de nombres

- Carpetas de feature: `kebab-case` (`missing-carousel`, `seismic-risk`).
- Componentes: `PascalCase.tsx`. Hooks: `useCamelCase.ts`. Utils/data: `kebab-case.ts`.
- Contenedor de feature: `index.tsx` (import por carpeta: `@/components/features/x`).
- Imports siempre por alias `@/…`, nunca rutas relativas profundas (`../../../`).

## 8. Preservar (NO romper)

- **El UI debe verse IDÉNTICO.** Copiar el JSX/Tailwind verbatim; solo cambia el
  cableado de datos y la división en módulos.
- **La cola offline (IndexedDB) de Emergency se preserva TAL CUAL.** Es crítica:
  gente reporta sin señal en una emergencia. NO migrar a TanStack, NO "limpiar"
  su lógica de reintento. Aislarla en su módulo y dejarla intacta.
- Mismos endpoints, params y campos de respuesta (contrato idéntico).
- Mover archivos NO cambia URLs: los route groups `(…)` no afectan el path.

---

## Apéndice — Mapa de migración (legacy `app/components/` → destino) ✅ COMPLETADO

Migración terminada: `app/components/` quedó vacío y se eliminó; todo vive ahora en
`components/{ui,layout,features}`, `hooks/` y `lib/`. Se conserva el mapa como
registro de dónde quedó cada archivo:

**→ `components/layout/`** (chrome global)
`SectionNav` · `SiteFooter` · `HeroSection` · `AlertTicker` · `TutorialSteps` ·
`HelpSection` · `SubPageShell` · `ThemeProvider` · `PwaRegister` ·
`MourningRibbon` · `StickyHelpButton` · `OpenPanelProduction`

**→ `components/ui/`** (primitivas genéricas)
`ImageZoomLightbox` (→ `Lightbox`) · `LinkText` · `TranslateWidget` ·
+ extraer de los monolitos: `Card`, `Modal`, `ErrorBox`, `SuccessBox`, `Spinner`

**→ `components/features/<dominio>/`**
- `emergency` → `ReportForm` (split <250) · `AddressSearch` · `AdminLogin`
- `map` → `EdificiosAfectadosLayer`
- `missing` (nueva) → `MissingPersonForm` (split) · `MissingPersonDetail` · `MissingFoundForm`
- `hospitals` → `HospitalDetailView` (split) · `HospitalDirectoryUI`
- `chat` (nueva) → `ChatPanel` (split)
- `donations` (nueva) → `DonateButton` · `PlatformDonatePanel` · `useDonationMonthly`
- `guide` (nueva) → `SurvivalGuide`
- `collection` (nueva) → `CollectionCenters`
- `international` (nueva) → `InternationalHelp` (2340 → componente fino + `lib/data/international-help.ts`)
- `contacts` (nueva) → `EmergencyContacts` · `ContactForm`
- `seismic` (nueva) → `SeismicRiskLeafletMap` · `SeismicRiskMap`
- `psychology` (nueva) → `PsychologyHelpButton`

**→ `hooks/`** (compartidos) / `lib/`
`useMissingStats` · `useLowBandwidthMode` · `useTurnstile` → `hooks/`
`analytics.ts` · `openpanel.ts` → `lib/`

Criterio de cierre: `app/components/` queda vacío (o solo con lo que sea
estrictamente de ruta) y la raíz de `components/` no tiene archivos sueltos.

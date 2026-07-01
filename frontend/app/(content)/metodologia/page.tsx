import Link from "next/link";
import type { Metadata } from "next";
import SubPageShell from "@/components/layout/SubPageShell";

export const metadata: Metadata = {
  title: "Metodología · Mapa de Emergencia Venezuela",
  alternates: { canonical: "/metodologia" },
  description:
    "Reporte técnico del pipeline de resolución de entidades (record linkage) y verificación biométrica facial que consolida reportes de personas desaparecidas del terremoto de Venezuela en identidades canónicas, con arbitraje humano y trazabilidad completa.",
  robots: { index: true, follow: true },
  openGraph: {
    title: "Metodología · Mapa de Emergencia Venezuela",
    description:
      "Resolución de 227.964 reportes en 79.359 identidades únicas (−62,5 %): matching determinístico y probabilístico + reconocimiento facial por embeddings, con garantías de privacidad y reversibilidad.",
    url: "/metodologia",
    type: "article",
    locale: "es_VE",
  },
  twitter: {
    card: "summary_large_image",
    title: "Metodología · Mapa de Emergencia Venezuela",
    description:
      "Reporte técnico: record linkage (matching determinístico/probabilístico) + reconocimiento facial por embeddings para resolver identidades de personas desaparecidas.",
  },
};

const LAST_UPDATED = "29 de junio de 2026";

const TOC = [
  { id: "resumen", label: "Resumen ejecutivo" },
  { id: "datos", label: "Snapshot de los datos" },
  { id: "tecnologia", label: "Snapshot de la tecnología" },
  { id: "deduplicacion", label: "Proceso A — Deduplicación" },
  { id: "facial", label: "Proceso B — Reconocimiento facial" },
  { id: "resultados", label: "Resultados y trabajo en curso" },
  { id: "privacidad", label: "Garantías y privacidad" },
  { id: "glosario", label: "Glosario" },
] as const;

/* ---------- helpers de presentación (server components) ---------- */

function Section({
  id,
  eyebrow,
  title,
  children,
}: {
  id: string;
  eyebrow: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-24 pt-12 first:pt-0">
      <p className="qi-eyebrow">{eyebrow}</p>
      <h2 className="qi-h2 mt-1">{title}</h2>
      <div className="mt-4 space-y-4 text-[15px] leading-relaxed text-[var(--etext2)]">
        {children}
      </div>
    </section>
  );
}

function StatCard({
  value,
  label,
  hint,
}: {
  value: string;
  label: string;
  hint?: string;
}) {
  return (
    <div className="e-card p-4">
      <p className="font-[family-name:var(--qi-font-display)] text-2xl font-extrabold leading-none text-[var(--etext)]">
        {value}
      </p>
      <p className="mt-1.5 text-xs font-semibold uppercase tracking-wide text-[var(--etext3)]">
        {label}
      </p>
      {hint ? (
        <p className="mt-1 text-xs leading-snug text-[var(--etext2)]">{hint}</p>
      ) : null}
    </div>
  );
}

type CalloutVariant = "todos" | "tecnico" | "warn";

const CALLOUT_STYLES: Record<
  CalloutVariant,
  { wrap: string; head: string; icon: string; tag: string }
> = {
  todos: {
    wrap: "border-emerald-200 bg-emerald-50",
    head: "text-emerald-900",
    icon: "🟢",
    tag: "Síntesis",
  },
  tecnico: {
    wrap: "border-sky-300 bg-sky-50",
    head: "text-sky-900",
    icon: "🔵",
    tag: "Detalle técnico",
  },
  warn: {
    wrap: "border-amber-300 bg-amber-50",
    head: "text-amber-900",
    icon: "⚠️",
    tag: "Margen de error",
  },
};

function Callout({
  variant,
  title,
  children,
}: {
  variant: CalloutVariant;
  title?: string;
  children: React.ReactNode;
}) {
  const s = CALLOUT_STYLES[variant];
  return (
    <div className={`e-card p-4 ${s.wrap}`}>
      <p
        className={`flex items-center gap-2 text-xs font-bold uppercase tracking-wide ${s.head}`}
      >
        <span aria-hidden>{s.icon}</span>
        {title ?? s.tag}
      </p>
      <div className={`mt-2 space-y-2 text-sm leading-relaxed ${s.head}`}>
        {children}
      </div>
    </div>
  );
}

const TH =
  "border-b border-[var(--eborder)] px-3 py-2 text-left text-[11px] font-bold uppercase tracking-wide text-[var(--etext3)]";
const TD = "border-b border-[var(--eborder)] px-3 py-2 align-top text-[var(--etext)]";
const TDNUM = `${TD} text-right tabular-nums font-semibold`;

function TableWrap({ children }: { children: React.ReactNode }) {
  return (
    <div className="e-card overflow-x-auto p-0">
      <table className="w-full border-collapse text-sm">{children}</table>
    </div>
  );
}

/* ---------- página ---------- */

export default function MetodologiaPage() {
  return (
    <SubPageShell
      breadcrumb="Metodología"
      path="/metodologia"
      article={{
        headline:
          "Metodología: unificación de reportes de personas desaparecidas",
        description:
          "Reporte técnico del pipeline de resolución de entidades (record linkage) y verificación biométrica facial que consolida reportes de personas desaparecidas del terremoto de Venezuela en identidades canónicas, con arbitraje humano y trazabilidad completa.",
        dateModified: "2026-06-29",
      }}
    >
      {/* Hero */}
      <header className="relative overflow-hidden border-b border-[var(--eborder)]">
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(135deg, #092334 0%, #1e3140 55%, #11304a 100%)",
          }}
          aria-hidden
        />
        <div className="relative mx-auto w-full max-w-[1120px] px-4 py-12 sm:px-6 sm:py-16">
          <span className="e-pill bg-white/10 text-[11px] uppercase tracking-wide text-white ring-1 ring-white/20">
            <span
              className="inline-block h-2 w-2 rounded-full bg-emerald-400"
              aria-hidden
            />
            Datos en vivo · al corte
          </span>
          <h1
            className="qi-display mt-4 max-w-3xl"
            style={{ color: "#ffffff" }}
          >
            Unificación de reportes de personas desaparecidas
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-white/80 sm:text-lg">
            Reporte técnico de metodología, arquitectura y resultados. Documenta
            el pipeline de resolución de entidades (<em>record linkage</em>) y la
            verificación biométrica facial que consolida reportes heterogéneos de
            múltiples fuentes en una identidad canónica por persona, preservando
            el linaje del dato y minimizando los falsos positivos.
          </p>

          {/* Transformación principal */}
          <div className="mt-8 grid max-w-2xl grid-cols-1 items-center gap-3 sm:grid-cols-[1fr_auto_1fr]">
            <div className="rounded-2xl bg-white/10 p-4 ring-1 ring-white/15">
              <p className="font-[family-name:var(--qi-font-display)] text-3xl font-extrabold text-white">
                227.964
              </p>
              <p className="text-xs uppercase tracking-wide text-white/60">
                Reportes crudos
              </p>
            </div>
            <div
              className="text-center text-2xl font-bold text-emerald-400 sm:px-2"
              aria-hidden
            >
              →
            </div>
            <div className="rounded-2xl bg-white/10 p-4 ring-1 ring-white/15">
              <p className="font-[family-name:var(--qi-font-display)] text-3xl font-extrabold text-white">
                79.359
              </p>
              <p className="text-xs uppercase tracking-wide text-white/60">
                Personas únicas · −62,5 %
              </p>
            </div>
          </div>
          <p className="mt-3 text-xs text-white/50">
            Última actualización: {LAST_UPDATED}. Las cifras de reconocimiento
            facial aumentan mientras el proceso continúa.
          </p>
        </div>
      </header>

      {/* Cuerpo: TOC + contenido */}
      <div className="mx-auto w-full max-w-[1120px] px-4 py-10 sm:px-6">
        <div className="grid gap-10 lg:grid-cols-[230px_minmax(0,1fr)]">
          {/* TOC lateral */}
          <aside className="hidden lg:block">
            <nav
              aria-label="Índice del documento"
              className="sticky top-20 space-y-1"
            >
              <p className="qi-eyebrow mb-2 text-[var(--etext3)]">Contenido</p>
              {TOC.map((item, i) => (
                <a
                  key={item.id}
                  href={`#${item.id}`}
                  className="block rounded-lg px-3 py-1.5 text-sm text-[var(--etext2)] transition hover:bg-[var(--einput)] hover:text-[var(--etext)]"
                >
                  <span className="tabular-nums text-[var(--etext3)]">
                    {String(i + 1).padStart(2, "0")}.
                  </span>{" "}
                  {item.label}
                </a>
              ))}
            </nav>
          </aside>

          {/* Contenido */}
          <article className="min-w-0">
            <Callout variant="todos" title="Síntesis">
              <p>
                Las fuentes presentan alta redundancia: una misma entidad aparece
                múltiples veces con variantes ortográficas del nombre, distinto
                orden de tokens y cobertura parcial de fotografía. El sistema
                ejecuta una <strong>resolución de entidades</strong> que consolida
                todos los registros en una{" "}
                <strong>ficha canónica por persona</strong>, con linaje completo y
                sin fusiones espurias entre identidades distintas.
              </p>
            </Callout>

            {/* 1. Resumen ejecutivo */}
            <Section id="resumen" eyebrow="01 · Visión general" title="Resumen ejecutivo">
              <ul className="list-disc space-y-2 pl-5">
                <li>
                  <strong>5 fuentes heterogéneas</strong> aportaron{" "}
                  <strong>227.964 reportes</strong> crudos.
                </li>
                <li>
                  La redundancia inter-fuente es elevada: una misma entidad se
                  repite con variantes de nombre, permutación del orden de tokens
                  y cobertura parcial de foto.
                </li>
                <li>
                  El proceso de <em>record linkage</em> resuelve los registros en{" "}
                  <strong>79.359 identidades únicas</strong> — una reducción del{" "}
                  <strong>−62,5 %</strong>.
                </li>
                <li>
                  Opera en <strong>dos capas de evidencia complementarias</strong>:
                  (1) <strong>matching por atributos</strong> determinístico y
                  probabilístico (cédula, hash de imagen, teléfono+apellido, nombre
                  con corroboración) y (2){" "}
                  <strong>verificación biométrica</strong> por embeddings faciales.
                </li>
                <li>
                  Esquema <strong>no destructivo</strong>: cada registro de origen
                  se conserva inmutable y toda fusión es{" "}
                  <strong>reversible</strong> vía linaje (<em>provenance</em>).
                </li>
                <li>
                  Las coincidencias de baja confianza se derivan a{" "}
                  <strong>arbitraje humano</strong> antes de fusionar.
                </li>
              </ul>
            </Section>

            {/* 2. Datos */}
            <Section id="datos" eyebrow="02 · Datos" title="Snapshot de los datos">
              <p>
                La ingesta está activa sobre <strong>cinco fuentes
                independientes</strong>. Cada reporte se persiste sin
                transformación en una capa cruda inmutable
                (<code>source_record</code>); el pipeline de unificación opera
                sobre proyecciones normalizadas, nunca sobre el dato original.
              </p>

              <h3 className="qi-h4 pt-2 text-[var(--etext)]">
                De dónde vienen (las 5 fuentes)
              </h3>
              <TableWrap>
                <thead>
                  <tr>
                    <th className={TH}>Fuente</th>
                    <th className={TH}>Qué es</th>
                    <th className={`${TH} text-right`}>Reportes</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className={`${TD} font-semibold`}>reconexion</td>
                    <td className={TD}>App/API de Reconexión (producción)</td>
                    <td className={TDNUM}>79.290</td>
                  </tr>
                  <tr>
                    <td className={`${TD} font-semibold`}>mapa-app</td>
                    <td className={TD}>Base del «mapa» de desaparecidos</td>
                    <td className={TDNUM}>78.470</td>
                  </tr>
                  <tr>
                    <td className={`${TD} font-semibold`}>desaparecidos-tv</td>
                    <td className={TD}>Listado de desaparecidos-tv</td>
                    <td className={TDNUM}>41.944</td>
                  </tr>
                  <tr>
                    <td className={`${TD} font-semibold`}>azure</td>
                    <td className={TD}>API «Venezuela Dedupe Review» (Azure)</td>
                    <td className={TDNUM}>28.250</td>
                  </tr>
                  <tr>
                    <td className={`${TD} font-semibold`}>partner-demo</td>
                    <td className={TD}>Prueba de la API de aliados</td>
                    <td className={TDNUM}>10</td>
                  </tr>
                  <tr>
                    <td className={`${TD} font-bold`}>TOTAL</td>
                    <td className={TD} />
                    <td className={`${TDNUM} text-[var(--etext)]`}>227.964</td>
                  </tr>
                </tbody>
              </TableWrap>

              <h3 className="qi-h4 pt-2 text-[var(--etext)]">Estado actual</h3>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                <StatCard value="227.964" label="Reportes crudos" />
                <StatCard value="211.545" label="Normalizados" hint="reportes → personas" />
                <StatCard value="79.359" label="Personas únicas" hint="−62,5 % por dedup" />
                <StatCard value="61.905" label="Buscadas" />
                <StatCard value="17.454" label="Encontradas" />
                <StatCard value="61.104" label="Rostros analizados" hint="creciendo" />
                <StatCard value="46.598" label="Fichas con foto" hint="publicables, creciendo" />
                <StatCard value="32.761" label="Fichas sin foto" hint="solo datos" />
                <StatCard value="33" label="Grupo más grande" hint="reportes de una misma persona" />
              </div>

              <Callout variant="todos">
                <p>
                  Tasa de unicidad ≈ 1/3: por cada ~3 reportes ingresados, ~1
                  corresponde a una entidad nueva y ~2 son co-referencias que se
                  consolidan. Más de la mitad del universo ya tiene embedding
                  facial asociado.
                </p>
              </Callout>
            </Section>

            {/* 3. Tecnología */}
            <Section
              id="tecnologia"
              eyebrow="03 · Tecnología"
              title="Snapshot de la tecnología"
            >
              <p>
                La arquitectura combina componentes estándar de la industria,
                cada uno especializado: almacenamiento relacional para el modelo
                de identidades, un índice vectorial para búsqueda de vecinos más
                cercanos (<em>ANN</em>) sobre embeddings faciales, y los modelos
                de visión por computadora para detección y reconocimiento.
              </p>
              <TableWrap>
                <thead>
                  <tr>
                    <th className={TH}>Pieza</th>
                    <th className={TH}>Para qué sirve</th>
                    <th className={TH}>Tecnología</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className={`${TD} font-semibold`}>Base de datos</td>
                    <td className={TD}>Guarda y ordena reportes y personas únicas</td>
                    <td className={TD}>PostgreSQL 17</td>
                  </tr>
                  <tr>
                    <td className={`${TD} font-semibold`}>Buscador de caras</td>
                    <td className={TD}>Compara una cara contra millones en milisegundos</td>
                    <td className={TD}>Qdrant (vectorial, 512-d, coseno)</td>
                  </tr>
                  <tr>
                    <td className={`${TD} font-semibold`}>IA de rostros</td>
                    <td className={TD}>Detecta y reconoce caras en las fotos</td>
                    <td className={TD}>InsightFace · buffalo_l</td>
                  </tr>
                  <tr>
                    <td className={`${TD} font-semibold`}>API / servicios</td>
                    <td className={TD}>Conecta todo y expone consultas seguras</td>
                    <td className={TD}>FastAPI (Python)</td>
                  </tr>
                  <tr>
                    <td className={`${TD} font-semibold`}>Servidor</td>
                    <td className={TD}>Donde corre todo</td>
                    <td className={TD}>Linux Debian 13, multinúcleo</td>
                  </tr>
                  <tr>
                    <td className={`${TD} font-semibold`}>Tablero en vivo</td>
                    <td className={TD}>Ver avance y verificar a mano</td>
                    <td className={TD}>Dashboard web propio</td>
                  </tr>
                </tbody>
              </TableWrap>

              <Callout variant="tecnico">
                <p>
                  Modelo de 3 capas en PostgreSQL:{" "}
                  <code>source_record</code> (crudo inmutable) →{" "}
                  <code>persona</code> (normalizada con claves fonéticas
                  metaphone/soundex, teléfono E.164 y hash de imagen) →{" "}
                  <code>canonical_identity</code> (golden record con{" "}
                  <code>public_uid</code> estable). Búsqueda facial sobre Qdrant
                  (colección de 512-d, distancia coseno). Indexado facial
                  multiproceso fijando 1 hilo de ONNX por núcleo. Idempotencia por{" "}
                  <code>(fuente, id)</code> y hash de dataset. Nada se borra;
                  uniones reversibles vía procedencia.
                </p>
              </Callout>
            </Section>

            {/* 4. Deduplicación */}
            <Section
              id="deduplicacion"
              eyebrow="04 · Proceso A"
              title="Deduplicación, fase a fase"
            >
              <p>
                <strong>Principio rector:</strong> la fusión exige evidencia
                suficiente y se aplica en orden decreciente de fiabilidad de la
                señal. El criterio es conservador —se prioriza{" "}
                <strong>precisión sobre recall</strong>—: ante ambigüedad{" "}
                <strong>no se fusiona</strong>, porque un falso positivo colapsa
                dos identidades distintas y elimina de facto a una persona del
                registro, el error de mayor costo en este dominio.
              </p>

              <ol className="space-y-4">
                <li>
                  <p className="font-semibold text-[var(--etext)]">
                    Fase 1 — Recepción y resguardo
                  </p>
                  <p>
                    Cada reporte se persiste sin alteración en la capa cruda
                    (<code>source_record</code>). Constituye la base de auditoría
                    y la condición que hace toda fusión reversible.
                  </p>
                </li>
                <li>
                  <p className="font-semibold text-[var(--etext)]">
                    Fase 2 — Normalización
                  </p>
                  <p>
                    Cada registro se proyecta a una forma canónica comparable:{" "}
                    <em>case folding</em> y eliminación de diacríticos,
                    segmentación de nombre/apellido, normalización telefónica a{" "}
                    <strong>E.164</strong> y derivación de{" "}
                    <strong>claves fonéticas</strong> (Double Metaphone/Soundex)
                    que colapsan variantes homófonas. Ej.: «José» y «jose»
                    convergen a la misma clave de bloqueo.
                  </p>
                </li>
                <li>
                  <p className="font-semibold text-[var(--etext)]">
                    Fase 3 — Matching determinístico (automático)
                  </p>
                  <p>
                    Se fusionan registros que coinciden en un identificador
                    específico y de alta fiabilidad:
                  </p>
                  <ol className="mt-1 list-decimal space-y-1 pl-5">
                    <li><strong>Cédula</strong> idéntica.</li>
                    <li>
                      <strong>Hash de imagen</strong> idéntico (mismo archivo,
                      aunque resida en otro host/CDN).
                    </li>
                    <li>
                      <strong>Teléfono + apellido</strong> (el apellido evita
                      colisiones entre familiares que comparten un mismo número de
                      contacto).
                    </li>
                  </ol>
                </li>
                <li>
                  <p className="font-semibold text-[var(--etext)]">
                    Fase 4 — Matching por nombre con corroboración
                  </p>
                  <p>
                    Ante coincidencia de nombre con orden de tokens permutado
                    («Pérez Juan» ≈ «Juan Pérez»), la fusión requiere al menos un
                    atributo corroborante —misma <strong>zona</strong> o{" "}
                    <strong>edad dentro de ±5 años</strong>— y se veta si el{" "}
                    <strong>sexo</strong> difiere. Regla auditada con panel
                    multi-revisor: <strong>precisión ≥ 99 %</strong>.
                  </p>
                </li>
                <li>
                  <p className="font-semibold text-[var(--etext)]">
                    Fase 5 — Arbitraje humano
                  </p>
                  <p>
                    Los casos ambiguos (nombres frecuentes en zonas densas) no se
                    fusionan de forma automática: se aíslan para revisión. La
                    decisión humana es soberana y persiste sobre cualquier
                    reprocesamiento posterior.
                  </p>
                </li>
                <li>
                  <p className="font-semibold text-[var(--etext)]">
                    Fase 6 — Survivorship (golden record)
                  </p>
                  <p>
                    Al consolidar un clúster se construye una única ficha
                    seleccionando, por atributo, el mejor valor disponible
                    (estrategia tipo <em>MDM</em>): nombre más completo, foto de
                    mayor calidad, cédula, ubicación y estado
                    (buscado/encontrado).
                  </p>
                </li>
              </ol>

              <Callout variant="warn" title="Lo que NO hacemos">
                <p>
                  No se fusiona por nombre aislado (homónimos) ni por
                  identificadores de baja entropía (p. ej. teléfonos{" "}
                  <em>placeholder</em> como <code>+0000000</code> compartidos por
                  cientos de registros). Esas señales generan clústeres
                  degenerados («súper-grupos») que mezclan identidades distintas.
                </p>
              </Callout>
            </Section>

            {/* 5. Reconocimiento facial */}
            <Section
              id="facial"
              eyebrow="05 · Proceso B"
              title="Reconocimiento facial, fase a fase"
            >
              <p>
                <strong>Principio:</strong> cuando dos registros disponen de foto,
                la verificación biométrica compara los rostros para confirmar
                co-referencia de identidad, incluso ante divergencia textual o
                datos faltantes. Es la capa de evidencia complementaria al{" "}
                <em>record linkage</em>.
              </p>

              <h3 className="qi-h4 pt-2 text-[var(--etext)]">
                Cadena de 3 modelos (InsightFace buffalo_l)
              </h3>
              <TableWrap>
                <thead>
                  <tr>
                    <th className={`${TH} w-8`}>#</th>
                    <th className={TH}>Modelo</th>
                    <th className={TH}>Qué hace</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className={`${TD} font-bold`}>1</td>
                    <td className={`${TD} font-semibold`}>Detección (SCRFD / det_10g)</td>
                    <td className={TD}>
                      Localiza cada rostro y su <em>bounding box</em>. Soporta
                      múltiples caras por imagen.
                    </td>
                  </tr>
                  <tr>
                    <td className={`${TD} font-bold`}>2</td>
                    <td className={`${TD} font-semibold`}>Alineación (2d106det, 106 landmarks)</td>
                    <td className={TD}>
                      Normaliza la pose mediante 106 puntos faciales, garantizando
                      una representación invariante a la orientación.
                    </td>
                  </tr>
                  <tr>
                    <td className={`${TD} font-bold`}>3</td>
                    <td className={`${TD} font-semibold`}>Reconocimiento (ArcFace / w600k_r50)</td>
                    <td className={TD}>
                      Genera el <strong>embedding facial</strong> (vector de 512
                      dimensiones). La proximidad entre embeddings indica
                      co-referencia.
                    </td>
                  </tr>
                </tbody>
              </TableWrap>

              <h3 className="qi-h4 pt-2 text-[var(--etext)]">Pipeline de inferencia</h3>
              <ol className="list-decimal space-y-1.5 pl-5">
                <li>Adquisición de la imagen desde los servidores/CDN públicos.</li>
                <li>Modelo 1 (detección): localiza cada rostro y su <em>bounding box</em>.</li>
                <li>Modelo 2 (alineación): normaliza la pose mediante 106 landmarks.</li>
                <li>Modelo 3 (reconocimiento): genera el embedding (vector de 512-d).</li>
                <li>El embedding se indexa en el motor vectorial (Qdrant).</li>
                <li>
                  Se consulta por <strong>similitud coseno</strong> contra el
                  corpus (búsqueda <em>ANN</em>), obteniendo un score en [0, 1].
                </li>
              </ol>

              <h3 className="qi-h4 pt-2 text-[var(--etext)]">
                Umbral de decisión
              </h3>
              <TableWrap>
                <thead>
                  <tr>
                    <th className={TH}>Similitud</th>
                    <th className={TH}>Decisión</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className={`${TD} font-semibold`}>
                      <Dot color="#14c578" /> ≥ 65 %
                    </td>
                    <td className={TD}>Misma persona — alta confianza, se fusiona</td>
                  </tr>
                  <tr>
                    <td className={`${TD} font-semibold`}>
                      <Dot color="#14c578" /> 51 – 65 %
                    </td>
                    <td className={TD}>Misma persona — confianza media, se fusiona</td>
                  </tr>
                  <tr>
                    <td className={`${TD} font-semibold`}>
                      <Dot color="#fbb658" /> 45 – 51 %
                    </td>
                    <td className={TD}>Borde — no se fusiona, va a revisión humana</td>
                  </tr>
                  <tr>
                    <td className={`${TD} font-semibold`}>
                      <Dot color="#dc4a58" /> &lt; 45 %
                    </td>
                    <td className={TD}>No es la misma cara — descartada</td>
                  </tr>
                </tbody>
              </TableWrap>
              <p className="text-sm text-[var(--etext3)]">
                El umbral operativo de fusión es <strong>51 %</strong> de
                similitud coseno, alineado con el del bot de verificación. En el
                survivorship, la ficha conserva el rostro de mayor calidad
                (resolución/nitidez) entre las coincidencias.
              </p>

              <Callout variant="warn">
                <p>
                  El reconocimiento facial tiene alta exactitud pero{" "}
                  <strong>no es infalible</strong>. Principales fuentes de error:
                  alta similitud inter-clase entre parientes (fotos
                  grupales/familiares); degradación de la señal (baja resolución,
                  oclusión por lentes/gorra/mascarilla, baja iluminación); deriva
                  morfológica en menores (el rostro cambia rápido entre tomas);
                  gemelos; y <em>singletons</em> (una sola foto, sin par para
                  corroborar).
                </p>
                <p>
                  <strong>Mitigaciones:</strong> (1) umbral conservador (51 %);
                  (2) banda de incertidumbre (45–51 %) excluida de la fusión
                  automática; (3) arbitraje humano en el tablero con overlay de{" "}
                  <em>bounding box</em> (verde = match, amarillo = no-match);
                  (4) reversibilidad total. El facial acelera y corrobora; la
                  decisión final en casos límite es humana.
                </p>
              </Callout>
            </Section>

            {/* 6. Resultados */}
            <Section
              id="resultados"
              eyebrow="06 · Estado"
              title="Resultados y trabajo en curso"
            >
              <h3 className="qi-h4 text-[var(--etext)]">
                Ya consolidado — deduplicación por datos (completo)
              </h3>
              <ul className="list-disc space-y-1.5 pl-5">
                <li>
                  <strong>79.359 identidades únicas</strong> resueltas a partir de
                  227.964 reportes (<strong>−62,5 %</strong>).
                </li>
                <li>
                  <strong>0 duplicados residuales</strong> verificables por las
                  señales deterministas (hash de imagen, cédula,
                  teléfono+apellido).
                </li>
                <li>
                  Sin clústeres degenerados: la cardinalidad máxima de un clúster
                  es <strong>33</strong> registros de una misma persona.
                </li>
                <li>
                  Precisión del matching por nombre, auditada con panel
                  multi-revisor: <strong>≥ 99 %</strong>.
                </li>
              </ul>

              <h3 className="qi-h4 pt-2 text-[var(--etext)]">
                En proceso — reconocimiento facial (en curso)
              </h3>
              <ul className="list-disc space-y-1.5 pl-5">
                <li>
                  <strong>61.104 embeddings</strong> faciales computados ·{" "}
                  <strong>46.598 fichas con foto</strong> publicable y creciendo.
                </li>
                <li>
                  Recuperación de <strong>43.201 imágenes</strong> inicialmente
                  inaccesibles (alojadas en un host privado bloqueado; localizadas
                  en un <em>mirror</em> público) — actualmente en cola de
                  extracción de embeddings.
                </li>
                <li>
                  Etapa final: una pasada de fusión por similitud facial resolverá
                  los casos que la evidencia textual no pudo confirmar (mismo
                  rostro, atributos divergentes).
                </li>
              </ul>

              <Callout variant="tecnico" title="Seguimiento en vivo">
                <p>
                  El progreso es observable en el tablero: <em>throughput</em>,
                  avance por etapa y la verificación facial caso por caso.
                </p>
              </Callout>
            </Section>

            {/* 7. Privacidad */}
            <Section
              id="privacidad"
              eyebrow="07 · Ética"
              title="Garantías y privacidad"
            >
              <ul className="list-disc space-y-2 pl-5">
                <li>
                  <strong>No destructivo.</strong> Cada registro de origen se
                  conserva inmutable; las fusiones son reversibles vía linaje.
                </li>
                <li>
                  <strong>Conservador ante el error.</strong> La fusión exige
                  evidencia; los casos de baja confianza pasan por arbitraje
                  humano.
                </li>
                <li>
                  <strong>Minimización de datos.</strong> No se exponen teléfonos
                  ni datos de contacto; el uso es estrictamente asistivo de
                  reunificación.
                </li>
                <li>
                  <strong>Idempotencia.</strong> El reprocesamiento de una fuente
                  no genera duplicados (clave natural <code>(fuente, id)</code> +
                  hash de dataset).
                </li>
              </ul>
              <p className="text-sm">
                Consulta también la{" "}
                <Link
                  href="/privacidad"
                  className="font-semibold text-sky-700 hover:underline"
                >
                  Política de privacidad
                </Link>{" "}
                y los{" "}
                <Link
                  href="/terminos"
                  className="font-semibold text-sky-700 hover:underline"
                >
                  Términos y condiciones
                </Link>
                .
              </p>
            </Section>

            {/* 8. Glosario */}
            <Section id="glosario" eyebrow="08 · Referencia" title="Glosario">
              <dl className="space-y-3">
                <GlossaryItem term="Record linkage / resolución de entidades">
                  Proceso de identificar y consolidar registros que refieren a la
                  misma persona real.
                </GlossaryItem>
                <GlossaryItem term="Matching determinístico / probabilístico">
                  Determinístico: fusión por igualdad exacta de un identificador
                  fiable. Probabilístico: fusión por similitud con atributos
                  corroborantes.
                </GlossaryItem>
                <GlossaryItem term="Identidad canónica (golden record)">
                  Registro consolidado que agrega todos los reportes de una persona
                  bajo un <code>public_uid</code> estable.
                </GlossaryItem>
                <GlossaryItem term="Embedding facial">
                  Vector de 512 dimensiones que codifica un rostro; la cercanía en
                  distancia coseno indica co-referencia.
                </GlossaryItem>
                <GlossaryItem term="Umbral 51 %">
                  Punto de corte de similitud coseno a partir del cual se acepta la
                  co-referencia facial.
                </GlossaryItem>
                <GlossaryItem term="Survivorship">
                  Reglas de selección del mejor valor por atributo al construir el
                  golden record (estilo MDM).
                </GlossaryItem>
                <GlossaryItem term="Idempotencia">
                  Propiedad por la cual reprocesar una misma fuente no produce
                  registros duplicados.
                </GlossaryItem>
                <GlossaryItem term="Margen de error">
                  Casos límite del reconocimiento facial (alta similitud
                  inter-clase, degradación de señal, menores, gemelos, singletons).
                </GlossaryItem>
              </dl>

              <p className="mt-8 border-t border-[var(--eborder)] pt-6 text-xs text-[var(--etext3)]">
                Documento generado a partir del estado real de la base{" "}
                <code>terremoto</code>. Las cifras de reconocimiento facial
                aumentan mientras el proceso continúa.
              </p>
            </Section>
          </article>
        </div>
      </div>
    </SubPageShell>
  );
}

function Dot({ color }: { color: string }) {
  return (
    <span
      aria-hidden
      className="mr-1.5 inline-block h-2.5 w-2.5 rounded-full align-middle"
      style={{ background: color }}
    />
  );
}

function GlossaryItem({
  term,
  children,
}: {
  term: string;
  children: React.ReactNode;
}) {
  return (
    <div className="e-card p-3">
      <dt className="text-sm font-bold text-[var(--etext)]">{term}</dt>
      <dd className="mt-0.5 text-sm leading-relaxed text-[var(--etext2)]">
        {children}
      </dd>
    </div>
  );
}

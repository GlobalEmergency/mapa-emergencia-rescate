"use client";

import { useMemo, useState } from "react";

interface CollectionCenter {
  id: string;
  organization: string;
  state: string;
  municipality?: string;
  parish?: string;
  address: string;
  items: string[];
  schedule?: string;
  phones?: string[];
  source: string;
}

const CENTERS: CollectionCenter[] = [
  {
    id: "farmapaz",
    organization: "Farmapaz",
    state: "Nacional",
    address: "En todas las sucursales Farmapaz",
    items: ["Ropa", "Alimentos no perecederos", "Insumos para bebés"],
    source: "Farmapaz — Unidos por Venezuela",
  },
  {
    id: "operacion-boqueron",
    organization: "Operación Todos con VZLA",
    state: "Monagas",
    municipality: "Maturín",
    parish: "Boquerón",
    address:
      "Av. principal de Boquerón, frente a la panadería Escorpión Pan",
    items: [
      "Agua potable",
      "Alimentos no perecederos",
      "Insumos médicos",
      "Ropa y abrigos",
    ],
    source: "Operación Todos con VZLA",
  },
  {
    id: "operacion-vente-monagas",
    organization: "Operación Todos con VZLA — Sede Vente Monagas",
    state: "Monagas",
    municipality: "Maturín",
    address:
      "Calle Carvajal, casa N.º 90, sector La Manga. Diagonal a Perozo Motors",
    items: [
      "Agua potable",
      "Alimentos no perecederos",
      "Insumos médicos",
      "Ropa y abrigos",
    ],
    source: "Operación Todos con VZLA",
  },
  {
    id: "operacion-la-pica",
    organization: "Operación Todos con VZLA",
    state: "Monagas",
    municipality: "Maturín",
    parish: "La Pica",
    address:
      "Av. Principal La Pica, casa de la Sra. Irma, frente a la licorería",
    items: [
      "Agua potable",
      "Alimentos no perecederos",
      "Insumos médicos",
      "Ropa y abrigos",
    ],
    source: "Operación Todos con VZLA",
  },
  {
    id: "operacion-san-simon",
    organization: "Operación Todos con VZLA",
    state: "Monagas",
    municipality: "Maturín",
    parish: "San Simón",
    address:
      "Calle Chimborazo Sur, a 100 m de la parada de los 26",
    items: [
      "Agua potable",
      "Alimentos no perecederos",
      "Insumos médicos",
      "Ropa y abrigos",
    ],
    source: "Operación Todos con VZLA",
  },
  {
    id: "udo-los-guaritos",
    organization:
      "Estudiantes de la Universidad de Oriente — Núcleo Monagas",
    state: "Monagas",
    municipality: "Maturín",
    address: "Entrada de la UDO Monagas, Campus Los Guaritos",
    schedule: "Lunes a viernes, 9:00 a.m. a 12:00 p.m.",
    phones: ["0412-0984394", "0424-9068784", "0424-9570080"],
    items: [
      "Agua potable",
      "Alimentos no perecederos y enlatados",
      "Medicamentos básicos y de primeros auxilios",
      "Productos de higiene personal",
      "Ropa y zapatos en buen estado",
    ],
    source: "UDO Monagas / AIPA / Fundación Lirio Mayero",
  },
];

function telHref(display: string): string {
  const cleaned = display.replace(/[^\d+]/g, "");
  const national = cleaned.replace(/^0/, "");
  return `tel:+58${national}`;
}

function normalize(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function locationLabel(center: CollectionCenter): string {
  const parts = [center.state, center.municipality, center.parish].filter(
    Boolean,
  );
  return parts.join(" · ");
}

export default function CollectionCenters() {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = normalize(query);
    if (!q) return CENTERS;
    return CENTERS.filter((center) => {
      const haystack = normalize(
        [
          center.organization,
          center.state,
          center.municipality,
          center.parish,
          center.address,
          center.items.join(" "),
          center.source,
        ]
          .filter(Boolean)
          .join(" "),
      );
      return haystack.includes(q);
    });
  }, [query]);

  return (
    <section
      id="centros-acopio"
      className="border-y border-emerald-200/70 bg-gradient-to-b from-emerald-50/70 via-white to-white"
    >
      <div className="mx-auto w-full max-w-7xl px-4 py-10 sm:py-14">
        <details open className="group rounded-2xl border border-emerald-200 bg-white shadow-sm">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 rounded-2xl p-4 sm:p-6">
            <div>
              <h1 className="flex flex-wrap items-center gap-2 text-lg font-bold text-slate-900 sm:text-xl">
                🟢 Centros de acopio
                <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-800">
                  {CENTERS.length} puntos
                </span>
              </h1>
              <p className="mt-1 max-w-3xl text-sm text-slate-600">
                Lugares verificados donde puedes llevar donaciones físicas para
                quienes fueron afectados por el terremoto. Revisa qué reciben
                antes de ir.
              </p>
            </div>
            <span
              aria-hidden
              className="shrink-0 text-slate-400 transition-transform duration-200 group-open:rotate-180"
            >
              ▼
            </span>
          </summary>

          <div className="border-t border-emerald-100 p-3 sm:p-6">
            <div className="relative mb-4">
              <span
                aria-hidden
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              >
                🔎
              </span>
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Busca por estado, municipio u organización…"
                aria-label="Buscar centro de acopio"
                className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-sm text-slate-800 placeholder:text-slate-400 focus:border-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-100"
              />
            </div>

            {filtered.length === 0 ? (
              <p className="rounded-lg bg-slate-50 px-3 py-6 text-center text-sm text-slate-500">
                No encontramos centros para{" "}
                <span className="font-semibold text-slate-700">“{query}”</span>.
                Prueba con otro estado o municipio.
              </p>
            ) : (
              <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {filtered.map((center) => (
                  <li
                    key={center.id}
                    className="flex flex-col rounded-xl border border-emerald-100 bg-emerald-50/40 p-4"
                  >
                    <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
                      {locationLabel(center)}
                    </p>
                    <h3 className="mt-1 text-sm font-bold text-slate-900">
                      {center.organization}
                    </h3>
                    <p className="mt-2 text-sm leading-relaxed text-slate-700">
                      📍 {center.address}
                    </p>

                    {center.schedule && (
                      <p className="mt-2 text-sm text-slate-600">
                        🕐 {center.schedule}
                      </p>
                    )}

                    <div className="mt-3">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Reciben
                      </p>
                      <ul className="mt-1.5 flex flex-wrap gap-1.5">
                        {center.items.map((item) => (
                          <li
                            key={item}
                            className="rounded-full bg-white px-2.5 py-0.5 text-[11px] font-medium text-emerald-900 ring-1 ring-emerald-200"
                          >
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>

                    {center.phones && center.phones.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {center.phones.map((phone) => (
                          <a
                            key={phone}
                            href={telHref(phone)}
                            className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 bg-white px-3 py-1.5 text-xs font-bold text-emerald-800 transition hover:bg-emerald-50"
                          >
                            📞 {phone}
                          </a>
                        ))}
                      </div>
                    )}

                    <p className="mt-auto pt-3 text-[11px] text-slate-400">
                      Fuente: {center.source}
                    </p>
                  </li>
                ))}
              </ul>
            )}

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <p className="rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-900">
                💚 Si conoces otro punto de acopio activo, repórtalo en el mapa
                con el marcador{" "}
                <strong className="font-semibold">Centro de Acopio</strong> para
                que más personas puedan donar.
              </p>
              <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-900">
                ⚠️ Verifica horarios y disponibilidad antes de desplazarte. La
                información proviene de convocatorias ciudadanas y puede cambiar.
              </p>
            </div>
          </div>
        </details>
      </div>
    </section>
  );
}

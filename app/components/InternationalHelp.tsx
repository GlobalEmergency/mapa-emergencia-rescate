interface ContactLine {
  type: "phone" | "email" | "web" | "hours";
  label: string;
  href?: string;
}

interface CountryOffice {
  country: string;
  organization: string;
  lines: ContactLine[];
}

const OFFICES: CountryOffice[] = [
  {
    country: "Argentina",
    organization: "Cruz Roja Argentina",
    lines: [
      {
        type: "web",
        label: "cruzroja.org.ar/rcf",
        href: "https://www.cruzroja.org.ar/rcf/",
      },
    ],
  },
  {
    country: "Colombia",
    organization: "Cruz Roja Colombiana",
    lines: [
      {
        type: "email",
        label: "rcf@cruzrojacolombiana.org",
        href: "mailto:rcf@cruzrojacolombiana.org",
      },
      {
        type: "phone",
        label: "(+57) 321 213 9525",
        href: "tel:+573212139525",
      },
    ],
  },
  {
    country: "Costa Rica",
    organization: "Cruz Roja Costarricense",
    lines: [
      {
        type: "phone",
        label: "+506 6060-8623",
        href: "tel:+50660608623",
      },
      {
        type: "email",
        label: "rcf@cruzroja.or.cr",
        href: "mailto:rcf@cruzroja.or.cr",
      },
      { type: "hours", label: "7:30 a.m. a 5:00 p.m." },
    ],
  },
  {
    country: "Ecuador",
    organization: "Cruz Roja Ecuatoriana",
    lines: [
      {
        type: "phone",
        label: "+098 595 6683",
        href: "tel:+0985956683",
      },
      {
        type: "email",
        label: "busquedadefamiliares@cruzroja.org.ec",
        href: "mailto:busquedadefamiliares@cruzroja.org.ec",
      },
      { type: "hours", label: "08:30 a.m. a 5:00 p.m." },
    ],
  },
  {
    country: "Honduras",
    organization: "Cruz Roja Hondureña",
    lines: [
      {
        type: "phone",
        label: "+504 9849-5556",
        href: "tel:+50498495556",
      },
      {
        type: "email",
        label: "busquedarcf@cruzroja.org.hn",
        href: "mailto:busquedarcf@cruzroja.org.hn",
      },
      { type: "hours", label: "8:00 a.m. a 4:00 p.m." },
    ],
  },
  {
    country: "México",
    organization: "Cruz Roja Mexicana",
    lines: [
      {
        type: "phone",
        label: "56-45-85-32-74",
        href: "tel:+525645853274",
      },
    ],
  },
];

const LINE_ICON: Record<ContactLine["type"], string> = {
  phone: "📞",
  email: "✉️",
  web: "🌐",
  hours: "🕐",
};

function ContactRow({ line }: { line: ContactLine }) {
  const content = (
    <>
      <span aria-hidden>{LINE_ICON[line.type]}</span> {line.label}
    </>
  );
  if (line.href) {
    return (
      <a
        href={line.href}
        target={line.type === "web" ? "_blank" : undefined}
        rel={line.type === "web" ? "noopener noreferrer" : undefined}
        className="block text-sm text-slate-600 transition hover:text-red-700 hover:underline"
      >
        {content}
      </a>
    );
  }
  return <p className="text-sm text-slate-600">{content}</p>;
}

export default function InternationalHelp() {
  return (
    <section
      id="ayuda-internacional"
      className="border-y border-slate-200 bg-gradient-to-b from-slate-50 to-white"
    >
      <div className="mx-auto w-full max-w-7xl px-4 py-10 sm:py-14">
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="p-6 sm:p-8">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:gap-6">
              <span
                className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-red-50 text-3xl"
                aria-hidden
              >
                🏚️
              </span>
              <div>
                <h2 className="text-xl font-bold leading-snug text-red-700 sm:text-2xl">
                  ¿Estás fuera de Venezuela y perdiste contacto con tus
                  familiares tras el terremoto?
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-slate-700 sm:text-base">
                  Los equipos de la{" "}
                  <strong className="font-semibold text-slate-900">
                    Cruz Roja
                  </strong>{" "}
                  te pueden apoyar a restablecer el contacto con tu familia
                  desde tu país de residencia. Este es un canal oficial de
                  búsqueda y reunificación familiar a largo plazo.
                </p>
              </div>
            </div>

            <p className="mt-6 rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-900">
              <strong className="font-semibold">Esta plataforma es un nexo</strong>{" "}
              entre personas afectadas, familiares en el exterior y organizaciones
              de ayuda. Aquí puedes consultar desaparecidos, compartir
              información y coordinar apoyo sostenido más allá de la emergencia
              inmediata.
            </p>

            <p className="mt-4 text-sm font-medium text-slate-800">
              Contacta a la Cruz Roja de tu país:
            </p>

            <ul className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {OFFICES.map((office) => (
                <li
                  key={office.country}
                  className="rounded-xl border border-slate-200 bg-slate-50/50 p-4"
                >
                  <div className="flex items-start gap-2">
                    <span className="text-red-600" aria-hidden>
                      📍
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-slate-900">
                        {office.country}
                      </p>
                      <p className="text-sm font-semibold text-red-700">
                        {office.organization}
                      </p>
                      <div className="mt-2 space-y-1">
                        {office.lines.map((line) => (
                          <ContactRow key={line.label} line={line} />
                        ))}
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <a
                href="#desaparecidas"
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-red-700"
              >
                🧍 Buscar en la lista de desaparecidos
              </a>
              <a
                href="#mapa"
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
              >
                🗺️ Ver mapa de reportes
              </a>
            </div>
          </div>

          <div className="flex flex-col items-center justify-between gap-3 bg-slate-900 px-6 py-4 sm:flex-row">
            <p className="text-center text-xs text-slate-300 sm:text-left">
              Información de referencia de la{" "}
              <strong className="font-semibold text-white">
                Federación Internacional de Sociedades de la Cruz Roja y de la
                Media Luna Roja (IFRC)
              </strong>
              . Verifica horarios y datos directamente con la sociedad nacional
              de tu país.
            </p>
            <a
              href="https://www.ifrc.org/"
              target="_blank"
              rel="noopener noreferrer"
              className="shrink-0 rounded-md bg-white px-3 py-1.5 text-xs font-bold tracking-wide text-slate-900 transition hover:bg-slate-100"
            >
              IFRC ↗
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

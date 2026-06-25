import { CONTACT_EMAIL, contactMailto } from "@/lib/site";

const TWITTER_TEAM: { name: string; handle: string }[] = [
  { name: "Allan Odreman", handle: "allanodremans" },
  { name: "Cristian Mock", handle: "cristianmock" },
  { name: "Vicky Torres", handle: "vickytorrss" },
  { name: "Andrés G.", handle: "andresg747" },
];

export default function SiteFooter() {
  return (
    <footer className="border-t border-slate-200 bg-white">
      <div className="mx-auto w-full max-w-7xl px-4 py-10">
        <div className="grid gap-8 lg:grid-cols-[1.3fr_1fr_1fr]">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              🤝 ¿Quiénes hacemos esto?
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">
              Somos un equipo de voluntarios construyendo esta plataforma
              abierta para que cualquier persona afectada por el terremoto
              pueda pedir y ofrecer ayuda en tiempo real. El proyecto es
              gratuito, sin fines de lucro y de código abierto.
            </p>
            <a
              href={contactMailto()}
              className="mt-3 inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800 transition hover:border-slate-300 hover:bg-slate-50"
            >
              <span aria-hidden>✉️</span>
              {CONTACT_EMAIL}
            </a>
            <div className="mt-4 flex flex-wrap gap-3">
              {TWITTER_TEAM.map((person) => (
                <a
                  key={person.handle}
                  href={`https://x.com/${person.handle}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                >
                  <span
                    aria-hidden
                    className="grid h-8 w-8 place-items-center rounded-full bg-slate-900 text-white"
                  >
                    𝕏
                  </span>
                  <span className="flex flex-col leading-tight">
                    <span className="font-semibold">{person.name}</span>
                    <span className="text-xs text-slate-500">
                      @{person.handle}
                    </span>
                  </span>
                </a>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-indigo-200 bg-indigo-50 p-5">
            <h3 className="text-base font-bold text-indigo-900">
              💬 Únete como voluntario
            </h3>
            <p className="mt-1 text-sm text-indigo-900">
              Entra al Discord para coordinar rescates, suministros, traducción,
              difusión o soporte técnico.
            </p>
            <a
              href="https://discord.gg/5hhaQxU3PM"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700"
            >
              <span aria-hidden>🎧</span> Entrar al Discord
            </a>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
            <h3 className="text-base font-bold text-slate-900">
              👩‍💻 ¿Sabes programar?
            </h3>
            <p className="mt-1 text-sm text-slate-700">
              El código es abierto. Reporta bugs, sugiere mejoras o abre un
              pull request: cada aporte ayuda a salvar vidas.
            </p>
            <a
              href="https://github.com/ArturoRiosMock/mapa-emergencia-rescate"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 shadow-sm transition hover:bg-slate-100"
            >
              <span aria-hidden>⭐</span> Colabora en GitHub
            </a>
          </div>
        </div>

        <div className="mt-10 border-t border-slate-100 pt-8">
          <h3 className="text-base font-bold text-slate-900">
            🔗 Sitios aliados
          </h3>
          <p className="mt-1 text-sm text-slate-600">
            Otras plataformas ciudadanas que ayudan ante el terremoto.
            Compártelas para llegar a más personas.
          </p>
          <div className="mt-4 grid gap-6 sm:grid-cols-2">
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                🗺️ Mapas y daños
              </h4>
              <ul className="mt-2 space-y-2">
                <li>
                  <a
                    href="https://terremotovenezuela.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm transition hover:border-slate-300 hover:bg-slate-50"
                  >
                    <span className="font-semibold text-slate-900">
                      Terremoto Venezuela
                    </span>
                    <span className="block text-xs text-slate-500">
                      Mapa colaborativo de daños en edificaciones
                    </span>
                  </a>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                🔍 Búsqueda de personas
              </h4>
              <ul className="mt-2 space-y-2">
                <li>
                  <a
                    href="https://venezuelatebusca.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm transition hover:border-slate-300 hover:bg-slate-50"
                  >
                    <span className="font-semibold text-slate-900">
                      Venezuela Te Busca
                    </span>
                    <span className="block text-xs text-slate-500">
                      Registro centralizado de personas desaparecidas
                    </span>
                  </a>
                </li>
                <li>
                  <a
                    href="https://venezuelareporta.org"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm transition hover:border-slate-300 hover:bg-slate-50"
                  >
                    <span className="font-semibold text-slate-900">
                      Venezuela Reporta
                    </span>
                    <span className="block text-xs text-slate-500">
                      Reporta desaparecidos, confirma a salvo o avistamientos
                    </span>
                  </a>
                </li>
              </ul>
            </div>
          </div>
        </div>

        <div className="mt-8 flex flex-col items-center justify-between gap-2 border-t border-slate-100 pt-6 text-center text-xs text-slate-500 sm:flex-row sm:text-left">
          <p>
            Plataforma de reporte ciudadano. Datos de mapas ©{" "}
            <a
              href="https://www.openstreetmap.org/copyright"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:underline"
            >
              OpenStreetMap
            </a>
            . En caso de peligro inmediato, contacta también a los servicios
            de emergencia oficiales.
          </p>
          <a
            href="/admin"
            className="text-slate-400 hover:text-slate-600 hover:underline"
          >
            Panel de administración
          </a>
        </div>
      </div>
    </footer>
  );
}

import Link from "next/link";
import { CONTACT_EMAIL } from "@/lib/site";

const TWITTER_TEAM: { name: string; handle: string }[] = [
  { name: "Allan Odreman", handle: "allanodremans" },
  { name: "Cristian Mock", handle: "cristianmock" },
  { name: "Vicky Torres", handle: "vickytorrss" },
  { name: "Andrés G.", handle: "andresg747" },
];

export default function SiteFooter() {
  return (
    <footer
      id="equipo"
      className="border-t-[1.5px] border-[var(--eborder)] bg-[var(--esurf)]"
    >
      <div className="mx-auto w-full max-w-[1120px] px-4 py-10 sm:px-6">
        <div className="e-footer-grid">
          <div>
            <h2 className="qi-h3">🤝 ¿Quiénes hacemos esto?</h2>
            <p className="mt-2 text-sm leading-relaxed text-[var(--etext2)]">
              Somos un equipo de voluntarios construyendo esta plataforma
              abierta para que cualquier persona afectada por el terremoto
              pueda pedir y ofrecer ayuda en tiempo real. El proyecto es
              gratuito, sin fines de lucro y de código abierto.
            </p>
            <Link
              href="/contacto"
              className="e-btn e-btn-secondary mt-3 px-3 py-2 text-sm"
            >
              <span aria-hidden>✉️</span>
              Escríbenos · {CONTACT_EMAIL}
            </Link>
            <div className="mt-4 flex flex-wrap gap-3">
              {TWITTER_TEAM.map((person) => (
                <a
                  key={person.handle}
                  href={`https://x.com/${person.handle}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="e-btn e-btn-secondary px-3 py-2 text-sm"
                >
                  <span
                    aria-hidden
                    className="grid h-8 w-8 place-items-center rounded-full bg-[var(--etext)] text-white"
                  >
                    𝕏
                  </span>
                  <span className="flex flex-col leading-tight text-left">
                    <span className="font-semibold">{person.name}</span>
                    <span className="text-xs text-[var(--etext2)]">
                      @{person.handle}
                    </span>
                  </span>
                </a>
              ))}
            </div>
          </div>

          <div className="e-card border-indigo-200 bg-indigo-50 p-5">
            <h3 className="qi-h4 text-indigo-900">💬 Únete como voluntario</h3>
            <p className="mt-1 text-sm text-indigo-900">
              Entra al Discord para coordinar rescates, suministros, traducción,
              difusión o soporte técnico.
            </p>
            <a
              href="https://discord.gg/5hhaQxU3PM"
              target="_blank"
              rel="noopener noreferrer"
              className="e-btn mt-3 bg-indigo-600 px-4 py-2 text-sm text-white hover:bg-indigo-700"
              style={{ borderColor: "transparent" }}
            >
              <span aria-hidden>🎧</span> Entrar al Discord
            </a>
          </div>

          <div className="e-card bg-[var(--einput)] p-5">
            <h3 className="qi-h4">👩‍💻 ¿Sabes programar?</h3>
            <p className="mt-1 text-sm text-[var(--etext2)]">
              El código es abierto. Reporta bugs, sugiere mejoras o abre un
              pull request: cada aporte ayuda a salvar vidas.
            </p>
            <a
              href="https://github.com/ArturoRiosMock/mapa-emergencia-rescate"
              target="_blank"
              rel="noopener noreferrer"
              className="e-btn e-btn-secondary mt-3 px-4 py-2 text-sm"
            >
              <span aria-hidden>⭐</span> Colabora en GitHub
            </a>
          </div>
        </div>

        <div className="mt-10 border-t border-[var(--eborder)] pt-8">
          <h3 className="qi-h4">🔗 Sitios aliados</h3>
          <p className="mt-1 text-sm text-[var(--etext2)]">
            Otras plataformas ciudadanas que ayudan ante el terremoto.
            Compártelas para llegar a más personas.
          </p>
          <div className="e-int-2col mt-4 gap-6">
            <div>
              <h4 className="qi-eyebrow text-[var(--etext2)]">
                🗺️ Mapas y daños
              </h4>
              <ul className="mt-2 space-y-2">
                <li>
                  <a
                    href="https://terremotovenezuela.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="e-card block px-3 py-2 text-sm transition hover:shadow-md"
                  >
                    <span className="font-semibold text-[var(--etext)]">
                      Terremoto Venezuela
                    </span>
                    <span className="block text-xs text-[var(--etext2)]">
                      Mapa colaborativo de daños en edificaciones
                    </span>
                  </a>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="qi-eyebrow text-[var(--etext2)]">
                🔍 Búsqueda de personas
              </h4>
              <ul className="mt-2 space-y-2">
                <li>
                  <a
                    href="https://venezuelatebusca.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="e-card block px-3 py-2 text-sm transition hover:shadow-md"
                  >
                    <span className="font-semibold text-[var(--etext)]">
                      Venezuela Te Busca
                    </span>
                    <span className="block text-xs text-[var(--etext2)]">
                      Registro centralizado de personas desaparecidas
                    </span>
                  </a>
                </li>
                <li>
                  <a
                    href="https://venezuelareporta.org"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="e-card block px-3 py-2 text-sm transition hover:shadow-md"
                  >
                    <span className="font-semibold text-[var(--etext)]">
                      Venezuela Reporta
                    </span>
                    <span className="block text-xs text-[var(--etext2)]">
                      Reporta desaparecidos, confirma a salvo o avistamientos
                    </span>
                  </a>
                </li>
              </ul>
            </div>
          </div>
        </div>

        <div className="mt-8 flex flex-col items-center justify-between gap-2 border-t border-[var(--eborder)] pt-6 text-center text-xs text-[var(--etext2)] sm:flex-row sm:text-left">
          <p>
            Plataforma de reporte ciudadano. Datos de mapas ©{" "}
            <a
              href="https://www.openstreetmap.org/copyright"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sky-600 hover:underline"
            >
              OpenStreetMap
            </a>
            . En caso de peligro inmediato, contacta también a los servicios
            de emergencia oficiales.
          </p>
          <a
            href="/admin"
            className="text-[var(--etext3)] hover:text-[var(--etext2)] hover:underline"
          >
            Panel de administración
          </a>
        </div>
      </div>
    </footer>
  );
}

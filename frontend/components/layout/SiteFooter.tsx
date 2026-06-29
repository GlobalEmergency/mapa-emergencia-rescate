import Link from "next/link";
import { CONTACT_EMAIL } from "@/lib/site";

export default function SiteFooter() {
  return (
    <footer
      id="equipo"
      className="border-t-[1.5px] border-[var(--eborder)] bg-[var(--esurf)]"
    >
      <div className="mx-auto w-full max-w-[1120px] px-4 py-8 sm:px-6">
        <div className="e-footer-grid">
          <div className="sm:col-span-2 lg:col-span-1">
            <h2 className="qi-h3">🤝 ¿Quiénes hacemos esto?</h2>
            <p className="mt-1.5 text-sm leading-snug text-[var(--etext2)]">
              Somos un equipo de voluntarios construyendo esta plataforma
              abierta para que cualquier persona afectada por el terremoto
              pueda pedir y ofrecer ayuda en tiempo real. Gratuito, sin fines
              de lucro y de código abierto.
            </p>
            <Link
              href="/contacto"
              className="e-btn e-btn-secondary mt-3 px-3 py-2 text-sm"
            >
              <span aria-hidden>✉️</span>
              Escríbenos · {CONTACT_EMAIL}
            </Link>
          </div>

          <div className="e-card flex flex-col border-indigo-200 bg-indigo-50 p-4">
            <h3 className="qi-h4 text-indigo-900">💬 Únete como voluntario</h3>
            <p className="mt-1 text-sm leading-snug text-indigo-900">
              Entra al Discord para coordinar rescates, suministros, traducción,
              difusión o soporte técnico.
            </p>
            <a
              href="https://discord.gg/5hhaQxU3PM"
              target="_blank"
              rel="noopener noreferrer"
              className="e-btn mt-3 self-start bg-indigo-600 px-4 py-2 text-sm text-white hover:bg-indigo-700"
              style={{ borderColor: "transparent" }}
            >
              <span aria-hidden>🎧</span> Entrar al Discord
            </a>
          </div>

          <div className="e-card flex flex-col bg-[var(--einput)] p-4">
            <h3 className="qi-h4">👩‍💻 ¿Sabes programar?</h3>
            <p className="mt-1 text-sm leading-snug text-[var(--etext2)]">
              El código es abierto. Reporta bugs, sugiere mejoras o abre un
              pull request: cada aporte ayuda a salvar vidas.
            </p>
            <a
              href="https://github.com/ArturoRiosMock/mapa-emergencia-rescate"
              target="_blank"
              rel="noopener noreferrer"
              className="e-btn e-btn-secondary mt-3 self-start px-4 py-2 text-sm"
            >
              <span aria-hidden>⭐</span> Colabora en GitHub
            </a>
          </div>
        </div>

        <div className="mt-8 border-t border-[var(--eborder)] pt-6">
          <h3 className="qi-h4">🔗 Sitios aliados</h3>
          <p className="mt-1 text-sm text-[var(--etext2)]">
            Otras plataformas ciudadanas que ayudan ante el terremoto.
            Compártelas para llegar a más personas.
          </p>
          <div className="e-int-2col mt-3 gap-4">
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
                      Reporta desaparecidas, confirma a salvo o avistamientos
                    </span>
                  </a>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="qi-eyebrow text-[var(--etext2)]">
                📦 Acopio y ayuda
              </h4>
              <ul className="mt-2 space-y-2">
                <li>
                  <a
                    href="https://responsegrid.app/e/terremoto-venezuela-2026"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="e-card block px-3 py-2 text-sm transition hover:shadow-md"
                  >
                    <span className="font-semibold text-[var(--etext)]">
                      ResponseGrid
                    </span>
                    <span className="block text-xs text-[var(--etext2)]">
                      Directorio de centros de acopio y necesidades · datos por
                      ResponseGrid / Global Emergency (CC BY-SA 4.0)
                    </span>
                  </a>
                </li>
              </ul>
            </div>
          </div>
        </div>

        <nav
          aria-label="Documentos legales"
          className="mt-8 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 border-t border-[var(--eborder)] pt-6 text-sm sm:justify-start"
        >
          <Link
            href="/privacidad"
            className="font-semibold text-[var(--etext)] hover:underline"
          >
            Política de privacidad
          </Link>
          <span aria-hidden className="text-[var(--etext3)]">
            ·
          </span>
          <Link
            href="/terminos"
            className="font-semibold text-[var(--etext)] hover:underline"
          >
            Términos y condiciones
          </Link>
          <span aria-hidden className="text-[var(--etext3)]">
            ·
          </span>
          <Link
            href="/contacto"
            className="font-semibold text-[var(--etext)] hover:underline"
          >
            Contacto
          </Link>
        </nav>

        <div className="mt-4 flex flex-col items-center justify-between gap-2 text-center text-xs text-[var(--etext2)] sm:flex-row sm:text-left">
          <p>
            Plataforma de reporte ciudadano sin fines de lucro. Datos de
            mapas ©{" "}
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
          <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 sm:shrink-0 sm:justify-end">
            <Link
              href="/metodologia"
              className="whitespace-nowrap text-[var(--etext3)] hover:text-[var(--etext2)] hover:underline"
            >
              Metodología
            </Link>
            <Link
              href="/riesgo-sismico"
              className="whitespace-nowrap text-[var(--etext3)] hover:text-[var(--etext2)] hover:underline"
            >
              Riesgo sísmico
            </Link>
            <a
              href="/admin"
              className="whitespace-nowrap text-[var(--etext3)] hover:text-[var(--etext2)] hover:underline"
            >
              Panel de administración
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}

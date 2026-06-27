import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import SubPageShell from "../components/SubPageShell";

export const metadata: Metadata = {
  title: "Apoyo disponible · Mapa de Emergencia Venezuela",
  alternates: { canonical: "/apoyo-disponible" },
  description:
    "Directorio de apoyo durante el terremoto: psicológico, civil y rescate, transporte, discapacidad, mascotas y más. Contactos directos.",
};

/** Convierte un número mostrado a un href tel: válido para marcar al tocarlo. */
function telHref(display: string): string {
  const cleaned = display.replace(/[^\d*A-Za-z]/g, "");
  if (cleaned.length <= 4) return `tel:${cleaned}`;
  const national = cleaned.replace(/^0/, "");
  return display.startsWith("0800") ? `tel:${cleaned}` : `tel:+58${national}`;
}

function Card({
  emoji,
  iconClass,
  title,
  subtitle,
  children,
}: {
  emoji: string;
  iconClass: string;
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col rounded-[24px] bg-white p-6 shadow-[0_4px_24px_rgba(0,0,0,0.04)] sm:p-7">
      <div className="mb-5 flex items-start gap-4">
        <span
          aria-hidden
          className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-[18px] text-2xl ${iconClass}`}
        >
          {emoji}
        </span>
        <div className="min-w-0">
          <h2 className="text-lg font-bold text-slate-900">{title}</h2>
          <p className="text-sm leading-snug text-slate-500">{subtitle}</p>
        </div>
      </div>
      <div className="flex flex-1 flex-col gap-3">{children}</div>
    </div>
  );
}

/** Caja interior con contacto telefónico. */
function ContactRow({
  label,
  sublabel,
  phone,
  stacked = false,
}: {
  label: string;
  sublabel: string;
  phone: string;
  stacked?: boolean;
}) {
  const number = (
    <a
      href={telHref(phone)}
      className="font-bold text-[#c41a1a] hover:underline"
    >
      {phone}
    </a>
  );
  return (
    <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
      {stacked ? (
        <>
          <p className="font-bold text-slate-900">{label}</p>
          <p className="mb-2 text-[13px] text-slate-500">{sublabel}</p>
          <p className="text-[17px]">{number}</p>
        </>
      ) : (
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="font-bold text-slate-900">{label}</p>
            <p className="text-[13px] text-slate-500">{sublabel}</p>
          </div>
          <span className="shrink-0 text-right">{number}</span>
        </div>
      )}
    </div>
  );
}

/** Caja interior con texto y una acción (enlace interno). */
function ActionRow({
  label,
  sublabel,
  body,
  href,
  cta,
  filled = false,
}: {
  label?: string;
  sublabel?: string;
  body?: string;
  href: string;
  cta: string;
  filled?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
      {label ? <p className="font-bold text-slate-900">{label}</p> : null}
      {sublabel ? (
        <p className="text-[13px] text-slate-500">{sublabel}</p>
      ) : null}
      {body ? (
        <p className="text-sm leading-relaxed text-slate-600">{body}</p>
      ) : null}
      <Link
        href={href}
        className={
          filled
            ? "mt-4 flex w-full items-center justify-center rounded-full bg-[#c41a1a] px-6 py-3 text-sm font-bold text-white transition-colors hover:bg-red-700"
            : "mt-3 inline-flex items-center justify-center rounded-full bg-[#c41a1a] px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-red-700"
        }
      >
        {cta}
      </Link>
    </div>
  );
}

export default function ApoyoPage() {
  return (
    <SubPageShell breadcrumb="Apoyo disponible">
      <section className="mx-auto w-full max-w-[1120px] px-4 py-8 sm:px-6">
        <h1 className="mb-2 text-[28px] font-bold text-slate-900 sm:text-[32px]">
          Apoyo disponible
        </h1>
        <p className="mb-10 text-[15px] text-slate-600 sm:text-base">
          Selecciona el tipo de apoyo que necesitas. Toca una tarjeta para ver
          los contactos directos.
        </p>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          <Card
            emoji="🧠"
            iconClass="bg-amber-100"
            title="Psicológico"
            subtitle="Apoyo emocional y mental"
          >
            <ContactRow
              label="IMPRESP"
              sublabel="Emergencia emocional"
              phone="0212-576-5555"
            />
            <ContactRow
              label="CECODAP"
              sublabel="Niños y adolescentes"
              phone="0212-978-4338"
            />
          </Card>

          <Card
            emoji="🦺"
            iconClass="bg-amber-100"
            title="Civil / Rescate"
            subtitle="Protección Civil y emergencias"
          >
            <ContactRow
              label="Protección Civil Nacional"
              sublabel="Rescate · 24h"
              phone="0800-RESCATE"
            />
            <ContactRow
              label="Emergencias"
              sublabel="Línea nacional"
              phone="911"
            />
            <ContactRow
              label="Cruz Roja Venezolana"
              sublabel="Humanitaria"
              phone="0212-483-4372"
            />
          </Card>

          <Card
            emoji="🚗"
            iconClass="bg-red-100"
            title="Transporte"
            subtitle="Traslado de personas y suministros"
          >
            <ContactRow
              label="Bomberos"
              sublabel="Traslado en emergencia"
              phone="172"
              stacked
            />
            <ActionRow
              label="Voluntarios con vehículo"
              sublabel="Coordina en el espacio de voluntarios"
              href="/chat"
              cta="Ver chat"
            />
          </Card>

          <Card
            emoji="♿"
            iconClass="bg-violet-100"
            title="Discapacidad"
            subtitle="Apoyo especializado para personas con discapacidad"
          >
            <ContactRow
              label="CONAPDIS"
              sublabel="Consejo Nacional para las Personas con Discapacidad"
              phone="0800-123-4567"
              stacked
            />
          </Card>

          <Card
            emoji="🐾"
            iconClass="bg-emerald-100"
            title="Mascotas"
            subtitle="Refugio y atención para animales"
          >
            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
              <p className="font-bold text-slate-900">Fundación ABVA</p>
              <p className="text-[13px] leading-relaxed text-slate-500">
                Atención y refugio temporal para animales afectados
              </p>
            </div>
            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
              <p className="font-bold text-slate-900">Coordinación en redes</p>
              <p className="text-[13px] leading-relaxed text-slate-500">
                #MascotasTerremotoVenezuela en Twitter/X e Instagram
              </p>
            </div>
            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
              <p className="font-bold text-slate-900">Mascotas por Venezuela</p>
              <p className="text-[13px] leading-relaxed text-slate-500">
                Plataforma de rescate y reunificación de mascotas afectadas
              </p>
              <a
                href="https://www.mascotasporvenezuela.com"
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-flex items-center justify-center rounded-full bg-[#c41a1a] px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-red-700"
              >
                Visitar sitio
              </a>
            </div>
          </Card>

          <Card
            emoji="💬"
            iconClass="bg-slate-100"
            title="Otro tipo de apoyo"
            subtitle="No encuentras lo que buscas"
          >
            <ActionRow
              body="Coordina con otros voluntarios o reporta tu necesidad en el espacio comunitario."
              href="/voluntario"
              cta="Espacio de voluntarios"
              filled
            />
          </Card>
        </div>
      </section>
    </SubPageShell>
  );
}

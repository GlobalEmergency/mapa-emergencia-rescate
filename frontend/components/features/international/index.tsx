"use client";

import {
  Building2,
  Copy,
  Check,
  Clock,
  ExternalLink,
  Globe2,
  Mail,
  Megaphone,
  MapPin,
  Phone,
  Send,
  Share2,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { apiFetch } from "@/lib/api";
import {
  OFFICES,
  TIME_ZONE_COUNTRY_CODES,
  type ContactLine,
  type CountryOffice,
  type DonationPoint,
  type ShareChannel,
} from "@/lib/data/international-help";

const CONTACT_ICON = {
  phone: Phone,
  email: Mail,
  web: Globe2,
  hours: Clock,
} satisfies Record<ContactLine["type"], typeof Phone>;

const COUNTRY_STORAGE_KEY = "apoyo-global-country-code";

function getCountryFlag(countryCode: string) {
  return countryCode
    .toUpperCase()
    .replace(/./g, (character) =>
      String.fromCodePoint(127397 + character.charCodeAt(0)),
    );
}

function getSavedCountryCode() {
  if (typeof window === "undefined") {
    return null;
  }

  const savedCountryCode = window.localStorage.getItem(COUNTRY_STORAGE_KEY);

  return savedCountryCode &&
    OFFICES.some((office) => office.countryCode === savedCountryCode)
    ? savedCountryCode
    : null;
}

function getBrowserCountryCode() {
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const timeZoneCountryCode = TIME_ZONE_COUNTRY_CODES[timeZone];

  if (timeZoneCountryCode) {
    return timeZoneCountryCode;
  }

  const locale = navigator.languages?.[0] ?? navigator.language;
  const region = locale?.split("-")[1];

  return region?.length === 2 ? region.toUpperCase() : null;
}

function ContactRow({ line }: { line: ContactLine }) {
  const Icon = CONTACT_ICON[line.type];
  const content = (
    <>
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" aria-hidden />
      <span>{line.label}</span>
    </>
  );

  if (line.href) {
    return (
      <a
        href={line.href}
        target={line.type === "web" ? "_blank" : undefined}
        rel={line.type === "web" ? "noopener noreferrer" : undefined}
        className="flex min-w-0 items-start gap-2 text-sm text-slate-600 transition hover:text-red-700 hover:underline"
      >
        {content}
      </a>
    );
  }

  return <p className="flex items-start gap-2 text-sm text-slate-600">{content}</p>;
}

function OfficeCard({
  office,
}: {
  office: CountryOffice;
}) {
  return (
    <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <span
          className="grid h-12 w-12 shrink-0 place-items-center rounded-lg bg-slate-50 text-3xl ring-1 ring-slate-200"
          aria-hidden
        >
          {getCountryFlag(office.countryCode)}
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="font-bold text-slate-950">{office.country}</h3>
          <p className="text-sm font-semibold text-red-700">
            {office.organization}
          </p>
          <div className="mt-3 space-y-2">
            {office.lines.map((line) => (
              <ContactRow key={`${office.country}-${line.label}`} line={line} />
            ))}
          </div>
        </div>
      </div>
    </article>
  );
}

function DonationCard({ point }: { point: DonationPoint }) {
  return (
    <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-red-700">
            {point.city}
          </p>
          <h3 className="mt-1 font-bold text-slate-950">{point.name}</h3>
        </div>
        <Building2 className="h-5 w-5 shrink-0 text-slate-400" aria-hidden />
      </div>
      <p className="mt-3 flex items-start gap-2 text-sm text-slate-700">
        <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" aria-hidden />
        <span>{point.address}</span>
      </p>
      {point.hours ? (
        <p className="mt-2 flex items-start gap-2 text-sm text-slate-700">
          <Clock className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" aria-hidden />
          <span>{point.hours}</span>
        </p>
      ) : null}
      {point.accepts ? (
        <p className="mt-3 text-sm leading-relaxed text-slate-600">
          {point.accepts}
        </p>
      ) : null}
      <a
        href={point.sourceHref}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-4 inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-slate-500 transition hover:text-red-700"
      >
        {point.source} · {point.updatedAt}
        <ExternalLink className="h-3.5 w-3.5" aria-hidden />
      </a>
    </article>
  );
}

function buildShareText(office: CountryOffice) {
  const donationLines =
    office.donationPoints
      ?.slice(0, 4)
      .map((point) => `- ${point.city}: ${point.name}, ${point.address}`)
      .join("\n") ?? "- Revisa los canales locales antes de donar.";

  const shareLines =
    office.shareChannels
      ?.slice(0, 4)
      .map((channel) => `- ${channel.name}: ${channel.href}`)
      .join("\n") ?? `- ${office.organization}`;

  return `Ayuda para Venezuela desde ${office.country}

Puntos de donación:
${donationLines}

Canales para compartir:
${shareLines}

Verifica horarios y datos antes de trasladarte:
https://terremotovenezuela.app/apoyo-global`;
}

function ShareChannelCard({ channel }: { channel: ShareChannel }) {
  return (
    <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-bold text-slate-950">{channel.name}</h3>
            {channel.status === "social" ? (
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold uppercase tracking-wide text-amber-800">
                Red social
              </span>
            ) : null}
          </div>
          <p className="mt-2 text-sm leading-relaxed text-slate-600">
            {channel.description}
          </p>
        </div>
        <Megaphone className="h-5 w-5 shrink-0 text-slate-400" aria-hidden />
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <a
          href={channel.href}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 rounded-lg bg-slate-950 px-3 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
        >
          Abrir canal
          <ExternalLink className="h-4 w-4" aria-hidden />
        </a>
        <a
          href={channel.sourceHref}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-slate-500 transition hover:text-red-700"
        >
          {channel.source} · {channel.updatedAt}
          <ExternalLink className="h-3.5 w-3.5" aria-hidden />
        </a>
      </div>
    </article>
  );
}

export default function InternationalHelp() {
  const [detectedCountryCode, setDetectedCountryCode] = useState<string | null>(
    null,
  );
  const [selectedCountryCode, setSelectedCountryCode] = useState<string>(
    () => getSavedCountryCode() ?? OFFICES[0].countryCode,
  );
  const [copiedShareText, setCopiedShareText] = useState(false);
  const hasManualCountry = useRef(Boolean(getSavedCountryCode()));

  useEffect(() => {
    let cancelled = false;

    async function detectCountry() {
      const fallback = getBrowserCountryCode();

      try {
        const response = await apiFetch("/api/geo", { cache: "no-store" });
        const data = (await response.json()) as { countryCode?: string };
        const code = data.countryCode ?? fallback;

        if (!cancelled && code) {
          setDetectedCountryCode(code);
          if (
            !hasManualCountry.current &&
            OFFICES.some((office) => office.countryCode === code)
          ) {
            setSelectedCountryCode(code);
          }
        }
      } catch {
        if (!cancelled && fallback) {
          setDetectedCountryCode(fallback);
          if (
            !hasManualCountry.current &&
            OFFICES.some((office) => office.countryCode === fallback)
          ) {
            setSelectedCountryCode(fallback);
          }
        }
      }
    }

    detectCountry();

    return () => {
      cancelled = true;
    };
  }, []);

  const selectedOffice = useMemo(
    () =>
      OFFICES.find((office) => office.countryCode === selectedCountryCode) ??
      OFFICES[0],
    [selectedCountryCode],
  );

  const detectedOffice = detectedCountryCode
    ? OFFICES.find((office) => office.countryCode === detectedCountryCode)
    : null;

  const shareText = useMemo(() => buildShareText(selectedOffice), [selectedOffice]);
  const whatsappShareHref = `https://wa.me/?text=${encodeURIComponent(shareText)}`;

  async function handleCopyShareText() {
    try {
      await navigator.clipboard.writeText(shareText);
      setCopiedShareText(true);
      setTimeout(() => setCopiedShareText(false), 2500);
    } catch {
      setCopiedShareText(false);
    }
  }

  function handleCountryChange(countryCode: string) {
    hasManualCountry.current = true;
    setSelectedCountryCode(countryCode);
    window.localStorage.setItem(COUNTRY_STORAGE_KEY, countryCode);
  }

  async function handleNativeShare() {
    if (!navigator.share) {
      await handleCopyShareText();
      return;
    }

    try {
      await navigator.share({
        title: `Ayuda para Venezuela desde ${selectedOffice.country}`,
        text: shareText,
      });
    } catch {
      // El usuario canceló o el navegador no permitió compartir.
    }
  }

  return (
    <section id="ayuda-internacional" className="bg-slate-50">
      <div className="mx-auto w-full max-w-[1120px] px-4 py-8 sm:py-12">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="grid gap-5 lg:grid-cols-[1fr_22rem] lg:items-start">
            <div className="flex items-start gap-4">
              <span
                className="grid h-14 w-14 shrink-0 place-items-center rounded-xl bg-slate-50 text-4xl ring-1 ring-slate-200"
                aria-hidden
              >
                {getCountryFlag(selectedOffice.countryCode)}
              </span>
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-red-700">
                  Apoyo global
                </p>
                <h1 className="mt-1 text-2xl font-bold leading-tight text-slate-950 sm:text-3xl">
                  Ayuda para Venezuela desde {selectedOffice.country}
                </h1>
                <p className="mt-3 text-sm leading-relaxed text-slate-700">
                  Te mostramos solo la información local del país detectado para
                  evitar ruido. Puedes cambiar de país si estás ayudando a
                  alguien desde otro lugar.
                </p>
              </div>
            </div>
            <label className="rounded-xl border border-red-100 bg-red-50/70 p-4">
              <span className="flex items-center justify-between gap-3 text-sm font-semibold text-slate-800">
                <span>¿Este es tu país para donar?</span>
                {detectedOffice ? (
                  <span className="text-xs font-medium text-slate-500">
                    Detectado: {detectedOffice.country}
                  </span>
                ) : null}
              </span>
              <span className="mt-1 block text-xs leading-relaxed text-slate-600">
                Si estás en otro lugar o quieres buscar puntos de otro país,
                cámbialo aquí.
              </span>
              <select
                value={selectedCountryCode}
                onChange={(event) => handleCountryChange(event.target.value)}
                className="mt-3 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm font-semibold text-slate-950 shadow-sm outline-none transition focus:border-red-500 focus:ring-2 focus:ring-red-200"
              >
                {OFFICES.map((office) => (
                  <option key={office.countryCode} value={office.countryCode}>
                    {office.country}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>

        <div className="mt-6 grid gap-5 lg:grid-cols-[0.95fr_1.05fr]">
          <div className="space-y-4">
            <OfficeCard office={selectedOffice} />

            {selectedOffice.donationPoints?.length ? (
              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                  <h3 className="font-bold text-slate-950">
                    Puntos de acopio en {selectedOffice.country}
                  </h3>
                  <span className="text-xs font-semibold text-slate-500">
                    Para donar insumos físicos
                  </span>
                </div>
                <div className="mt-4 grid gap-3">
                  {selectedOffice.donationPoints.map((point) => (
                    <DonationCard
                      key={`${point.city}-${point.name}-${point.address}`}
                      point={point}
                    />
                  ))}
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-slate-300 bg-white p-4 text-sm text-slate-600">
                Todavía no tenemos puntos de acopio verificados para{" "}
                {selectedOffice.country}. Usa los canales de la Cruz Roja para
                orientación local mientras se agregan nuevos puntos.
              </div>
            )}
          </div>

          <div className="space-y-4">
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-start gap-3">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-slate-950 text-white">
                  <Share2 className="h-5 w-5" aria-hidden />
                </span>
                <div>
                  <h3 className="font-bold text-slate-950">
                    Compartir en redes
                  </h3>
                  <p className="mt-1 text-sm leading-relaxed text-slate-600">
                    Copia un mensaje breve con los canales de{" "}
                    {selectedOffice.country} o envíalo por WhatsApp.
                  </p>
                </div>
              </div>
              <details className="mt-4 rounded-lg border border-slate-200 bg-slate-50">
                <summary className="cursor-pointer px-3 py-2 text-sm font-semibold text-slate-700">
                  Ver texto antes de compartir
                </summary>
                <p className="max-h-44 overflow-y-auto border-t border-slate-200 px-3 py-3 text-xs leading-relaxed text-slate-700 [overflow-wrap:anywhere]">
                  {shareText}
                </p>
              </details>
              <div className="mt-3 grid gap-2 sm:grid-cols-3">
                <button
                  type="button"
                  onClick={handleCopyShareText}
                  className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  {copiedShareText ? (
                    <Check className="h-4 w-4" aria-hidden />
                  ) : (
                    <Copy className="h-4 w-4" aria-hidden />
                  )}
                  {copiedShareText ? "Copiado" : "Copiar"}
                </button>
                <a
                  href={whatsappShareHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-3 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700"
                >
                  <Send className="h-4 w-4" aria-hidden />
                  WhatsApp
                </a>
                <button
                  type="button"
                  onClick={handleNativeShare}
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-red-700 px-3 py-2.5 text-sm font-semibold text-white transition hover:bg-red-800"
                >
                  <Share2 className="h-4 w-4" aria-hidden />
                  Más
                </button>
              </div>
            </div>

            {selectedOffice.shareChannels?.length ? (
              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <h3 className="font-bold text-slate-950">
                  Fundaciones y canales para difundir
                </h3>
                <p className="mt-1 text-sm text-slate-600">
                  Prioriza fuentes verificadas; los canales de redes sociales se
                  muestran aparte para que puedas confirmarlos antes de mover
                  donaciones.
                </p>
                <div className="mt-4 grid gap-3">
                  {selectedOffice.shareChannels.map((channel) => (
                    <ShareChannelCard key={channel.name} channel={channel} />
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <Link
            href="/#e-directory"
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-red-700 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-red-800"
          >
            Buscar en la lista de desaparecidas
          </Link>
          <Link
            href="/#mapa"
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
          >
            Ver mapa de reportes
          </Link>
        </div>
      </div>
    </section>
  );
}

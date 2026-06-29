"use client";

import { Fragment, useCallback, useRef, useState } from "react";

const SISMO_MESSAGE =
  "Sismo en Venezuela · Zonas afectadas: La Guaira, Miranda, Distrito Capital · Réplicas activas · Mantente alejado de estructuras dañadas";

const EMERGENCY_LINKS = [
  { label: "911 Emergencias", href: "tel:911" },
  { label: "171 CICPC", href: "tel:171" },
  { label: "172 Bomberos", href: "tel:172" },
  { label: "0800-RESCATE Protección Civil", href: "tel:08007372283" },
] as const;

type TickerItem =
  | { kind: "text"; message: string }
  | { kind: "emergency"; links: readonly (typeof EMERGENCY_LINKS)[number][] };

const TICKER_ITEMS: TickerItem[] = [
  { kind: "text", message: SISMO_MESSAGE },
  { kind: "emergency", links: EMERGENCY_LINKS },
];

function EmergencyTickerLinks({
  links,
}: {
  links: readonly (typeof EMERGENCY_LINKS)[number][];
}) {
  return (
    <span className="inline-flex items-center px-8 text-xs font-bold text-red-900">
      <span aria-hidden className="mr-1">
        📞
      </span>
      {links.map((link, index) => (
        <Fragment key={link.href}>
          {index > 0 ? (
            <span aria-hidden className="mx-1.5 text-red-700/70">
              ·
            </span>
          ) : null}
          <a
            href={link.href}
            className="alert-ticker__link inline-flex min-h-9 items-center rounded px-1.5 py-1 underline decoration-red-400/70 underline-offset-2 transition hover:bg-red-200/70 hover:decoration-red-800 active:bg-red-300/80 sm:min-h-0 sm:py-0.5"
          >
            {link.label}
          </a>
        </Fragment>
      ))}
    </span>
  );
}

export default function AlertTicker() {
  const items = [...TICKER_ITEMS, ...TICKER_ITEMS];
  const [paused, setPaused] = useState(false);
  const resumeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const pauseTicker = useCallback(() => {
    setPaused(true);
    if (resumeTimerRef.current) clearTimeout(resumeTimerRef.current);
    resumeTimerRef.current = setTimeout(() => setPaused(false), 8000);
  }, []);

  return (
    <div
      className={`alert-ticker flex min-h-[38px] items-center overflow-hidden border-y border-red-200 bg-red-100${
        paused ? " is-paused" : ""
      }`}
      aria-live="polite"
      onPointerDown={pauseTicker}
    >
      <div className="flex h-full shrink-0 items-center gap-1.5 bg-[#C41A1A] px-4 text-[11px] font-extrabold uppercase tracking-widest text-white">
        <span
          className="inline-block h-[7px] w-[7px] rounded-full bg-white"
          style={{ animation: "pdot 2s ease-in-out infinite" }}
          aria-hidden
        />
        Alerta
      </div>
      <div className="relative flex flex-1 items-center self-stretch overflow-hidden">
        <div className="alert-ticker__track flex items-center whitespace-nowrap">
          {items.map((item, i) =>
            item.kind === "text" ? (
              <span
                key={i}
                className="px-8 text-xs leading-none text-red-900"
                style={{ fontWeight: 400 }}
              >
                {item.message}
              </span>
            ) : (
              <EmergencyTickerLinks key={i} links={item.links} />
            ),
          )}
        </div>
      </div>
    </div>
  );
}

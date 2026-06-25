"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import ShareButton from "./ShareButton";
import { PRIMARY_CTA, SITE_NAV } from "@/lib/navigation";

const CARD_RING: Record<
  NonNullable<(typeof SITE_NAV)[number]["accent"]>,
  string
> = {
  red: "hover:border-red-300 hover:bg-red-50/50",
  purple: "hover:border-purple-300 hover:bg-purple-50/50",
  emerald: "hover:border-emerald-300 hover:bg-emerald-50/50",
  sky: "hover:border-sky-300 hover:bg-sky-50/50",
  slate: "hover:border-slate-300 hover:bg-slate-50",
  indigo: "hover:border-indigo-300 hover:bg-indigo-50/50",
};

function usePeopleTotals() {
  const [missing, setMissing] = useState<number | null>(null);
  const [found, setFound] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const [activeRes, foundRes] = await Promise.all([
          fetch("/api/missing?pageSize=1", { cache: "no-store" }),
          fetch("/api/missing?status=found&pageSize=1", { cache: "no-store" }),
        ]);
        if (cancelled) return;
        if (activeRes.ok) {
          const data = await activeRes.json();
          if (!cancelled) setMissing(data.total ?? 0);
        }
        if (foundRes.ok) {
          const data = await foundRes.json();
          if (!cancelled) setFound(data.total ?? 0);
        }
      } catch {
        // se reintenta en el próximo ciclo
      }
    };
    load();
    const id = setInterval(load, 60_000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  return { missing, found };
}

export default function SiteMenuGrid() {
  const { missing, found } = usePeopleTotals();

  return (
    <section className="mx-auto w-full max-w-7xl px-4 py-10 sm:py-12">
      <div className="mx-auto max-w-2xl text-center">
        <h2 className="text-xl font-bold text-slate-900 sm:text-2xl">
          ¿Qué necesitas hacer?
        </h2>
        <p className="mt-2 text-sm text-slate-600">
          Elige una sección. Cada área tiene su propia página para que encuentres
          lo que buscas más rápido.
        </p>
      </div>

      <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Link
          href={PRIMARY_CTA.href}
          className="group flex flex-col rounded-2xl border-2 border-red-200 bg-red-600 p-5 text-left text-white shadow-sm transition hover:bg-red-500 sm:col-span-2 lg:col-span-1 lg:row-span-2"
        >
          <span className="text-3xl" aria-hidden>
            {PRIMARY_CTA.icon}
          </span>
          <h3 className="mt-3 text-lg font-bold">{PRIMARY_CTA.label}</h3>
          <p className="mt-2 text-sm text-red-50">{PRIMARY_CTA.description}</p>
          <span className="mt-auto pt-4 text-sm font-semibold text-white/90">
            Abrir mapa →
          </span>
        </Link>

        {SITE_NAV.map((item) => {
          const accent = item.accent ?? "slate";
          const showMissing =
            item.href === "/desaparecidas" && missing !== null;
          const showFound =
            item.href === "/desaparecidas#localizados" && found !== null;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`group flex flex-col rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm transition ${CARD_RING[accent]}`}
            >
              <div className="flex items-start justify-between gap-2">
                <span className="text-2xl" aria-hidden>
                  {item.icon}
                </span>
                {showMissing && (
                  <span className="rounded-full bg-purple-100 px-2 py-0.5 text-xs font-bold text-purple-800">
                    {missing.toLocaleString("es-VE")}
                  </span>
                )}
                {showFound && (
                  <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-800">
                    {found.toLocaleString("es-VE")}
                  </span>
                )}
              </div>
              <h3 className="mt-2 font-semibold text-slate-900">{item.label}</h3>
              <p className="mt-1 text-sm text-slate-600">{item.description}</p>
              <span className="mt-3 text-xs font-semibold text-slate-400 group-hover:text-slate-600">
                Entrar →
              </span>
            </Link>
          );
        })}
      </div>

      <div className="mt-6 flex justify-center">
        <ShareButton />
      </div>
    </section>
  );
}

"use client";

import { useEffect, useState } from "react";

/**
 * Tarjeta de stats en vivo del hero (mockup "ALERTA ACTIVA"): personas buscadas
 * y localizadas. Solo presentación — reusa los mismos endpoints que la navbar
 * (/api/missing). No expone datos nuevos: "brigadas" se omite a propósito
 * porque no hay fuente de datos para ese número. ponytail.
 */
export default function HeroStats() {
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

  const fmt = (n: number | null) =>
    n === null ? "—" : n.toLocaleString("es-VE");

  return (
    <div className="mt-5 w-full max-w-md rounded-2xl border border-white/15 bg-white/10 px-5 py-4 text-white shadow-lg backdrop-blur-md">
      <p className="flex items-center justify-center gap-2 text-[11px] font-bold uppercase tracking-wide text-red-200">
        <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-red-400" />
        Alerta activa
      </p>
      <dl className="mt-3 grid grid-cols-2 divide-x divide-white/15">
        <div className="px-2">
          <dd className="text-2xl font-bold tabular-nums sm:text-3xl">
            {fmt(missing)}
          </dd>
          <dt className="text-xs text-slate-300">buscados</dt>
        </div>
        <div className="px-2">
          <dd className="text-2xl font-bold tabular-nums text-emerald-300 sm:text-3xl">
            {fmt(found)}
          </dd>
          <dt className="text-xs text-slate-300">localizados</dt>
        </div>
      </dl>
    </div>
  );
}

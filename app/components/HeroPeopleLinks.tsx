"use client";

import { useEffect, useState } from "react";

/**
 * Botones del hero para "Personas desaparecidas" y "Localizados a salvo" con
 * el total en vivo embebido. Los conteos vienen del mismo endpoint que usan las
 * secciones (`/api/missing`), pidiendo `pageSize=1` para traer solo el total.
 */
export default function HeroPeopleLinks() {
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
    // Refresco suave para que el total no quede obsoleto durante la sesión.
    const id = setInterval(load, 60_000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  return (
    <>
      <a
        href="#e-directory"
        className="flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
      >
        🧍 Personas desaparecidas
        {missing !== null && (
          <span className="inline-flex items-center rounded-full bg-purple-100 px-2 py-0.5 text-xs font-bold text-purple-800">
            {missing.toLocaleString("es-VE")}
          </span>
        )}
      </a>
      <a
        href="#e-directory"
        className="flex items-center justify-center gap-2 rounded-lg border border-emerald-300 bg-emerald-50 px-5 py-2.5 text-sm font-semibold text-emerald-700 shadow-sm transition hover:bg-emerald-100"
      >
        💚 Localizadas a salvo
        {found !== null && (
          <span className="inline-flex items-center rounded-full bg-emerald-600 px-2 py-0.5 text-xs font-bold text-white">
            {found.toLocaleString("es-VE")}
          </span>
        )}
      </a>
    </>
  );
}

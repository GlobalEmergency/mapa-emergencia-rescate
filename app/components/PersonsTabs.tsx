"use client";

import { useCallback, useEffect, useState } from "react";
import MissingPersons from "./MissingPersons";
import FoundPersons from "./FoundPersons";

type Tab = "desaparecidas" | "localizados";

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

export default function PersonsTabs() {
  const [active, setActive] = useState<Tab>("desaparecidas");
  const { missing, found } = usePeopleTotals();

  useEffect(() => {
    const hash = window.location.hash.replace("#", "");
    if (hash === "localizados" || hash === "desaparecidas") {
      setActive(hash);
    }
  }, []);

  const handleHashChange = useCallback(() => {
    const hash = window.location.hash.replace("#", "");
    if (hash === "localizados" || hash === "desaparecidas") {
      setActive(hash);
    }
  }, []);

  useEffect(() => {
    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, [handleHashChange]);

  const tabs: { id: Tab; label: string; icon: string; count: number | null; color: string; activeColor: string; badgeColor: string }[] = [
    {
      id: "desaparecidas",
      label: "Personas desaparecidas",
      icon: "🧍",
      count: missing,
      color: "text-slate-600 hover:text-slate-900 hover:bg-slate-50",
      activeColor: "text-purple-700 bg-purple-50 border-purple-300",
      badgeColor: "bg-purple-100 text-purple-800",
    },
    {
      id: "localizados",
      label: "Personas localizadas a salvo",
      icon: "💚",
      count: found,
      color: "text-slate-600 hover:text-slate-900 hover:bg-slate-50",
      activeColor: "text-emerald-700 bg-emerald-50 border-emerald-300",
      badgeColor: "bg-emerald-100 text-emerald-800",
    },
  ];

  return (
    <section id="desaparecidas" className="mx-auto w-full max-w-[1120px] px-4 pb-14 sm:px-6">
      <div className="e-card overflow-hidden">
        <div className="flex border-b-2 border-[var(--eborder)]">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                setActive(tab.id);
                window.history.replaceState(null, "", `#${tab.id}`);
              }}
              data-active={active === tab.id}
              className="e-tab-label flex flex-1 items-center justify-center gap-2"
            >
              <span aria-hidden>{tab.icon}</span>
              <span className="hidden sm:inline">{tab.label}</span>
              <span className="sm:hidden">
                {tab.id === "desaparecidas" ? "Desaparecidas" : "Localizados"}
              </span>
              {tab.count !== null && (
                <span className="e-pill bg-red-50 text-red-700 text-xs">
                  {tab.count.toLocaleString("es-VE")}
                </span>
              )}
            </button>
          ))}
        </div>

        <div className="bg-[var(--ebg)] p-4 sm:p-6">
          {active === "desaparecidas" ? <MissingPersons /> : <FoundPersons />}
        </div>
      </div>
    </section>
  );
}

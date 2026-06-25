"use client";

import { useEffect, useRef, useState } from "react";

export interface GeocodeResult {
  lat: number;
  lng: number;
  label: string;
}

interface AddressSearchProps {
  onSelect: (result: GeocodeResult) => void;
  /** Punto de referencia para priorizar resultados cercanos a la zona afectada. */
  bias?: { lat: number; lng: number };
}

export default function AddressSearch({ onSelect, bias }: AddressSearchProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<GeocodeResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  async function search(event: React.FormEvent) {
    event.preventDefault();
    const q = query.trim();
    if (q.length < 3) {
      setError("Escribe al menos 3 caracteres.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ q });
      if (bias) {
        params.set("lat", String(bias.lat));
        params.set("lng", String(bias.lng));
      }
      const res = await fetch(`/api/geocode?${params.toString()}`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "No se pudo buscar.");
      setResults(data.results ?? []);
      setOpen(true);
      if ((data.results ?? []).length === 0) {
        setError("No se encontró esa dirección en Venezuela.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al buscar.");
    } finally {
      setLoading(false);
    }
  }

  function choose(result: GeocodeResult) {
    onSelect(result);
    setOpen(false);
    setResults([]);
    setQuery(result.label.split(",").slice(0, 2).join(", "));
  }

  function useMyLocation() {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setError("Tu dispositivo no permite compartir la ubicación.");
      return;
    }
    setLocating(true);
    setError(null);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocating(false);
        setOpen(false);
        setResults([]);
        setQuery("Mi ubicación actual");
        onSelect({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          label: "Mi ubicación actual",
        });
      },
      (err) => {
        setLocating(false);
        const message =
          err.code === err.PERMISSION_DENIED
            ? "Permiso denegado. Activa la ubicación para usar esta opción."
            : err.code === err.TIMEOUT
              ? "Tardó demasiado en obtener tu ubicación. Inténtalo de nuevo."
              : "No se pudo obtener tu ubicación.";
        setError(message);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
    );
  }

  return (
    <div ref={containerRef} className="relative">
      <form onSubmit={search} className="flex gap-2">
        <div className="relative flex-1">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
            📍
          </span>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => results.length > 0 && setOpen(true)}
            placeholder="Escribe una dirección o zona (ej: Av. Libertador, Caracas)"
            aria-label="Buscar dirección"
            className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-9 pr-3 text-sm outline-none focus:border-slate-900"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
        >
          {loading ? "Buscando…" : "Buscar"}
        </button>
        <button
          type="button"
          onClick={useMyLocation}
          disabled={locating}
          title="Usar mi ubicación actual"
          aria-label="Usar mi ubicación actual"
          className="flex items-center gap-1 rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
        >
          {locating ? "Ubicando…" : "🎯"}
        </button>
      </form>

      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}

      {open && results.length > 0 && (
        <ul className="absolute z-[1200] mt-1 max-h-64 w-full overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-lg">
          {results.map((result, index) => (
            <li key={`${result.lat}-${result.lng}-${index}`}>
              <button
                type="button"
                onClick={() => choose(result)}
                className="block w-full px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
              >
                {result.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

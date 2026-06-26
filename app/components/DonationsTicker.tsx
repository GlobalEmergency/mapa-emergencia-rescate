"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Heart } from "lucide-react";
import { formatDonationUsd, type Donation, type DonationStats } from "@/lib/donation-shared";

const POLL_INTERVAL_MS = 7000;

interface DonationsResponse {
  stats: DonationStats;
  recent: Donation[];
}

function formatCount(count: number): string {
  return new Intl.NumberFormat("es-VE").format(count);
}

function DonationMarqueeItem({
  donation,
  variant,
}: {
  donation: Donation;
  variant: "default" | "hero";
}) {
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-2 px-4 text-sm font-medium ${
        variant === "hero" ? "text-white/90" : "text-violet-900"
      }`}
    >
      <Heart
        aria-hidden
        className={`h-3.5 w-3.5 ${
          variant === "hero"
            ? "fill-amber-300 text-amber-300"
            : "fill-violet-500 text-violet-500"
        }`}
      />
      <span className="whitespace-nowrap">
        {donation.name} donó {formatDonationUsd(donation.amountCents)}
      </span>
    </span>
  );
}

export default function DonationsTicker({
  variant = "default",
}: {
  variant?: "default" | "hero";
}) {
  const [data, setData] = useState<DonationsResponse | null>(null);

  const fetchDonations = useCallback(async () => {
    try {
      const res = await fetch("/api/donations", { cache: "no-cache" });
      if (!res.ok) return;
      setData(await res.json());
    } catch {
      /* reintenta en el siguiente ciclo */
    }
  }, []);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;

    const start = () => {
      if (interval) return;
      fetchDonations();
      interval = setInterval(fetchDonations, POLL_INTERVAL_MS);
    };

    const stop = () => {
      if (interval) clearInterval(interval);
      interval = null;
    };

    const onVisibility = () => {
      if (document.visibilityState === "visible") start();
      else stop();
    };

    onVisibility();
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      stop();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [fetchDonations]);

  const items = useMemo(() => {
    const recent = data?.recent ?? [];
    if (recent.length === 0) return [];
    return [...recent, ...recent];
  }, [data?.recent]);

  const stats = data?.stats;
  const hasDonations = (stats?.count ?? 0) > 0;

  const isHero = variant === "hero";

  return (
    <section
      aria-label="Muro de donaciones"
      className={
        isHero
          ? "relative z-10 w-full border-t border-white/15 bg-black/45 backdrop-blur-md"
          : "border-b border-violet-100 bg-gradient-to-r from-violet-50 via-white to-amber-50"
      }
    >
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <p
          className={`text-sm font-semibold ${
            isHero ? "text-white" : "text-violet-900"
          }`}
        >
          {hasDonations ? (
            <>
              <span aria-hidden className="mr-1">
                💜
              </span>
              {formatCount(stats!.count)} {stats!.count === 1 ? "persona ha donado" : "personas han donado"}
              {" · "}
              {formatDonationUsd(stats!.totalCents)} recaudados
            </>
          ) : (
            "Sé la primera persona en apoyar esta plataforma de rescate."
          )}
        </p>
        {hasDonations && (
          <p
            className={`text-xs ${isHero ? "text-white/70" : "text-violet-700/80"}`}
          >
            Actualizado en tiempo real
          </p>
        )}
      </div>

      {items.length > 0 && (
        <div
          className={`donations-marquee overflow-hidden py-2 ${
            isHero ? "border-t border-white/10" : "border-t border-violet-100/80"
          }`}
        >
          <div className="donations-marquee__track flex w-max items-center">
            {items.map((donation, index) => (
              <DonationMarqueeItem
                key={`${donation.id}-${index}`}
                donation={donation}
                variant={variant}
              />
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

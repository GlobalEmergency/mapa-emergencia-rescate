"use client";

import { useEffect, useState } from "react";

export type MonthlyDonation = {
  raisedCents: number;
  goalCents: number;
};

export function useDonationMonthly(refreshKey?: unknown) {
  const [monthly, setMonthly] = useState<MonthlyDonation | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/donations", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { monthly?: MonthlyDonation } | null) => {
        if (!cancelled && data?.monthly) {
          setMonthly(data.monthly);
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  return monthly;
}

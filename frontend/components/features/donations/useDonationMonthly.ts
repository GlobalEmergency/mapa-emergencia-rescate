"use client";

import { useDonationMonthly as useDonationMonthlyQuery } from "@/hooks/donations";

export type { MonthlyDonation } from "@/hooks/donations";

/**
 * Compat: misma firma `(refreshKey?) => MonthlyDonation | null` que el poller
 * manual previo. El refresh ya NO depende de `refreshKey`: la mutación de
 * donación invalida `qk.donations.all` y TanStack Query re-fetchea solo. El
 * parámetro se conserva para no tocar los call sites.
 */
export function useDonationMonthly(_refreshKey?: unknown) {
  const { data } = useDonationMonthlyQuery();
  return data ?? null;
}

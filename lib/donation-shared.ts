export const PAYPAL_DONATION_URL =
  "https://www.paypal.com/ncp/payment/ZSSSATY2E654Y";

export const MIN_DONATION_CENTS = 100;
export const MAX_DONATION_CENTS = 1_000_000;

export interface Donation {
  id: string;
  name: string;
  amountCents: number;
  createdAt: number;
}

export interface DonationStats {
  count: number;
  totalCents: number;
  last24hCount: number;
  last24hCents: number;
}

export function validateDonationInput(input: {
  name?: unknown;
  amountCents?: unknown;
}): { ok: true; name: string; amountCents: number } | { ok: false; error: string } {
  const name = typeof input.name === "string" ? input.name.trim() : "";
  if (name.length < 1 || name.length > 40) {
    return { ok: false, error: "El nombre debe tener entre 1 y 40 caracteres." };
  }

  const amountCents =
    typeof input.amountCents === "number"
      ? input.amountCents
      : Number.parseInt(String(input.amountCents ?? ""), 10);

  if (!Number.isInteger(amountCents)) {
    return { ok: false, error: "El monto debe ser un número entero en centavos." };
  }

  if (amountCents < MIN_DONATION_CENTS || amountCents > MAX_DONATION_CENTS) {
    return {
      ok: false,
      error: `El monto debe estar entre USD ${MIN_DONATION_CENTS / 100} y USD ${MAX_DONATION_CENTS / 100}.`,
    };
  }

  return { ok: true, name, amountCents };
}

export function formatDonationUsd(amountCents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: amountCents % 100 === 0 ? 0 : 2,
  }).format(amountCents / 100);
}

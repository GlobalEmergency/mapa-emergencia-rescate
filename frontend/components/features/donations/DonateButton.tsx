"use client";

import { useCallback, useEffect, useId, useState } from "react";
import { createPortal } from "react-dom";
import { HandCoins } from "lucide-react";
import {
  MAX_DONATION_CENTS,
  MIN_DONATION_CENTS,
  formatDonationUsd,
} from "@/lib/donation-shared";
import { useCreateDonation } from "@/hooks/donations";
import { trackEvent } from "@/lib/openpanel";
import { useTurnstile } from "@/hooks/useTurnstile";

const SUGGESTED_AMOUNTS = [500, 1000, 2500, 5000, 10000] as const;

type DonateNavButtonProps = {
  variant: "desktop" | "sheet";
  onAfterDonate?: () => void;
};

export function DonateModal({
  open,
  onClose,
  onSuccess,
}: {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const titleId = useId();
  const [mounted, setMounted] = useState(false);
  const [name, setName] = useState("");
  const [selectedCents, setSelectedCents] = useState<number>(2500);
  const [customMode, setCustomMode] = useState(false);
  const [customAmount, setCustomAmount] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const createDonation = useCreateDonation();
  const { mountRef: turnstileMount, getToken: turnstileGetToken } = useTurnstile();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) {
      setName("");
      setSelectedCents(2500);
      setCustomMode(false);
      setCustomAmount("");
      setSubmitting(false);
      setError(null);
      setSuccessMessage(null);
    }
  }, [open]);

  const resolveAmountCents = useCallback((): number | null => {
    if (customMode) {
      const dollars = Number.parseFloat(customAmount.replace(",", "."));
      if (!Number.isFinite(dollars)) return null;
      return Math.round(dollars * 100);
    }
    return selectedCents;
  }, [customAmount, customMode, selectedCents]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    const amountCents = resolveAmountCents();
    if (amountCents === null) {
      setError("Ingresa un monto válido.");
      return;
    }

    setSubmitting(true);
    try {
      // Token FRESCO de Turnstile para este envío (se resetea tras leerlo).
      const turnstileToken = await turnstileGetToken();
      const data = await createDonation.mutateAsync({ name, amountCents, turnstileToken });

      trackEvent("donation_intent", { amountCents });

      if (data.paypalUrl) {
        window.open(data.paypalUrl, "_blank", "noopener,noreferrer");
      }

      setSuccessMessage("Gracias. Te redirigimos a PayPal para completar tu donación.");
      onSuccess();

      window.setTimeout(() => {
        onClose();
      }, 1800);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al registrar la donación.");
      setSubmitting(false);
    }
  };

  if (!open || !mounted) return null;

  const previewCents = resolveAmountCents();

  return createPortal(
    <div
      className="fixed inset-0 z-[2000] flex items-end justify-center bg-slate-900/60 p-4 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl sm:p-6"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 id={titleId} className="text-lg font-bold text-slate-900">
              Donar ahora
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              Tu apoyo ayuda a mantener esta plataforma de rescate activa.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-slate-100 text-xl text-slate-500 hover:bg-slate-200"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="donation-name"
              className="mb-1 block text-sm font-medium text-slate-700"
            >
              Tu nombre o apodo
            </label>
            <input
              id="donation-name"
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              maxLength={40}
              autoFocus
              placeholder="Ej.: María G."
              className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-100"
              required
            />
          </div>

          <div>
            <p className="mb-2 text-sm font-medium text-slate-700">Monto (USD)</p>
            <div className="flex flex-wrap gap-2">
              {SUGGESTED_AMOUNTS.map((amountCents) => (
                <button
                  key={amountCents}
                  type="button"
                  onClick={() => {
                    setCustomMode(false);
                    setSelectedCents(amountCents);
                  }}
                  className={`rounded-lg border px-3 py-2 text-sm font-semibold transition ${
                    !customMode && selectedCents === amountCents
                      ? "border-amber-500 bg-amber-50 text-amber-900"
                      : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
                  }`}
                >
                  {formatDonationUsd(amountCents)}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setCustomMode(true)}
                className={`rounded-lg border px-3 py-2 text-sm font-semibold transition ${
                  customMode
                    ? "border-amber-500 bg-amber-50 text-amber-900"
                    : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
                }`}
              >
                Otro
              </button>
            </div>

            {customMode && (
              <div className="mt-3">
                <label htmlFor="donation-custom-amount" className="sr-only">
                  Monto personalizado en USD
                </label>
                <div className="relative">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-slate-500">
                    $
                  </span>
                  <input
                    id="donation-custom-amount"
                    type="number"
                    min={MIN_DONATION_CENTS / 100}
                    max={MAX_DONATION_CENTS / 100}
                    step="0.01"
                    value={customAmount}
                    onChange={(event) => setCustomAmount(event.target.value)}
                    placeholder="25.00"
                    className="w-full rounded-lg border border-slate-300 py-2.5 pl-7 pr-3 text-sm outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-100"
                    required
                  />
                </div>
              </div>
            )}
          </div>

          <p className="text-xs leading-relaxed text-slate-500">
            Tu donación se procesará de forma segura. Al continuar serás
            redirigido a PayPal para completar el pago.
          </p>

          {previewCents !== null && previewCents >= MIN_DONATION_CENTS && (
            <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-900">
              Vas a donar {formatDonationUsd(previewCents)}
            </p>
          )}

          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          )}

          {successMessage && (
            <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
              {successMessage}
            </p>
          )}

          <div ref={turnstileMount} className="flex justify-center empty:hidden" />

          <button
            type="submit"
            disabled={submitting || Boolean(successMessage)}
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-amber-500 px-4 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-amber-600 disabled:opacity-60"
          >
            <HandCoins aria-hidden className="h-4 w-4" strokeWidth={2.2} />
            {submitting ? "Registrando…" : "Donar con PayPal"}
          </button>
        </form>
      </div>
    </div>,
    document.body,
  );
}

export function DonateNavButton({ variant, onAfterDonate }: DonateNavButtonProps) {
  const [open, setOpen] = useState(false);

  const openModal = useCallback(() => {
    onAfterDonate?.();
    setOpen(true);
  }, [onAfterDonate]);

  if (variant === "desktop") {
    return (
      <>
        <button
          type="button"
          onClick={openModal}
          aria-label="Donar ahora"
          title="Donar ahora"
          className="inline-flex min-h-9 shrink-0 items-center justify-center gap-1 rounded-lg border border-amber-300 bg-amber-50 px-1.5 py-1.5 text-xs font-semibold text-amber-950 shadow-sm transition hover:border-amber-400 hover:bg-amber-100 lg:gap-1.5 lg:px-2 lg:text-[13px] xl:px-2.5"
        >
          <HandCoins aria-hidden className="h-4 w-4 shrink-0" strokeWidth={2.2} />
          <span className="sr-only lg:not-sr-only">Donar</span>
        </button>
        <DonateModal open={open} onClose={() => setOpen(false)} onSuccess={() => {}} />
      </>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={openModal}
        className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-950 transition hover:bg-amber-100"
      >
        <HandCoins aria-hidden className="h-4 w-4" strokeWidth={2.2} />
        Donar ahora
      </button>
      <DonateModal open={open} onClose={() => setOpen(false)} onSuccess={() => {}} />
    </>
  );
}

"use client";

import { useEffect, useState } from "react";
import {
  PLATFORM_MONTHLY_EXPENSES,
  STRIPE_DONATION_URL,
  formatDonationUsd,
} from "@/lib/donation-shared";
import { trackEvent } from "@/lib/openpanel";
import { useDonationMonthly } from "@/components/features/donations/useDonationMonthly";

type Props = {
  titleId?: string;
  refreshKey?: unknown;
};

function StripeMark({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden fill="currentColor">
      <path d="M13.3 11.2c0-.75-.6-1.05-1.65-1.05-1.75 0-3.75.5-5.4 1.35V6.3c1.85-.8 3.85-1.2 5.85-1.2 3.6 0 5.65 1.5 5.65 4.05 0 5.55-7.65 4.65-7.65 7.35 0 .65.55 1 1.45 1 1.55 0 3.55-.45 5.15-1.2v4.15c-1.75.75-3.65 1.15-5.65 1.15-3.65 0-5.85-1.55-5.85-4.25 0-5.85 7.65-4.75 7.65-7.55z" />
    </svg>
  );
}

export default function PlatformDonatePanel({
  titleId = "donate-panel-title",
  refreshKey,
}: Props) {
  const [showExpenses, setShowExpenses] = useState(false);
  const monthly = useDonationMonthly(refreshKey);

  useEffect(() => {
    if (refreshKey === false) setShowExpenses(false);
  }, [refreshKey]);
  const raisedCents = monthly?.raisedCents ?? 0;
  const goalCents = monthly?.goalCents ?? 80_000;
  const progressPct =
    goalCents > 0 ? Math.min(100, Math.round((raisedCents / goalCents) * 100)) : 0;
  const pendingCents = Math.max(0, goalCents - raisedCents);
  const stripeEnabled = STRIPE_DONATION_URL.length > 0;
  const expensesTotalCents = PLATFORM_MONTHLY_EXPENSES.reduce(
    (sum, item) => sum + item.amountCents,
    0,
  );

  return (
    <>
      <div className="e-donate-tooltip__head">
        <p id={titleId} className="e-donate-tooltip__title">
          Ayúdanos a seguir activos
        </p>
        <button
          type="button"
          className="e-donate-tooltip__expenses"
          aria-expanded={showExpenses}
          onClick={() => {
            setShowExpenses((value) => {
              const next = !value;
              trackEvent("donation_expenses_toggled", { open: next });
              return next;
            });
          }}
        >
          {showExpenses ? "Ocultar" : "Ver gastos"}
        </button>
      </div>

      <div className="e-donate-tooltip__amount-row">
        <span className="e-donate-tooltip__label">Recaudado este mes</span>
        <span className="e-donate-tooltip__amount">
          {formatDonationUsd(raisedCents)}{" "}
          <span className="e-donate-tooltip__goal">/ {formatDonationUsd(goalCents)}</span>
        </span>
      </div>

      <div
        className="e-donate-tooltip__progress"
        role="progressbar"
        aria-valuenow={progressPct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Progreso de la meta mensual"
      >
        <div
          className="e-donate-tooltip__progress-fill"
          style={{ width: `${progressPct}%` }}
        />
      </div>

      <p className="e-donate-tooltip__meta">
        {progressPct}% de la meta mensual · {formatDonationUsd(pendingCents)} pendientes
      </p>

      {showExpenses && (
        <div className="e-donate-tooltip__breakdown">
          <p className="e-donate-tooltip__breakdown-title">¿En qué se usa el dinero?</p>
          <ul className="e-donate-tooltip__breakdown-list">
            {PLATFORM_MONTHLY_EXPENSES.map((item) => (
              <li key={item.label} className="e-donate-tooltip__breakdown-row">
                <span>{item.label}</span>
                <span>{formatDonationUsd(item.amountCents)}/mes</span>
              </li>
            ))}
          </ul>
          <div className="e-donate-tooltip__breakdown-total">
            <span>Total</span>
            <span>{formatDonationUsd(expensesTotalCents)}/mes</span>
          </div>
        </div>
      )}

      {stripeEnabled ? (
        <a
          href={STRIPE_DONATION_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="e-donate-tooltip__stripe"
          onClick={() =>
            trackEvent("donation_provider_clicked", { provider: "stripe", progressPct })
          }
        >
          <StripeMark className="h-5 w-5 shrink-0" />
          Donar con tarjeta (Stripe)
        </a>
      ) : (
        <button
          type="button"
          disabled
          className="e-donate-tooltip__stripe e-donate-tooltip__stripe--disabled"
          title="Configura NEXT_PUBLIC_STRIPE_DONATION_URL para activar pagos con tarjeta"
        >
          <StripeMark className="h-5 w-5 shrink-0" />
          Donar con tarjeta (Stripe)
        </button>
      )}

      <p className="e-donate-tooltip__footer">
        Pago seguro · Puedes donar desde cualquier país
      </p>
    </>
  );
}

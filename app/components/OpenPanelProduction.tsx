"use client";

import { OpenPanelComponent } from "@openpanel/nextjs";

const PRODUCTION_HOST =
  process.env.NEXT_PUBLIC_OPENPANEL_PRODUCTION_HOST ?? "terremotovenezuela.app";

export default function OpenPanelProduction({
  clientId,
}: {
  clientId: string;
}) {
  if (typeof window === "undefined") return null;
  if (window.location.hostname !== PRODUCTION_HOST) return null;

  return (
    <OpenPanelComponent
      apiUrl="/api/op"
      scriptUrl="/api/op/op1.js"
      clientId={clientId}
      trackScreenViews
      trackOutgoingLinks
      trackAttributes
    />
  );
}

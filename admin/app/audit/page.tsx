import type { Metadata } from "next";
import { Shell } from "../shell";
import { AuditAdmin } from "./audit-admin";

export const metadata: Metadata = {
  title: "Auditoría — Panel de administración",
  robots: { index: false },
};

export default function AuditPage() {
  return (
    <Shell>
      <AuditAdmin />
    </Shell>
  );
}

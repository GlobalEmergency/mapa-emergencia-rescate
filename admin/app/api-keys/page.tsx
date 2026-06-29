import type { Metadata } from "next";
import { Shell } from "../shell";
import { ApiKeysAdmin } from "@/src/contexts/api-keys/api-keys-admin";

export const metadata: Metadata = {
  robots: { index: false },
};

export default function Page() {
  return (
    <Shell>
      <ApiKeysAdmin />
    </Shell>
  );
}

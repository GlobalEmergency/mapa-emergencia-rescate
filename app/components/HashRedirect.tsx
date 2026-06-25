"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { LEGACY_HASH_ROUTES } from "@/lib/navigation";

/** Redirige anclas legacy (/#mapa, /#desaparecidas, …) a las nuevas rutas. */
export default function HashRedirect() {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const hash = window.location.hash.replace(/^#/, "");
    if (!hash) return;

    const target = LEGACY_HASH_ROUTES[hash];
    if (!target) return;

    const [path, anchor] = target.split("#");
    if (pathname === path) {
      if (anchor) {
        document.getElementById(anchor)?.scrollIntoView({ behavior: "smooth" });
      }
      window.history.replaceState(null, "", target);
      return;
    }

    router.replace(target);
  }, [pathname, router]);

  return null;
}

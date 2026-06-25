"use client";

import { usePathname } from "next/navigation";

// Cinta de luto en memoria de las víctimas del terremoto.
// Solo se muestra en las páginas de cara al público, no en el panel /admin.
export default function MourningRibbon() {
  const pathname = usePathname();

  if (pathname?.startsWith("/admin")) {
    return null;
  }

  return (
    <img
      src="/luto.png"
      alt="En memoria de las víctimas del terremoto"
      title="En memoria de las víctimas del terremoto"
      className="fixed right-3 top-3 z-[1500] block h-9 w-auto drop-shadow-sm"
    />
  );
}

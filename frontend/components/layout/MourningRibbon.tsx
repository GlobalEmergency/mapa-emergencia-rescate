"use client";

import Image from "next/image";
import { usePathname } from "next/navigation";

// Cinta de luto en memoria de las víctimas del terremoto.
// Solo se muestra en las páginas de cara al público, no en el panel /admin.
export default function MourningRibbon() {
  const pathname = usePathname();

  if (pathname?.startsWith("/admin")) {
    return null;
  }

  return (
    <Image
      src="/luto.png"
      alt="En memoria de las víctimas del terremoto"
      title="En memoria de las víctimas del terremoto"
      width={18}
      height={36}
      className="pointer-events-none fixed right-3 top-3 z-[9999] block h-9 w-auto drop-shadow-sm"
    />
  );
}

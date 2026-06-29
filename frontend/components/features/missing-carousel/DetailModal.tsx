"use client";

import dynamic from "next/dynamic";

/**
 * Modal de detalle de persona, code-split. El overlay de detalle (con su form
 * de "marcar encontrada", compartir, etc.) es pesado y solo se abre al tocar una
 * tarjeta: lo cargamos con next/dynamic(ssr:false) para sacarlo del bundle
 * inicial. Re-exporta MissingPersonDetail TAL CUAL (misma UI/props/contrato).
 */
const DetailModal = dynamic(
  () => import("@/components/features/missing/MissingPersonDetail"),
  { ssr: false },
);

export default DetailModal;

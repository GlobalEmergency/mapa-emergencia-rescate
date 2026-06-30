import { Router } from "express";
import { asyncHandler, rateLimit, requireHuman, validate } from "@/middleware";
import type { PublishNeed } from "../../application/publish-need";
import { makePublishNeedHandler, publishNeedBody } from "./needs-controller";

// POST /api/needs lo llama el formulario ciudadano, así que es anónimo por
// necesidad: se protege con Turnstile + rate-limit. A propósito NO lleva bloque
// @swagger — es un proxy de escritura a ResponseGrid con credencial de servicio y
// no publicamos su contrato en /api/docs como superficie de abuso.
export function createNeedsRouter(publishNeed: PublishNeed): Router {
  const router = Router();
  router.post(
    "/",
    rateLimit({ scope: "needs:create", limit: 8 }),
    requireHuman,
    validate({ body: publishNeedBody }),
    asyncHandler(makePublishNeedHandler(publishNeed)),
  );
  return router;
}

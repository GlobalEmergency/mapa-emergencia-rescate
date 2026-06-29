import type { Router } from "express";
import { env } from "@/config/env";
import { ListCollectionCenters } from "./application/list-collection-centers";
import { ResponseGridClient } from "./infrastructure/responsegrid/responsegrid-client";
import { ResponseGridCollectionCenterProvider } from "./infrastructure/responsegrid/responsegrid-collection-center-provider";
import { CachedCollectionCenterProvider } from "./infrastructure/cached-collection-center-provider";
import { createAcopioRouter } from "./interface/http/acopio-router";

const CACHE_TTL_MS = 120_000;

/** Composition root: único punto que lee env y cablea las piezas concretas. */
export function buildAcopioRouter(): Router {
  const responseGrid = new ResponseGridClient({
    baseUrl: env.RESPONSEGRID_API_URL,
    emergencySlug: env.RESPONSEGRID_EMERGENCY_SLUG,
  });

  const provider = new CachedCollectionCenterProvider(
    new ResponseGridCollectionCenterProvider(responseGrid),
    CACHE_TTL_MS,
  );

  return createAcopioRouter(new ListCollectionCenters(provider));
}

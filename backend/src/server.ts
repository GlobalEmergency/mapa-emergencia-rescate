import express from "express";
import cookieParser from "cookie-parser";
import swaggerUi from "swagger-ui-express";
import { env, corsOrigins } from "@/config/env";
import { errorHandler } from "@/middleware";
import { mountPublicApi } from "@/public-api";
import { buildOpenApiSpec } from "@/lib/swagger";
import { missingRouter } from "@/routes/missing";
import { reportsRouter } from "@/routes/reports";
import { chatRouter } from "@/routes/chat";
import { hospitalsRouter } from "@/routes/hospitals";
import { earthquakesRouter } from "@/routes/earthquakes";
import { donationsRouter } from "@/routes/donations";
import { patientsRouter } from "@/routes/patients";
import { geocodeRouter } from "@/routes/geocode";
import { geoRouter } from "@/routes/geo";
import { acopioRouter } from "@/modules/acopio";
import { needsRouter } from "@/modules/needs";
import { psychologyHelpRouter } from "@/routes/psychology-help";
import { contactRouter } from "@/routes/contact";
import { hubRouter } from "@/routes/hub";
import { syncRouter } from "@/routes/sync";
import { adminRouter } from "@/routes/admin";
import { opRouter } from "@/routes/op";

const app = express();

// Detrás del LB/Cloudflare: confiamos en el proxy para req.ip (fallback de
// clientIp). La cabecera de confianza real es cf-connecting-ip (ver client-ip.ts).
app.set("trust proxy", true);
app.disable("x-powered-by");

// CORS: solo orígenes del frontend permitidos. El frontend manda credenciales
// solo si hace falta; por ahora GET/POST públicos + cabeceras de admin/turnstile.
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin && corsOrigins.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
    // El frontend usa fetch con credentials:"include" → el browser exige este
    // header o bloquea la respuesta. Origin es reflejado (allowlist), nunca "*".
    res.setHeader("Access-Control-Allow-Credentials", "true");
    res.setHeader("Access-Control-Allow-Methods", "GET,POST,PATCH,DELETE,OPTIONS");
    res.setHeader(
      "Access-Control-Allow-Headers",
      // openpanel-client-id: el SDK de OpenPanel lo manda en cada POST /api/op/track.
      // Sin él en la allowlist, el preflight no autoriza el POST y el browser lo
      // bloquea (TypeError: Failed to fetch) → analítica sin eventos. Ver routes/op.ts.
      "Content-Type, If-None-Match, x-admin-token, cf-turnstile-token, authorization, openpanel-client-id",
    );
  }
  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }
  next();
});

// Parser JSON por defecto (256kb). CRÍTICO: NO debe correr en las rutas que
// aceptan fotos base64 (~1.4MB) — esas montan su propio express.json(2mb) a nivel
// de ruta. Si el parser global corriera primero, consumiría el stream y cortaría
// el body a 256kb antes de que el parser de 2mb lo viera (413 en POST con foto).
// Por eso lo saltamos en los paths de creación con foto.
const PHOTO_POST_PATHS = [
  "/api/missing",
  "/api/reports",
];
const globalJson = express.json({ limit: "256kb" });
app.use((req, res, next) => {
  // Solo saltamos el POST exacto a esos paths (sus subrutas GET /:id/photo no
  // tienen body). El parser de 2mb de la ruta se encarga.
  if (req.method === "POST" && PHOTO_POST_PATHS.includes(req.path)) return next();
  return globalJson(req, res, next);
});

// Lee cookies (sesión httpOnly de api/public/*). Antes de las rutas.
app.use(cookieParser());

// Healthcheck para el LB de k8s (readinessProbe).
app.get("/api/readyz", (_req, res) => res.json({ ok: true }));

// --- Documentación OpenAPI (Swagger) ---
// Generada de los bloques @swagger de cada route. /api/openapi.json = spec cruda,
// /api/docs = Swagger UI interactivo. La spec se construye una vez al arrancar.
const openapiSpec = buildOpenApiSpec();
app.get("/api/openapi.json", (_req, res) => res.json(openapiSpec));
app.use("/api/docs", swaggerUi.serve, swaggerUi.setup(openapiSpec));

// --- Superficie autenticada para integraciones + admin (api/public/*) ---
// Mínimo: autenticación (JWT cookie o Bearer) + rate-limit. SIN Turnstile (no es
// interacción humana de navegador). Capacidades/auditoría por endpoint, todo
// generado por la fábrica CRUD a partir de la config de cada recurso.
mountPublicApi(app);

// Rutas. (Reference endpoint ahora; el resto las añade el workflow de port.)
app.use("/api/missing", missingRouter);
app.use("/api/reports", reportsRouter);
app.use("/api/chat", chatRouter);
app.use("/api/hospitals", hospitalsRouter);
app.use("/api/earthquakes", earthquakesRouter);
app.use("/api/donations", donationsRouter);
app.use("/api/patients", patientsRouter);
app.use("/api/geocode", geocodeRouter);
app.use("/api/geo", geoRouter);
app.use("/api/acopio", acopioRouter);
app.use("/api/needs", needsRouter);
app.use("/api/stats/psychology-help", psychologyHelpRouter);
app.use("/api/contact", contactRouter);
app.use("/api/hub", hubRouter);
app.use("/api/sync", syncRouter);
app.use("/api/admin", adminRouter);
app.use("/api/op", opRouter);

// 404 JSON consistente para /api/*.
app.use("/api", (_req, res) => res.status(404).json({ error: "Ruta no encontrada." }));

// Error handler central (siempre el último middleware).
app.use(errorHandler);

// Exporta la app para tests (supertest la usa sin abrir un puerto). El listen()
// solo corre cuando este módulo es el entrypoint (no al importarlo en un test).
export { app };

import { fileURLToPath } from "url";
const isEntrypoint = process.argv[1] === fileURLToPath(import.meta.url);
if (isEntrypoint) {
  app.listen(env.PORT, () => {
    console.log(`mapa-backend escuchando en :${env.PORT}`);
  });
}

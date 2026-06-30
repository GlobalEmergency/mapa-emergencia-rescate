import express from "express";
import cookieParser from "cookie-parser";
import swaggerUi from "swagger-ui-express";
import { sql } from "drizzle-orm";
import { getDb } from "@/db";
import { env, corsOrigins } from "@/config/env";
import { errorHandler } from "@/middleware";
import { metricsMiddleware, startMetricsServer } from "@/lib/metrics";
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
      // Headers openpanel-*: el SDK de OpenPanel los manda en CADA POST /api/op/track.
      // El browser exige que TODOS los headers no-safelisted estén en esta allowlist
      // o el preflight no autoriza el POST y lo bloquea (TypeError: Failed to fetch)
      // → analítica sin eventos. El SDK envía siempre client-id + sdk-name +
      // sdk-version (y opcionalmente client-secret/pending-revenues). Ver routes/op.ts.
      "Content-Type, If-None-Match, x-admin-token, cf-turnstile-token, authorization, " +
        "openpanel-client-id, openpanel-client-secret, openpanel-sdk-name, " +
        "openpanel-sdk-version, openpanel-pending-revenues",
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

// Instrumentación HTTP (Prometheus). Va ANTES de las rutas para medir TODAS
// (incluidas 404). Mide al `finish` de la respuesta; no toca el body. Ver
// lib/metrics.ts. El endpoint /metrics NO vive aquí: se sirve en un servidor
// aparte en otro puerto (startMetricsServer), que el LB público NO enruta, así
// /metrics nunca es accesible desde internet. Alloy (k3s) lo scrapea pod-a-pod.
app.use(metricsMiddleware);

// --- Health checks (probes de k8s + smoke post-deploy) ---
// DOS endpoints separados a propósito (ver infra/k8s/deployment.yaml):
//   - /api/healthz = LIVENESS: ¿el proceso responde? SIN I/O. Un fallo aquí
//     significa "proceso colgado" -> kubelet reinicia el pod.
//   - /api/readyz  = READINESS: ¿puede servir tráfico? Chequea la DB. Un fallo
//     aquí saca el pod de rotación (LB/readinessProbe) pero NO lo reinicia, así
//     un blip de DB drena en vez de entrar en restart-loop.
// Ningún endpoint declara rate-limit: los pollean las probes y el LB cada pocos
// segundos (la regla local/require-rate-limit solo aplica a routes/ + public-api/).
app.get("/api/healthz", (_req, res) => res.json({ ok: true }));

// READINESS: SELECT 1 con timeout corto. 200 si la DB responde, 503 si no.
// Nunca expone el error real (podría filtrar DATABASE_URL); loguea genérico.
const READYZ_DB_TIMEOUT_MS = 2_000;
app.get("/api/readyz", async (_req, res) => {
  // getDb() es síncrono (crea el Pool sin I/O; la conexión es perezosa).
  const db = getDb();
  // Timeout con clearTimeout en finally: si el query gana la carrera, no dejamos
  // un timer vivo ~2s por request.
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    await Promise.race([
      db.execute(sql`select 1`),
      new Promise((_resolve, reject) => {
        timer = setTimeout(() => reject(new Error("readyz: db timeout")), READYZ_DB_TIMEOUT_MS);
      }),
    ]);
    res.json({ ok: true });
  } catch {
    console.warn("readyz: db unreachable");
    res.status(503).json({ ok: false });
  } finally {
    clearTimeout(timer);
  }
});

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
  // Servidor de métricas APARTE, en otro puerto que el LB público no enruta.
  startMetricsServer();
}

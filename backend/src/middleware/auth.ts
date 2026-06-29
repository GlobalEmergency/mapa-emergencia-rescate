/**
 * Middleware de autenticación + autorización para `api/public/*`.
 *
 * Doble credencial (web + integraciones), normalizada a un mismo `req.user`:
 *   1) `Authorization: Bearer <jwt>`  — Postman / integraciones / (futuras) API keys.
 *   2) Cookie httpOnly de sesión       — el frontend web (credentials:include).
 * Se lee el header PRIMERO, luego la cookie. El endpoint no sabe cuál se usó.
 *
 * Patrón de uso de un endpoint autenticado de api/public/*:
 *   router.post("/",
 *     rateLimit({ scope: "report:create", limit: 60 }),
 *     requireCapability("report:create"),   // implica requireAuth
 *     validate({ body: createSchema }),
 *     asyncHandler(create),
 *   )
 *
 * `requireCapability` SIEMPRE autentica primero (deny-by-default): sin sesión
 * válida -> 401; con sesión pero sin la capacidad -> 403.
 */
import type { Request, RequestHandler } from "express";
import { unauthorized, forbidden } from "@/lib/errors";
import { env } from "@/config/env";
import { verifyToken } from "@/auth/jwt";
import { loadAuthUser, userHasCapability, type AuthUser } from "@/auth/resolve";

// Aumenta el tipo de Express Request con el usuario autenticado + cache de caps.
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthUser;
      capCache?: Map<string, boolean>;
    }
  }
}

/** Extrae el token: Authorization: Bearer ... primero, luego la cookie. */
function extractToken(req: Request): string | null {
  const auth = req.headers.authorization;
  if (auth && auth.startsWith("Bearer ")) return auth.slice(7).trim() || null;
  const cookies = (req as Request & { cookies?: Record<string, string> }).cookies;
  const fromCookie = cookies?.[env.AUTH_COOKIE_NAME];
  return fromCookie || null;
}

/**
 * Resuelve la sesión y cuelga `req.user` (sin fallar si no hay). Útil para
 * endpoints que adaptan su respuesta a autenticado/anónimo. NO bloquea.
 */
export const attachUser: RequestHandler = (req, _res, next) => {
  const token = extractToken(req);
  if (!token) return next();
  const payload = verifyToken(token);
  if (!payload) return next();
  loadAuthUser(payload.sub)
    .then((u) => {
      if (u) {
        req.user = u;
        req.capCache = new Map();
      }
      next();
    })
    .catch(next);
};

/** Exige sesión válida. 401 si no hay token/usuario. Cuelga `req.user`. */
export const requireAuth: RequestHandler = (req, _res, next) => {
  const token = extractToken(req);
  if (!token) return next(unauthorized("Se requiere autenticación."));
  const payload = verifyToken(token);
  if (!payload) return next(unauthorized("Sesión inválida o expirada."));
  loadAuthUser(payload.sub)
    .then((u) => {
      if (!u) return next(unauthorized("Usuario no encontrado o desactivado."));
      req.user = u;
      req.capCache = new Map();
      next();
    })
    .catch(next);
};

/**
 * Exige una capacidad concreta. Autentica primero (deny-by-default). El admin
 * semilla pasa siempre; el resto necesita la cap en su rol o un grant activo.
 */
export function requireCapability(capability: string): RequestHandler {
  return (req, res, next) => {
    // Reusa la cadena de requireAuth, luego checa la capacidad.
    requireAuth(req, res, (err?: unknown) => {
      if (err) return next(err);
      const user = req.user!;
      userHasCapability(user, capability, req.capCache)
        .then((ok) => {
          if (!ok) return next(forbidden("No tienes permiso para esta acción."));
          next();
        })
        .catch(next);
    });
  };
}

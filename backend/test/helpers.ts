/**
 * Helpers de test de integración. Levantan la app real (supertest, sin puerto)
 * contra el Postgres/Valkey LOCAL, siembran el motor de auth y fabrican usuarios
 * con roles/capacidades concretos + sus tokens. Espeja el enfoque de Argo
 * (test_authz_matrix): se asierta AUTORIZACIÓN, no lógica de negocio.
 *
 * Requiere el stack local arriba (docker compose up): DATABASE_URL + VALKEY_URL.
 * El env de test se fija aquí ANTES de importar la app (config/env lee process.env
 * al cargar).
 */
import { randomUUID } from "crypto";

// --- Env de test (debe fijarse ANTES de importar la app / config/env) ---
process.env.NODE_ENV = process.env.NODE_ENV ?? "test";
process.env.DATABASE_URL =
  process.env.DATABASE_URL ?? "postgres://mapa_app:localdev@localhost:5432/app";
process.env.JWT_SECRET = process.env.JWT_SECRET ?? "test-jwt-secret-not-for-prod-0123456789";
process.env.VALKEY_URL = process.env.VALKEY_URL ?? "redis://localhost:6379";
// El suite golpea los mismos endpoints muchas veces desde la misma IP → sin esto
// los rate-limits dispararían 429 y harían flaky la matriz. Solo en test.
process.env.RATE_LIMIT_DISABLED = "1";
// Sin SMTP en test → invite devuelve el link, reset loguea el OTP (no se manda).

/** Token JWT para un userId (firma con el mismo JWT_SECRET de la app). */
export async function tokenFor(userId: string): Promise<string> {
  const { signToken } = await import("@/auth/jwt");
  return signToken(userId);
}

/** Garantiza que el catálogo + rol admin existan (idempotente). */
export async function ensureSeed(): Promise<void> {
  const { seedAuth } = await import("@/auth/seed");
  await seedAuth();
}

interface MadeUser {
  id: string;
  email: string;
  roleId: string | null;
}

/**
 * Crea un rol con un conjunto exacto de capacidades + un usuario activo con ese
 * rol. Devuelve el user (con id) y su token. roleCaps=[] => rol sin permisos.
 */
export async function makeUserWithCaps(caps: string[]): Promise<MadeUser & { token: string }> {
  const { getDb, schema } = await import("@/db");
  const db = getDb();
  const now = Date.now();
  const roleId = randomUUID();
  const roleName = `test-role-${roleId.slice(0, 8)}`;
  await db.insert(schema.roles).values({
    id: roleId,
    name: roleName,
    description: "rol de test",
    isSystem: false,
    createdAt: now,
  });
  for (const c of caps) {
    await db
      .insert(schema.roleCapabilities)
      .values({ roleId, capabilityKey: c })
      .onConflictDoNothing();
  }
  const id = randomUUID();
  const email = `u-${id.slice(0, 8)}@test.local`;
  await db.insert(schema.users).values({
    id,
    email,
    name: "Test User",
    passwordHash: null,
    roleId,
    status: "active",
    createdAt: now,
  });
  const token = await tokenFor(id);
  return { id, email, roleId, token };
}

/** Crea el superadmin (rol semilla "admin") activo + token. */
export async function makeAdmin(): Promise<MadeUser & { token: string }> {
  const { getDb, schema } = await import("@/db");
  const { hashPassword } = await import("@/auth/password");
  const db = getDb();
  const { eq } = await import("drizzle-orm");
  const adminRole = await db
    .select({ id: schema.roles.id })
    .from(schema.roles)
    .where(eq(schema.roles.isSystem, true))
    .limit(1);
  const roleId = adminRole[0]!.id;
  const id = randomUUID();
  const email = `admin-${id.slice(0, 8)}@test.local`;
  await db.insert(schema.users).values({
    id,
    email,
    name: "Admin",
    passwordHash: await hashPassword("adminpass123"),
    roleId,
    status: "active",
    createdAt: Date.now(),
  });
  return { id, email, roleId, token: await tokenFor(id) };
}

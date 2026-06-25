const ADMIN_HEADER = "x-admin-token";

/**
 * Comparación de cadenas en tiempo constante para evitar ataques de tiempo.
 */
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}

export function isAdminConfigured(): boolean {
  return Boolean(process.env.ADMIN_PASSWORD);
}

/**
 * Valida que la contraseña proporcionada coincida con ADMIN_PASSWORD.
 */
export function isValidAdminPassword(password: string | null | undefined): boolean {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected || !password) return false;
  return safeEqual(password, expected);
}

/**
 * Valida la cabecera de admin de una petición entrante.
 */
export function isAdminRequest(request: Request): boolean {
  return isValidAdminPassword(request.headers.get(ADMIN_HEADER));
}

export { ADMIN_HEADER };

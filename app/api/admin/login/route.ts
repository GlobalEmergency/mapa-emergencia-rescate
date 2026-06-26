import { NextResponse } from "next/server";
import { isAdminConfigured, isValidAdminPassword } from "@/lib/admin";
import { readJson, bodyErrorResponse, BODY_LIMIT_SMALL } from "@/lib/body";
import { checkRateLimit, clientIp } from "@/lib/ratelimit";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!isAdminConfigured()) {
    return NextResponse.json(
      { error: "El acceso de administrador no está configurado en el servidor." },
      { status: 503 },
    );
  }

  // Anti-brute-force: limita los intentos de login por IP.
  if (!(await checkRateLimit(`login:${clientIp(request)}`, 5))) {
    return NextResponse.json(
      { error: "Demasiados intentos. Espera un momento e inténtalo de nuevo." },
      { status: 429, headers: { "Retry-After": "60" } },
    );
  }

  let body: { password?: string };
  try {
    body = await readJson(request, BODY_LIMIT_SMALL);
  } catch (e) {
    return bodyErrorResponse(e);
  }

  if (!isValidAdminPassword(body.password)) {
    return NextResponse.json(
      { error: "Contraseña incorrecta." },
      { status: 401 },
    );
  }

  return NextResponse.json({ ok: true });
}

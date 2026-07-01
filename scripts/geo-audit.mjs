#!/usr/bin/env node
/**
 * Auditoría GEO/SEO ligera y determinística (sin dependencias, solo Node) del
 * sitio público. Verifica señales de descubribilidad para buscadores y agentes
 * de IA: robots.txt, llms.txt/llms-full.txt, sitemap.xml y JSON-LD en páginas
 * clave. NO reemplaza una auditoría completa (p. ej. la skill `geo-audit`); es
 * un chequeo recurrente y barato que detecta regresiones entre auditorías
 * manuales.
 *
 * Uso:
 *   node scripts/geo-audit.mjs [URL_BASE]
 *   URL_BASE por defecto: https://terremotovenezuela.app (o $GEO_AUDIT_URL)
 *
 * Salida: reporte Markdown por stdout. Sale 1 si algún chequeo CRÍTICO falla
 * (útil para notar regresiones en CI), 0 si todo pasa o solo hay avisos.
 *
 * Ver docs/guides/ para el detalle de cada chequeo y la issue #204.
 */

const BASE_URL =
  process.argv[2] || process.env.GEO_AUDIT_URL || "https://terremotovenezuela.app";

// Bots de *entrenamiento* de IA que deben estar bloqueados (política del repo,
// ver app/robots.ts). No se listan los de *recuperación en vivo* (ChatGPT-User,
// PerplexityBot, etc.): esos deben poder acceder.
const AI_TRAINING_BOTS = [
  "GPTBot",
  "ClaudeBot",
  "CCBot",
  "Google-Extended",
  "Bytespider",
  "Amazonbot",
  "Applebot-Extended",
  "meta-externalagent",
];

// Páginas clave donde se espera encontrar JSON-LD específico. No se muestrean
// rutas dinámicas (hospitales/[id]) porque el slug cambia con los datos.
const JSONLD_PAGE_CHECKS = [
  { path: "/", expectTypes: ["Organization", "WebSite"] },
  { path: "/quienes-somos", expectTypes: ["FAQPage", "BreadcrumbList"] },
  { path: "/metodologia", expectTypes: ["Article", "BreadcrumbList"] },
  { path: "/acopio", expectTypes: ["ItemList"] },
];

/** @typedef {{ name: string, ok: boolean, critical: boolean, detail: string }} CheckResult */

/** @returns {Promise<CheckResult>} */
async function checkRobots() {
  const name = "robots.txt";
  try {
    const res = await fetch(`${BASE_URL}/robots.txt`);
    if (!res.ok) {
      return { name, ok: false, critical: true, detail: `HTTP ${res.status}` };
    }
    const text = await res.text();
    const missing = AI_TRAINING_BOTS.filter((bot) => !text.includes(bot));
    const hasSitemap = /sitemap:/i.test(text);
    if (missing.length > 0) {
      return {
        name,
        ok: false,
        critical: false,
        detail: `Faltan reglas para bots de entrenamiento de IA: ${missing.join(", ")}`,
      };
    }
    if (!hasSitemap) {
      return { name, ok: false, critical: false, detail: "No declara Sitemap:" };
    }
    return { name, ok: true, critical: false, detail: "OK — bots de entrenamiento bloqueados, sitemap declarado" };
  } catch (e) {
    return { name, ok: false, critical: true, detail: String(e) };
  }
}

/** @returns {Promise<CheckResult>} */
async function checkLlmsTxt(file, { requireSections } = {}) {
  const name = file;
  try {
    const res = await fetch(`${BASE_URL}/${file}`);
    if (!res.ok) {
      return { name, ok: false, critical: file === "llms.txt", detail: `HTTP ${res.status}` };
    }
    const text = await res.text();
    if (requireSections) {
      const hasH1 = /^# /m.test(text);
      const hasSummary = /^> /m.test(text);
      if (!hasH1 || !hasSummary) {
        return {
          name,
          ok: false,
          critical: false,
          detail: `Formato incompleto (H1: ${hasH1 ? "sí" : "NO"}, resumen: ${hasSummary ? "sí" : "NO"})`,
        };
      }
    }
    return { name, ok: true, critical: false, detail: `OK — ${text.length} bytes` };
  } catch (e) {
    return { name, ok: false, critical: false, detail: String(e) };
  }
}

/** @returns {Promise<CheckResult>} */
async function checkSitemap() {
  const name = "sitemap.xml";
  try {
    const res = await fetch(`${BASE_URL}/sitemap.xml`);
    if (!res.ok) {
      return { name, ok: false, critical: true, detail: `HTTP ${res.status}` };
    }
    const text = await res.text();
    const urlCount = (text.match(/<loc>/g) || []).length;
    if (!text.includes("<urlset") || urlCount === 0) {
      return { name, ok: false, critical: true, detail: "XML inválido o sin URLs" };
    }
    return { name, ok: true, critical: false, detail: `OK — ${urlCount} URLs` };
  } catch (e) {
    return { name, ok: false, critical: true, detail: String(e) };
  }
}

/** @returns {Promise<CheckResult>} */
async function checkJsonLd({ path, expectTypes }) {
  const name = `JSON-LD ${path}`;
  try {
    const res = await fetch(`${BASE_URL}${path}`);
    if (!res.ok) {
      return { name, ok: false, critical: false, detail: `HTTP ${res.status}` };
    }
    const html = await res.text();
    const missing = expectTypes.filter(
      (t) => !html.includes(`"@type":"${t}"`) && !html.includes(`"${t}"`),
    );
    if (missing.length > 0) {
      return {
        name,
        ok: false,
        critical: false,
        detail: `Faltan tipos: ${missing.join(", ")} (puede requerir un PR aún no mergeado)`,
      };
    }
    return { name, ok: true, critical: false, detail: `OK — ${expectTypes.join(", ")} presentes` };
  } catch (e) {
    return { name, ok: false, critical: false, detail: String(e) };
  }
}

async function main() {
  const checks = await Promise.all([
    checkRobots(),
    checkLlmsTxt("llms.txt", { requireSections: true }),
    checkLlmsTxt("llms-full.txt"),
    checkSitemap(),
    ...JSONLD_PAGE_CHECKS.map(checkJsonLd),
  ]);

  const lines = [];
  lines.push(`# Auditoría GEO/SEO automática`);
  lines.push("");
  lines.push(`**Sitio:** ${BASE_URL}  `);
  lines.push(`**Fecha:** ${new Date().toISOString()}`);
  lines.push("");
  lines.push("| Chequeo | Estado | Detalle |");
  lines.push("|---|---|---|");
  for (const c of checks) {
    const icon = c.ok ? "✅" : c.critical ? "🔴" : "🟡";
    lines.push(`| ${c.name} | ${icon} | ${c.detail} |`);
  }
  lines.push("");
  const criticalFailures = checks.filter((c) => !c.ok && c.critical);
  const warnings = checks.filter((c) => !c.ok && !c.critical);
  if (criticalFailures.length > 0) {
    lines.push(`⚠️ **${criticalFailures.length} chequeo(s) crítico(s) fallando.**`);
  } else if (warnings.length > 0) {
    lines.push(`ℹ️ Sin fallos críticos. ${warnings.length} aviso(s) — puede reflejar trabajo pendiente en el roadmap GEO (épica #205).`);
  } else {
    lines.push("✅ Todos los chequeos pasan.");
  }

  console.log(lines.join("\n"));
  process.exitCode = criticalFailures.length > 0 ? 1 : 0;
}

main();

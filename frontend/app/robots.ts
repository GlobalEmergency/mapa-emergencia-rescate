import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Los endpoints de API no deben rastrearse. NO listamos /admin a
      // propósito: ya es noindex y enumerarlo aquí solo revelaría la ruta del
      // panel a quien lea robots.txt.
      disallow: ["/api/"],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}

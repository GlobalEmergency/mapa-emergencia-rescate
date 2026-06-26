import type { MetadataRoute } from "next";

const SITE_URL = "https://terremotovenezuela.app";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Panel interno y endpoints de API no deben rastrearse ni indexarse.
      disallow: ["/admin", "/api/"],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}

import type { MetadataRoute } from "next";
import { LOCALES } from "@/lib/i18n";
import { SITE_URL, SITEMAP_PAIRS, SITEMAP_CHUNK } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  const chunks = Math.ceil(((2 + SITEMAP_PAIRS) * LOCALES.length) / SITEMAP_CHUNK);
  return {
    rules: [{ userAgent: "*", allow: "/" }],
    // the index plus every chunk, so a crawler finds them whichever it reads first
    sitemap: [
      `${SITE_URL}/sitemap-index.xml`,
      ...Array.from({ length: chunks }, (_, i) => `${SITE_URL}/sitemap/${i}.xml`),
    ],
    host: SITE_URL,
  };
}

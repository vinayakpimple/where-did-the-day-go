import type { MetadataRoute } from "next";
import { topPairs, pairSlug } from "@/lib/cities";
import { LOCALES, HREFLANG } from "@/lib/i18n";
import { SITE_URL, SITEMAP_PAIRS, SITEMAP_CHUNK } from "@/lib/site";

/**
 * Next splits this into /sitemap/[id].xml chunks plus an index. Each URL carries
 * hreflang alternates for all 12 locales, which is what tells Google the pages
 * are translations of one another rather than duplicates.
 */
export function generateSitemaps() {
  const perLocale = 2 + SITEMAP_PAIRS;           // home + cities + pairs
  const total = perLocale * LOCALES.length;
  const count = Math.ceil(total / SITEMAP_CHUNK);
  return Array.from({ length: count }, (_, id) => ({ id }));
}

export default async function sitemap({ id }: { id: number }): Promise<MetadataRoute.Sitemap> {
  const pairs = topPairs(SITEMAP_PAIRS);

  const paths: string[] = ["", "/cities", ...pairs.map(([a, b]) => `/${pairSlug(a, b)}`)];

  const all: MetadataRoute.Sitemap = [];
  for (const locale of LOCALES) {
    for (const p of paths) {
      const languages: Record<string, string> = {};
      for (const l of LOCALES) languages[HREFLANG[l]] = `${SITE_URL}/${l}${p}`;
      all.push({
        url: `${SITE_URL}/${locale}${p}`,
        changeFrequency: p === "" ? "daily" : "weekly",
        priority: p === "" ? 1 : p === "/cities" ? 0.6 : 0.8,
        alternates: { languages },
      });
    }
  }

  const start = id * SITEMAP_CHUNK;
  return all.slice(start, start + SITEMAP_CHUNK);
}

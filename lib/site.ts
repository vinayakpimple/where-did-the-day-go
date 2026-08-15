export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ||
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : "http://localhost:3000");

/** How many city pairs are pre-rendered per locale at build time. */
export const PRERENDER_PAIRS = Number(process.env.PRERENDER_PAIRS ?? 60);

/** How many pairs go into the sitemaps (the rest still work, just aren't listed). */
export const SITEMAP_PAIRS = Number(process.env.SITEMAP_PAIRS ?? 4000);

/** Sitemap chunk size — the protocol caps a single sitemap at 50,000 URLs. */
export const SITEMAP_CHUNK = 20000;

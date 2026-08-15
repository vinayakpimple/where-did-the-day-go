import { writeFileSync, mkdirSync } from "node:fs";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ||
  (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");

const LOCALES = 12;
const SITEMAP_PAIRS = Number(process.env.SITEMAP_PAIRS ?? 4000);
const SITEMAP_CHUNK = 20000;
const chunks = Math.ceil(((2 + SITEMAP_PAIRS) * LOCALES) / SITEMAP_CHUNK);
const now = new Date().toISOString();

const xml =
  `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
  Array.from({ length: chunks }, (_, i) =>
    `  <sitemap><loc>${SITE_URL}/sitemap/${i}.xml</loc><lastmod>${now}</lastmod></sitemap>`).join("\n") +
  `\n</sitemapindex>\n`;

mkdirSync("public", { recursive: true });
writeFileSync("public/sitemap-index.xml", xml);
console.log(`sitemap-index.xml written: ${chunks} chunks, base ${SITE_URL}`);

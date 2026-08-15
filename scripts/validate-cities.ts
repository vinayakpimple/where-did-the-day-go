import { CITIES } from "../lib/cities.ts";

const known = new Set(Intl.supportedValuesOf("timeZone"));
const errors: string[] = [];
const slugs = new Set<string>();

for (const c of CITIES) {
  if (!known.has(c.tz)) {
    // canonical check: some valid aliases are absent from supportedValuesOf
    try { new Intl.DateTimeFormat("en", { timeZone: c.tz }).format(new Date()); }
    catch { errors.push(`${c.slug}: unknown IANA zone "${c.tz}"`); }
  }
  if (slugs.has(c.slug)) errors.push(`duplicate slug "${c.slug}"`);
  slugs.add(c.slug);
  if (!/^[a-z0-9-]+$/.test(c.slug)) errors.push(`${c.slug}: slug must be lowercase kebab-case`);
  if (c.slug.includes("-to-")) errors.push(`${c.slug}: slug may not contain "-to-" (breaks pair parsing)`);
  if (Math.abs(c.lat) > 90 || Math.abs(c.lon) > 180) errors.push(`${c.slug}: bad coordinates`);
}

if (errors.length) { console.error("City data invalid:\n" + errors.map(e => "  - " + e).join("\n")); process.exit(1); }
console.log(`cities ok: ${CITIES.length} cities, ${new Set(CITIES.map(c => c.tz)).size} distinct zones, ${new Set(CITIES.map(c=>c.cc)).size} countries`);

import { readFileSync, readdirSync } from "node:fs";

const LOCALES = ["en","hi","es","pt","fr","de","ar","zh","ja","ru","id","bn"];
const en = JSON.parse(readFileSync("messages/en.json", "utf8"));
const enKeys = Object.keys(en);
const ph = (s) => (s.match(/\{\w+\}/g) || []).sort().join(",");

const errors = [];
for (const l of LOCALES) {
  let m;
  try { m = JSON.parse(readFileSync(`messages/${l}.json`, "utf8")); }
  catch (e) { errors.push(`${l}: not valid JSON — ${e.message}`); continue; }
  const keys = Object.keys(m);
  for (const k of enKeys) {
    if (!(k in m)) { errors.push(`${l}: missing key "${k}"`); continue; }
    if (typeof m[k] !== "string") { errors.push(`${l}: "${k}" is not a string`); continue; }
    if (ph(en[k]) !== ph(m[k])) errors.push(`${l}: "${k}" placeholders differ (en ${ph(en[k])} vs ${ph(m[k])})`);
  }
  for (const k of keys) if (!(k in en)) errors.push(`${l}: unknown key "${k}"`);
}

if (errors.length) {
  console.error(`\nTranslation files invalid (${errors.length} problems):`);
  for (const e of errors.slice(0, 40)) console.error("  - " + e);
  if (errors.length > 40) console.error(`  … and ${errors.length - 40} more`);
  process.exit(1);
}
console.log(`messages ok: ${LOCALES.length} locales x ${enKeys.length} keys, placeholders consistent`);

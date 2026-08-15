/**
 * Pack messages/*.json into one gzipped, base64 text file.
 *
 * The .json files are the source of truth and are what you edit. The bundle
 * exists only so the whole translation set can travel through transports with a
 * payload limit (it is ~4x smaller, and pure ASCII). `expand-messages.mjs`
 * regenerates the .json files from it when they are absent.
 *
 * Run this after changing any translation:  npm run bundle:messages
 */
import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { gzipSync } from "node:zlib";

const files = readdirSync("messages").filter((f) => f.endsWith(".json")).sort();
const map = Object.fromEntries(files.map((f) => [f, readFileSync(`messages/${f}`, "utf8")]));
const raw = Buffer.from(JSON.stringify(map), "utf8");
const packed = gzipSync(raw, { level: 9 }).toString("base64");
writeFileSync("messages.bundle.b64", packed.replace(/(.{100})/g, "$1\n") + "\n");
console.log(`bundled ${files.length} locales: ${raw.length} B -> ${packed.length} B base64 (${(packed.length / raw.length * 100).toFixed(0)}%)`);

/**
 * Restore messages/*.json from messages.bundle.b64 when they are not on disk.
 * A no-op in a normal checkout, where the .json files are present and win.
 */
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { gunzipSync } from "node:zlib";

if (existsSync("messages/en.json")) {
  console.log("messages/ present — using the .json files as-is");
} else if (existsSync("messages.bundle.b64")) {
  const b64 = readFileSync("messages.bundle.b64", "utf8").replace(/\s+/g, "");
  const map = JSON.parse(gunzipSync(Buffer.from(b64, "base64")).toString("utf8"));
  mkdirSync("messages", { recursive: true });
  for (const [name, body] of Object.entries(map)) writeFileSync(`messages/${name}`, body);
  console.log(`expanded ${Object.keys(map).length} locales from messages.bundle.b64`);
} else {
  console.error("No messages/ directory and no messages.bundle.b64 — cannot build.");
  process.exit(1);
}

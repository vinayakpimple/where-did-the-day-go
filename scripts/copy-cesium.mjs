/**
 * Cesium loads Workers / Assets / Widgets / ThirdParty at runtime from
 * CESIUM_BASE_URL. Copy them into public/ so Next can serve them as static
 * files. Re-run on every install and before next build / next dev.
 */
import { cpSync, mkdirSync, rmSync, existsSync } from "node:fs";
import { join } from "node:path";

const srcRoot = join("node_modules", "cesium", "Build", "Cesium");
const destRoot = join("public", "cesium");
const dirs = ["Workers", "ThirdParty", "Assets", "Widgets"];

if (!existsSync(srcRoot)) {
  console.warn("copy-cesium: cesium is not installed, skipping");
  process.exit(0);
}

rmSync(destRoot, { recursive: true, force: true });
mkdirSync(destRoot, { recursive: true });
for (const dir of dirs) {
  cpSync(join(srcRoot, dir), join(destRoot, dir), { recursive: true });
}
console.log(`copy-cesium: ${dirs.join(", ")} → ${destRoot}`);

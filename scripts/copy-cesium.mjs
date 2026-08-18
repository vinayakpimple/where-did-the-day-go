/**
 * Optional local copy of Cesium static files. The live globe loads Workers /
 * Widgets / Assets from the jsDelivr CDN by default (see lib/cesium-cdn.ts),
 * so this is not required for Vercel. If you run it, a missing install is a
 * hard failure — never skip with exit 0.
 */
import { cpSync, mkdirSync, rmSync, existsSync } from "node:fs";
import { join } from "node:path";

const srcRoot = join("node_modules", "cesium", "Build", "Cesium");
const destRoot = join("public", "cesium");
const dirs = ["Workers", "ThirdParty", "Assets", "Widgets"];

if (!existsSync(srcRoot)) {
  console.error("copy-cesium: node_modules/cesium/Build/Cesium is missing. Run npm install.");
  process.exit(1);
}

rmSync(destRoot, { recursive: true, force: true });
mkdirSync(destRoot, { recursive: true });
for (const dir of dirs) {
  cpSync(join(srcRoot, dir), join(destRoot, dir), { recursive: true });
}
console.log(`copy-cesium: ${dirs.join(", ")} → ${destRoot}`);

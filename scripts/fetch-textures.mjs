/**
 * Fetch + downscale the globe textures into public/textures/. Run manually:
 *   node scripts/fetch-textures.mjs
 * Output is committed; this only needs re-running to change resolution/quality.
 *
 * PROVENANCE — NASA imagery, public domain:
 *   Day:   Blue Marble Next Generation w/ topography & bathymetry (Dec 2004), 5400x2700
 *          https://eoimages.gsfc.nasa.gov/images/imagerecords/73000/73909/world.topo.bathy.200412.3x5400x2700.jpg
 *   Night: Black Marble / night lights (2012), 3600x1800
 *          https://eoimages.gsfc.nasa.gov/images/imagerecords/79000/79765/dnb_land_ocean_ice.2012.3600x1800.jpg
 */
import { writeFileSync, mkdirSync, statSync } from "node:fs";
import sharp from "sharp";

const W = 2048, H = 1024;
const MAX_TOTAL = 480 * 1024; // combined size gate — fail loudly, like the other validators

const JOBS = [
  {
    out: "public/textures/earth-day-2k.webp",
    quality: 72,
    urls: [
      "https://eoimages.gsfc.nasa.gov/images/imagerecords/73000/73909/world.topo.bathy.200412.3x5400x2700.jpg",
      "https://eoimages.gsfc.nasa.gov/images/imagerecords/74000/74117/world.200408.3x5400x2700.jpg",
    ],
  },
  {
    out: "public/textures/earth-night-2k.webp",
    quality: 60,
    urls: [
      "https://eoimages.gsfc.nasa.gov/images/imagerecords/79000/79765/dnb_land_ocean_ice.2012.3600x1800.jpg",
      "https://eoimages.gsfc.nasa.gov/images/imagerecords/55000/55167/earth_lights_lrg.jpg",
    ],
  },
];

async function fetchFirst(urls) {
  for (const url of urls) {
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      console.log(`fetched ${url}`);
      return Buffer.from(await res.arrayBuffer());
    } catch (e) {
      console.warn(`failed ${url}: ${e.message}`);
    }
  }
  throw new Error("all source URLs failed");
}

mkdirSync("public/textures", { recursive: true });
let total = 0;
for (const job of JOBS) {
  const src = await fetchFirst(job.urls);
  const buf = await sharp(src).resize(W, H, { fit: "fill" }).webp({ quality: job.quality }).toBuffer();
  const meta = await sharp(buf).metadata();
  if (meta.width !== W || meta.height !== H) throw new Error(`${job.out}: got ${meta.width}x${meta.height}, want ${W}x${H}`);
  writeFileSync(job.out, buf);
  total += statSync(job.out).size;
  console.log(`${job.out}: ${(buf.length / 1024).toFixed(0)} KB`);
}
if (total > MAX_TOTAL) throw new Error(`textures too big: ${(total / 1024).toFixed(0)} KB > ${MAX_TOTAL / 1024} KB`);
console.log(`textures ok: ${(total / 1024).toFixed(0)} KB total`);

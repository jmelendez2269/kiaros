import { mkdir } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import sharp from "sharp";

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(SCRIPT_DIR, "..");
const ASSET_DIR = join(ROOT, "docs", "assets", "etsy", "natal-report-tour");
const SOURCE = join(ASSET_DIR, "pricing-full.png");

const CROPS = [
  { file: "01-today-overview.jpg", left: 150, top: 2037, width: 1140, height: 638 },
  { file: "02-week-timing.jpg", left: 150, top: 2651, width: 1140, height: 479 },
  { file: "03-quarter-view.jpg", left: 150, top: 3106, width: 1140, height: 611 },
  { file: "04-goals-life-areas.jpg", left: 150, top: 3692, width: 1140, height: 291 },
  { file: "05-journal.jpg", left: 92, top: 4277, width: 1256, height: 701 },
  { file: "06-oracle.jpg", left: 92, top: 4958, width: 1256, height: 884 },
];

await mkdir(ASSET_DIR, { recursive: true });

for (const crop of CROPS) {
  const output = join(ASSET_DIR, crop.file);
  await sharp(SOURCE)
    .extract({ left: crop.left, top: crop.top, width: crop.width, height: crop.height })
    .jpeg({ quality: 84, chromaSubsampling: "4:4:4", mozjpeg: true })
    .toFile(output);
  const metadata = await sharp(output).metadata();
  if (metadata.width !== crop.width || metadata.height !== crop.height) {
    throw new Error(`${crop.file} rendered at ${metadata.width}x${metadata.height}`);
  }
  console.log(`${crop.file}: ${metadata.width}x${metadata.height}`);
}

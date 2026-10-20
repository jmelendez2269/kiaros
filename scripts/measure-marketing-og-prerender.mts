/**
 * After `npm run build`, measures text extent in prerendered OG PNGs.
 * Run: npx tsx scripts/measure-marketing-og-prerender.mts
 */

import { createCanvas, loadImage } from "@napi-rs/canvas";
import { readFileSync } from "node:fs";

const BOTTOM_LIMIT = 510;
const TEXT_X0 = 285;
const TEXT_X1 = 915;

const paths: Record<string, string> = {
  home: ".next/server/app/opengraph-image.body",
  pricing: ".next/server/app/pricing/opengraph-image.body",
  "field-notes": ".next/server/app/field-notes/opengraph-image.body",
};

function isTextPixel(r: number, g: number, b: number, a: number): boolean {
  if (a < 24) return false;
  if (r < 28 && g < 30 && b < 38) return false;
  if (r > 95 && g > 65 && b > 175 && a < 100) return false;
  return r + g + b > 295;
}

function measurePng(path: string) {
  const png = readFileSync(path);
  return loadImage(png).then((img) => {
    const canvas = createCanvas(img.width, img.height);
    const ctx = canvas.getContext("2d");
    ctx.drawImage(img, 0, 0);
    const { data, width } = ctx.getImageData(0, 0, img.width, img.height);

    let maxY = 0;
    let below = 0;
    const rowCounts: number[] = [];
    for (let y = 0; y < img.height; y++) {
      let n = 0;
      for (let x = TEXT_X0; x <= TEXT_X1; x++) {
        const i = (y * width + x) * 4;
        if (isTextPixel(data[i], data[i + 1], data[i + 2], data[i + 3])) {
          n++;
          maxY = Math.max(maxY, y);
          if (y > BOTTOM_LIMIT) below++;
        }
      }
      rowCounts.push(n);
    }

    let lines = 0;
    let inLine = false;
    for (let y = 120; y < img.height; y++) {
      const has = rowCounts[y] > 45;
      if (has && !inLine) {
        lines += 1;
        inLine = true;
      } else if (!has) {
        inLine = false;
      }
    }

    return { maxY, below, lines };
  });
}

for (const [name, path] of Object.entries(paths)) {
  const stats = await measurePng(path);
  console.log(
    `${name}: maxTextY=${stats.maxY} pixelsBelow${BOTTOM_LIMIT}=${stats.below} textRowBands=${stats.lines}`,
  );
}

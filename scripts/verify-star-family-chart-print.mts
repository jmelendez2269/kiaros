import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";

import { exportStarFamilyChartPdf } from "../lib/artifacts/star-origin/chart-print-export.ts";
import {
  STAR_FAMILY_CHART_PRINT_DIMENSIONS,
  renderStarFamilyChartPrintHtml,
} from "../lib/artifacts/star-origin/chart-print-template.ts";
import {
  STAR_FAMILY_CHART_PRINT_SIZES,
  type StarFamilyChartPrintSize,
} from "../lib/artifacts/star-origin/contract.ts";
import { generateProductionStarOrigin } from "../lib/artifacts/star-origin/production.ts";

const outputDirectory = resolve(
  process.argv[2] ?? join(tmpdir(), "kiaros-star-family-chart-prints"),
);
await mkdir(outputDirectory, { recursive: true });

const artifact = generateProductionStarOrigin({
  artifactId: "star_family_chart_pdf_check",
  displayName: null,
  tier: "standard",
  normalizedBirth: {
    date: "1991-06-09",
    time: "01:35",
    timeUnknown: false,
    city: "Orlando",
    country: "United States",
    timezone: "America/New_York",
    latitude: 28.5383,
    longitude: -81.3792,
  },
});

function points(mm: number): number {
  return (mm / 25.4) * 72;
}

const results: Array<{
  printSize: StarFamilyChartPrintSize;
  outputPath: string;
  bytes: number;
  sha256: string;
}> = [];

for (const printSize of STAR_FAMILY_CHART_PRINT_SIZES) {
  const html = renderStarFamilyChartPrintHtml(artifact, printSize);
  assert.equal(html.split('class="poster"').length - 1, 1);
  assert.match(html, /class="star-family-wheel"/);
  assert.match(html, /Celestial symbol key/);
  assert.match(html, /♈/);
  assert.match(html, />Aries</);
  assert.match(html, />Mercury</);
  assert.doesNotMatch(
    html,
    /A chart can carry more than one recognisable line/,
  );

  const exported = await exportStarFamilyChartPdf(artifact, printSize);
  assert.equal(
    Buffer.from(exported.bytes.subarray(0, 5)).toString("latin1"),
    "%PDF-",
  );
  assert.match(exported.fileName, new RegExp("-" + printSize + "\\.pdf$"));
  assert.match(exported.sha256, /^[a-f0-9]{64}$/);
  assert.ok(exported.bytes.byteLength > 20_000);
  assert.ok(
    Buffer.from(exported.bytes).toString("latin1").includes("/StructTreeRoot"),
  );

  const document = await getDocument({
    data: Uint8Array.from(exported.bytes),
  }).promise;
  assert.equal(document.numPages, 1);
  const page = await document.getPage(1);
  const viewport = page.getViewport({ scale: 1 });
  const dimensions = STAR_FAMILY_CHART_PRINT_DIMENSIONS[printSize];
  assert.ok(
    Math.abs(viewport.width - points(dimensions.widthMm)) < 0.75,
    printSize +
      " width was " +
      viewport.width +
      "pt, expected " +
      points(dimensions.widthMm) +
      "pt",
  );
  assert.ok(
    Math.abs(viewport.height - points(dimensions.heightMm)) < 0.75,
    printSize +
      " height was " +
      viewport.height +
      "pt, expected " +
      points(dimensions.heightMm) +
      "pt",
  );
  const text = (await page.getTextContent()).items
    .map((item) => ("str" in item ? item.str : ""))
    .join(" ");
  assert.match(text, /Star Family Birth Chart/);
  assert.match(text, /Orion/);
  assert.match(text, /Lyra/);
  assert.match(text, /Andromeda/);
  assert.match(text, /Rigel to Sun/);
  assert.match(text, /Vega to North Node/);
  assert.match(text, /Andromeda Galaxy to Moon/);
  assert.doesNotMatch(text, /How the three work together/);
  await document.destroy();

  const outputPath = join(outputDirectory, exported.fileName);
  await writeFile(outputPath, exported.bytes);
  results.push({
    printSize,
    outputPath,
    bytes: exported.bytes.byteLength,
    sha256: exported.sha256,
  });
}

console.log(JSON.stringify(results, null, 2));

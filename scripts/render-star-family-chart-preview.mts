import { writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

import {
  STAR_FAMILY_CHART_PRINT_SIZES,
  type StarFamilyChartPrintSize,
} from "../lib/artifacts/star-origin/contract.ts";
import { renderStarFamilyChartPrintHtml } from "../lib/artifacts/star-origin/chart-print-template.ts";
import { generateProductionStarOrigin } from "../lib/artifacts/star-origin/production.ts";

const outputPath = resolve(
  process.argv[2] ?? join(tmpdir(), "kiaros-star-family-chart-11x14.html"),
);
const requestedSize = process.argv[3] ?? "11x14";
if (
  !STAR_FAMILY_CHART_PRINT_SIZES.includes(
    requestedSize as StarFamilyChartPrintSize,
  )
) {
  throw new RangeError("Unsupported chart-print size: " + requestedSize);
}
const printSize = requestedSize as StarFamilyChartPrintSize;

const artifact = generateProductionStarOrigin({
  artifactId: "star_family_chart_founder_preview",
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

await writeFile(
  outputPath,
  renderStarFamilyChartPrintHtml(artifact, printSize),
  "utf8",
);

console.log(outputPath);

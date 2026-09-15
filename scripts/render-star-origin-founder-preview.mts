import { writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

import { generateProductionStarOrigin } from "../lib/artifacts/star-origin/production.ts";
import { renderStarOriginHtml } from "../lib/artifacts/star-origin/template.ts";

const outputPath = resolve(
  process.argv[2] ?? join(tmpdir(), "kiaros-star-origin-founder-preview.html"),
);

const artifact = generateProductionStarOrigin({
  artifactId: "star_origin_founder_preview",
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

await writeFile(outputPath, renderStarOriginHtml(artifact, "letter"), "utf8");

console.log(outputPath);

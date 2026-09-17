import assert from "node:assert/strict";
import { createHash } from "node:crypto";

import { knownTimeAnchorFixture } from "../lib/artifacts/anchor-print/fixtures.ts";
import { generateAnchorPrint } from "../lib/artifacts/anchor-print/index.ts";
import { exportArtifactPdfWithLocalChromium } from "../lib/artifacts/fulfillment/pdf-export-core.ts";

assert.equal(process.env.KIAROS_ETSY_ARTIFACT_ADMIN, "true", "local artifact flag must be explicit");
assert.notEqual(process.env.NODE_ENV, "production", "local exporter must never run in production mode");

const artifact = generateAnchorPrint(knownTimeAnchorFixture());

for (const documentKind of ["report", "anchor_print"] as const) {
  for (const paperSize of ["letter", "a4"] as const) {
  const result = await exportArtifactPdfWithLocalChromium(artifact, documentKind, paperSize);
  assert.ok(result.bytes.byteLength > 20_000, `${documentKind}/${paperSize} export is not suspiciously empty`);
  assert.ok(result.bytes.byteLength <= 10 * 1024 * 1024, `${documentKind}/${paperSize} export stays within 10 MB`);
  assert.equal(
    Buffer.from(result.bytes.subarray(0, 5)).toString("latin1"),
    "%PDF-",
    `${documentKind}/${paperSize} export has a PDF signature`,
  );
  assert.equal(
    result.sha256,
    createHash("sha256").update(result.bytes).digest("hex"),
    `${documentKind}/${paperSize} checksum matches returned bytes`,
  );
  assert.match(
    result.fileName,
    new RegExp(
      `_${documentKind === "report" ? "natal-report" : "anchor-print"}_${paperSize}\\.pdf$`,
    ),
    `${documentKind}/${paperSize} export uses the privacy-safe contract filename`,
  );
  }
}

console.log("ETSY-03 local admin export verification passed: all four files returned from temporary storage.");

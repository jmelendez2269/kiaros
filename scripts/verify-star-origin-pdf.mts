import assert from "node:assert/strict";
import { writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";

import { exportStarOriginPdf } from "../lib/artifacts/star-origin/pdf-export.ts";
import { renderStarOriginHtml } from "../lib/artifacts/star-origin/template.ts";
import {
  approveStarOriginWorkflowRecord,
  createStarOriginWorkflowRecord,
} from "../lib/artifacts/star-origin/workflow.ts";
import { STAR_ORIGIN_QA_ITEM_IDS } from "../lib/artifacts/star-origin/contract.ts";

const generated = createStarOriginWorkflowRecord({
  artifactId: "star_origin_founder_pdf_check",
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
const approved = approveStarOriginWorkflowRecord(
  generated.reportId,
  "local-pdf-check",
  new Date(),
  STAR_ORIGIN_QA_ITEM_IDS,
);
const exported = await exportStarOriginPdf(approved.artifact, "letter");

assert.equal(Buffer.from(exported.bytes.subarray(0, 5)).toString("latin1"), "%PDF-");
assert.match(exported.fileName, /\.pdf$/i);
assert.match(exported.sha256, /^[a-f0-9]{64}$/);
assert.ok(exported.bytes.byteLength > 1_000);
assert.ok(Buffer.from(exported.bytes).toString("latin1").includes("/StructTreeRoot"));

const html = renderStarOriginHtml(approved.artifact, "letter");
const pageBoxes = html.split('class="report-page').length - 1;
const document = await getDocument({ data: Uint8Array.from(exported.bytes) }).promise;
assert.equal(document.numPages, pageBoxes);
const minimumPages = approved.artifact.sections.length + 2;
assert.ok(document.numPages >= minimumPages);
assert.ok(document.numPages <= 25);
const pageCount = document.numPages;
const firstPage = await document.getPage(1);
const finalPage = await document.getPage(document.numPages);
const viewport = firstPage.getViewport({ scale: 1 });
assert.ok(Math.abs(viewport.width - 612) < 0.1);
assert.ok(Math.abs(viewport.height - 792) < 0.1);
const pageTexts: string[] = [];
for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
  const page = await document.getPage(pageNumber);
  const pageViewport = page.getViewport({ scale: 1 });
  assert.ok(Math.abs(pageViewport.width - 612) < 0.1);
  assert.ok(Math.abs(pageViewport.height - 792) < 0.1);
  const text = (await page.getTextContent()).items
    .map((item) => ('str' in item ? item.str : ''))
    .join(' ');
  assert.ok(text.trim().length > 40);
  pageTexts.push(text);
}
const normalizeText = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\b([a-z]{4,}) ([a-z])\b/g, '$1$2')
    .trim();
const reportText = normalizeText(pageTexts.join(' '));
for (const section of approved.artifact.sections) {
  for (const paragraph of section.paragraphs) {
    const marker = normalizeText(paragraph).split(' ').slice(0, 8).join(' ');
    assert.ok(reportText.includes(marker), 'PDF clipped paragraph beginning: ' + marker);
  }
}
const firstText = (await firstPage.getTextContent()).items
  .map((item) => ('str' in item ? item.str : ''))
  .join(' ');
assert.match(firstText, /Star Origin/);
assert.match(firstText, /Orion/);
const finalText = (await finalPage.getTextContent()).items
  .map((item) => ('str' in item ? item.str : ''))
  .join(' ');
assert.match(finalText, /The workings/);
assert.match(finalText, /Rigel/);
await document.destroy();

const outputPath = resolve(process.argv[2] ?? join(tmpdir(), exported.fileName));
await writeFile(outputPath, exported.bytes);

console.log(
  JSON.stringify(
    {
      outputPath,
      fileName: exported.fileName,
      bytes: exported.bytes.byteLength,
      pages: pageCount,
      sha256: exported.sha256,
    },
    null,
    2,
  ),
);

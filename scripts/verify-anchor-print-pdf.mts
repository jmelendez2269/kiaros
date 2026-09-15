import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { promisify } from "node:util";

import { PDFParse } from "pdf-parse";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";

import {
  generateAnchorPrint,
  renderAnchorPrintHtml,
  type AnchorDocumentKind,
  type AnchorPaperSize,
  type AnchorPrintArtifact,
} from "../lib/artifacts/anchor-print/index.ts";
import {
  knownTimeAnchorFixture,
  unknownTimeAnchorFixture,
} from "../lib/artifacts/anchor-print/fixtures.ts";

const execFileAsync = promisify(execFile);
const MAXIMUM_PDF_BYTES = 10 * 1024 * 1024;
const EXPECTED_PAGE_POINTS: Record<AnchorPaperSize, readonly [number, number]> = {
  letter: [612, 792],
  a4: [595.28, 841.89],
};

interface StructureNode {
  role?: string;
  alt?: string;
  children?: readonly StructureNode[];
}

interface VerificationRecord {
  fixture: "known-time" | "unknown-time";
  documentKind: AnchorDocumentKind;
  paperSize: AnchorPaperSize;
  pdfFile: string;
  bytes: number;
  sha256: string;
  pages: number;
  pagePoints: readonly { width: number; height: number }[];
  title: string;
  structureRoles: readonly string[];
  screenshotFiles: readonly string[];
}

let assertions = 0;

function check(value: unknown, message: string): asserts value {
  assert.ok(value, message);
  assertions += 1;
}

function equal<T>(actual: T, expected: T, message: string): void {
  assert.equal(actual, expected, message);
  assertions += 1;
}

function sha256(data: Uint8Array): string {
  return createHash("sha256").update(data).digest("hex");
}

function findChrome(): string {
  const override = process.env.KIAROS_CHROME_PATH;
  const candidates = [
    override,
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
    "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
  ].filter((candidate): candidate is string => Boolean(candidate));
  const chrome = candidates.find((candidate) => existsSync(candidate));
  if (!chrome) {
    throw new Error("Local Chrome or Edge is required. Set KIAROS_CHROME_PATH to an installed Chromium executable.");
  }
  return chrome;
}

function argumentValue(name: string): string | null {
  const index = process.argv.indexOf(name);
  if (index === -1) return null;
  const value = process.argv[index + 1];
  if (!value || value.startsWith("--")) throw new Error(`${name} requires a value`);
  return value;
}

function collectRoles(node: StructureNode | null, roles: string[]): void {
  if (!node) return;
  if (node.role) roles.push(node.role);
  for (const child of node.children ?? []) collectRoles(child, roles);
}

function normalizeText(value: string): string {
  return value.replace(/([-–—])\s+/g, "$1").replace(/\s+/g, " ").trim();
}

function compactText(value: string): string {
  return normalizeText(value).replace(/\s+/g, "");
}

function assertOrdered(text: string, markers: readonly string[], label: string): void {
  const normalized = normalizeText(text);
  let cursor = -1;
  for (const marker of markers) {
    const next = normalized.indexOf(normalizeText(marker), cursor + 1);
    check(next > cursor, `${label}: expected reading-order marker ${JSON.stringify(marker)}`);
    cursor = next;
  }
}

async function exportPdf(
  chrome: string,
  htmlPath: string,
  pdfPath: string,
  profileRoot: string,
): Promise<void> {
  await mkdir(profileRoot, { recursive: true });
  await execFileAsync(
    chrome,
    [
      "--headless=new",
      "--disable-background-networking",
      "--disable-component-update",
      "--disable-extensions",
      "--disable-gpu",
      "--disable-sync",
      "--metrics-recording-only",
      "--no-default-browser-check",
      "--no-first-run",
      "--no-pdf-header-footer",
      "--print-to-pdf-no-header",
      "--export-tagged-pdf",
      "--generate-pdf-document-outline",
      "--run-all-compositor-stages-before-draw",
      "--virtual-time-budget=1000",
      `--user-data-dir=${profileRoot}`,
      `--print-to-pdf=${pdfPath}`,
      pathToFileURL(htmlPath).href,
    ],
    { timeout: 45_000, windowsHide: true, maxBuffer: 2 * 1024 * 1024 },
  );
  check(existsSync(pdfPath), `Chromium created ${basename(pdfPath)}`);
}

async function inspectPdf(
  artifact: AnchorPrintArtifact,
  fixture: VerificationRecord["fixture"],
  documentKind: AnchorDocumentKind,
  paperSize: AnchorPaperSize,
  pdfPath: string,
  outputRoot: string,
): Promise<VerificationRecord> {
  const data = await readFile(pdfPath);
  const raw = data.toString("latin1");
  const label = fixture + "/" + documentKind + "/" + paperSize;
  const expectedPages = documentKind === "report" ? 26 : 1;
  const expectedTitle =
    artifact.product.name + " · " +
    (documentKind === "report" ? "Report" : "Anchor Print") + " · " +
    (paperSize === "letter" ? "Letter" : "A4");
  const expectedFile = artifact.files.find(
    (file) => file.documentKind === documentKind && file.paperSize === paperSize,
  );
  check(expectedFile, label + ": file contract exists");
  equal(basename(pdfPath), expectedFile.fileName, label + ": privacy-safe filename");
  check(data.byteLength > 20_000, label + ": PDF is not suspiciously empty");
  check(data.byteLength <= MAXIMUM_PDF_BYTES, label + ": PDF stays within 10 MB");
  check(raw.startsWith("%PDF-"), label + ": valid PDF signature");
  check(/\/StructTreeRoot\b/.test(raw), label + ": tagged structure tree exists");
  check(
    /\/MarkInfo\b/.test(raw) && /\/Marked\s+true\b/.test(raw),
    label + ": marked-content metadata exists",
  );
  check(/\/Lang\s*\(en\)/.test(raw), label + ": document language is en");
  check(/\/FontFile(?:2|3)?\b/.test(raw), label + ": at least one font program is embedded");
  if (documentKind === "report") {
    check(raw.includes("/Subtype /Image"), label + ": report embeds the real-interface product screenshots");
  } else {
    check(!raw.includes("/Subtype /Image"), label + ": Anchor Print remains vector rather than rasterized");
  }

  const parser = new PDFParse({ data });
  try {
    const info = await parser.getInfo({ parsePageInfo: true });
    const text = await parser.getText();
    const screenshots = await parser.getScreenshot({ desiredWidth: 1400, imageBuffer: true, imageDataUrl: false });

    const screenshotFiles: string[] = [];
    for (const page of screenshots.pages) {
      const screenshotFile = join(
        outputRoot,
        `${artifact.artifactId}_${documentKind === "report" ? "natal-report" : "anchor-print"}_${paperSize}_page-${page.pageNumber}.png`,
      );
      await writeFile(screenshotFile, page.data);
      screenshotFiles.push(screenshotFile);
      check(
        page.width > 1_000 && page.height > page.width,
        label + ": page " + page.pageNumber + " inspection image has expected portrait geometry",
      );
    }

    equal(info.total, expectedPages, label + ": exact contracted page count");
    equal(info.info?.Title, expectedTitle, label + ": generic document title metadata");
    check(!JSON.stringify(info.info ?? {}).includes(artifact.artifactId), label + ": metadata excludes artifact ID");
    if (artifact.displayName) {
      check(!JSON.stringify(info.info ?? {}).includes(artifact.displayName), label + ": metadata excludes display name");
    }
    const pdfLinks = info.pages.flatMap((page) => page.links);
    if (documentKind === "report") {
      equal(pdfLinks.length, 1, label + ": report contains exactly one website link");
      check(JSON.stringify(pdfLinks).includes("kairosplanner.xyz"), label + ": report link targets the Kairos Planner website");
      check(info.pages.slice(0, 19).every((page) => page.links.length === 0), label + ": pages before the advertisement contain no links");
      equal(info.pages[19]?.links.length, 1, label + ": website link appears on advertisement page 20");
      check(info.pages.slice(20).every((page) => page.links.length === 0), label + ": product-tour pages contain no additional links");
    } else {
      equal(pdfLinks.length, 0, label + ": Anchor Print contains no links");
    }

    const [expectedWidth, expectedHeight] = EXPECTED_PAGE_POINTS[paperSize];
    for (const page of info.pages) {
      check(Math.abs(page.width - expectedWidth) < 1, label + ": page " + page.pageNumber + " width is correct");
      check(Math.abs(page.height - expectedHeight) < 1, label + ": page " + page.pageNumber + " height is correct");
    }

    equal(text.total, expectedPages, label + ": selectable text exists on every page");
    if (documentKind === "report") {
      assertOrdered(
        text.pages[2]?.text ?? "",
        [artifact.report.reference.title, "Placements", "Sun", "Major aspects"],
        label + " chart reference",
      );
      for (const [index, section] of artifact.report.sections.entries()) {
        const chapterText = normalizeText(text.pages[index + 4]?.text ?? "");
        check(compactText(chapterText).includes(compactText(section.title)), label + ": " + section.id + " title is selectable");
        for (const paragraph of section.paragraphs) {
          check(compactText(chapterText).includes(compactText(paragraph)), label + ": complete " + section.id + " prose is selectable");
        }
        for (const point of section.keyPoints) {
          check(compactText(chapterText).includes(compactText(point)), label + ": " + section.id + " practical anchor is selectable");
        }
      }
      const reflectionText = normalizeText(text.pages[18]?.text ?? "");
      for (const prompt of artifact.report.reflectionPrompts) {
        check(compactText(reflectionText).includes(compactText(prompt)), label + ": complete reflection prompt is selectable");
      }
      check(
        normalizeText(text.pages[19]?.text ?? "").includes("not medical, mental-health, legal, financial"),
        label + ": scope disclosure is present",
      );
      check(
        compactText(normalizeText(text.pages[19]?.text ?? "")).includes(compactText("Plan your life with the sky")),
        label + ": final page contains the Kairos Planner advertisement",
      );
      check(
        compactText(normalizeText(text.pages[19]?.text ?? "")).includes(compactText("kairosplanner.xyz")),
        label + ": final page contains the selectable website address",
      );
      const productTourTitles = [
        "Today, made useful",
        "See the week before it arrives",
        "Give the year a shape",
        "Let your priorities meet the moment",
        "Reflect without starting from a blank page",
        "Continue the conversation with context",
      ];
      for (const [index, title] of productTourTitles.entries()) {
        const tourText = normalizeText(text.pages[index + 20]?.text ?? "");
        check(compactText(tourText).includes(compactText(title)), label + ": product-tour page contains " + title);
        check(tourText.includes("fictional demo data"), label + ": product-tour page labels its fictional data boundary");
      }
    } else {
      const keepsakeText = normalizeText(text.pages[0]?.text ?? "");
      check(compactText(keepsakeText).includes(compactText(artifact.anchorPrint.title)), label + ": keepsake title is selectable");
      for (const item of artifact.anchorPrint.items) {
        check(compactText(keepsakeText).includes(compactText(item.title)), label + ": keepsake anchor title is selectable");
        check(compactText(keepsakeText).includes(compactText(item.text)), label + ": keepsake anchor text is selectable");
      }
    }
    check(!text.text.includes("file:///"), label + ": browser file path did not enter the PDF");

    equal(screenshots.total, expectedPages, label + ": every page renders to an inspection image");

    const loadingTask = getDocument({ data: new Uint8Array(data) });
    const document = await loadingTask.promise;
    const roles: string[] = [];
    try {
      for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
        const page = await document.getPage(pageNumber);
        const structure = (await page.getStructTree()) as StructureNode | null;
        check(structure, label + ": page " + pageNumber + " exposes a logical structure tree");
        collectRoles(structure, roles);
        page.cleanup();
      }
    } finally {
      await document.destroy();
    }
    const requiredRoles = documentKind === "report"
      ? ["H1", "H2", "P", "Table", "Figure"]
      : ["H1", "H2", "P"];
    for (const role of requiredRoles) {
      check(roles.includes(role), label + ": structure tree includes " + role);
    }

    return {
      fixture,
      documentKind,
      paperSize,
      pdfFile: pdfPath,
      bytes: data.byteLength,
      sha256: sha256(data),
      pages: info.total,
      pagePoints: info.pages.map((page) => ({ width: page.width, height: page.height })),
      title: String(info.info?.Title ?? ""),
      structureRoles: [...new Set(roles)].sort(),
      screenshotFiles,
    };
  } finally {
    await parser.destroy();
  }
}

async function main(): Promise<void> {
  const requestedOutput = argumentValue("--output-dir");
  const keep = process.argv.includes("--keep") || requestedOutput !== null;
  const outputRoot = requestedOutput
    ? resolve(requestedOutput)
    : await mkdtemp(join(tmpdir(), "kiaros-etsy-02-pdf-"));
  await mkdir(outputRoot, { recursive: true });
  const chrome = findChrome();
  const records: VerificationRecord[] = [];
  let succeeded = false;

  try {
    const fixtures = [
      { name: "known-time" as const, artifact: generateAnchorPrint(knownTimeAnchorFixture()) },
      { name: "unknown-time" as const, artifact: generateAnchorPrint(unknownTimeAnchorFixture()) },
    ];

    for (const { name, artifact } of fixtures) {
      for (const documentKind of ["report", "anchor_print"] as const) {
        for (const paperSize of ["letter", "a4"] as const) {
        const expectedFile = artifact.files.find(
          (file) => file.documentKind === documentKind && file.paperSize === paperSize,
        );
        check(expectedFile, `${name}/${documentKind}/${paperSize}: file variant is present`);
        const htmlPath = join(outputRoot, expectedFile.fileName.replace(/\.pdf$/i, ".html"));
        const pdfPath = join(outputRoot, expectedFile.fileName);
        const profileRoot = join(
          outputRoot,
          `.chrome-${artifact.artifactId}-${documentKind}-${paperSize}`,
        );
        await writeFile(
          htmlPath,
          renderAnchorPrintHtml(artifact, paperSize, documentKind),
          "utf8",
        );
        await rm(pdfPath, { force: true });
        try {
          await exportPdf(chrome, htmlPath, pdfPath, profileRoot);
        } finally {
          await rm(profileRoot, { recursive: true, force: true });
        }
        records.push(
          await inspectPdf(artifact, name, documentKind, paperSize, pdfPath, outputRoot),
        );
        }
      }
    }

    const reportPath = join(outputRoot, "verification-report.json");
    await writeFile(
      reportPath,
      `${JSON.stringify({
        schemaVersion: "kairos.natal-report.pdf-verification.v2",
        pdfUaAssessment: "structural-readiness-only-no-conformance-claim",
        assertions,
        chrome,
        records,
      }, null, 2)}\n`,
      "utf8",
    );
    console.log(`Natal report package PDF checks passed (${assertions} assertions across 8 PDFs).`);
    console.log("PDF/UA structural readiness passed; independent conformance is not claimed.");
    console.log(`Verification output: ${outputRoot}`);
    succeeded = true;
  } catch (error) {
    console.error(`Verification output retained for diagnosis: ${outputRoot}`);
    throw error;
  } finally {
    if (!keep && succeeded) await rm(outputRoot, { recursive: true, force: true });
  }
}

await main();

import "server-only";

import { execFile } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { promisify } from "node:util";

import { isLocalArtifactWorkflowEnabled } from "../fulfillment/availability.ts";
import {
  CELESTIAL_YEAR_MAP_PRINT_SIZES,
  YearAheadContractError,
  type CelestialYearMapPrintSize,
  type YearAheadArtifact,
  type YearAheadPaperSize,
} from "./contract.ts";
import { assertYearAheadReportDeliverable, assertYearMapDeliverable } from "./generator.ts";
import { renderYearAheadReportHtml } from "./template.ts";
import { renderCelestialYearMapHtml } from "./year-map-template.ts";

const execFileAsync = promisify(execFile);
const MAXIMUM_PDF_BYTES = 10 * 1024 * 1024;

export interface YearAheadPdfExport {
  bytes: Uint8Array;
  fileName: string;
  sha256: string;
}

function localChromiumPath(): string {
  const candidates = [
    process.env.KIAROS_CHROME_PATH,
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
    "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
  ].filter((candidate): candidate is string => Boolean(candidate));
  const chromium = candidates.find((candidate) => existsSync(candidate));
  if (!chromium) throw new YearAheadContractError("Local Chrome or Edge is required for Year Ahead PDF export.");
  return chromium;
}

async function renderPdf(html: string, fileName: string): Promise<YearAheadPdfExport> {
  if (!isLocalArtifactWorkflowEnabled()) {
    throw new YearAheadContractError("Year Ahead export requires the development-only artifact workflow flag.");
  }
  const root = await mkdtemp(join(tmpdir(), "kiaros-year-ahead-export-"));
  const htmlPath = join(root, `${randomUUID()}.html`);
  const pdfPath = join(root, fileName);
  const profilePath = join(root, "chromium-profile");
  try {
    await writeFile(htmlPath, html, "utf8");
    await execFileAsync(localChromiumPath(), [
      "--headless=new", "--disable-background-networking", "--disable-component-update",
      "--disable-extensions", "--disable-gpu", "--disable-sync", "--metrics-recording-only",
      "--no-default-browser-check", "--no-first-run", "--no-pdf-header-footer",
      "--print-to-pdf-no-header", "--export-tagged-pdf", "--generate-pdf-document-outline",
      "--run-all-compositor-stages-before-draw", "--virtual-time-budget=1000",
      `--user-data-dir=${profilePath}`, `--print-to-pdf=${pdfPath}`, pathToFileURL(htmlPath).href,
    ], { timeout: 45_000, windowsHide: true, maxBuffer: 2 * 1024 * 1024 });
    const bytes = await readFile(pdfPath);
    if (!bytes.toString("latin1").startsWith("%PDF-") || bytes.byteLength > MAXIMUM_PDF_BYTES) {
      throw new YearAheadContractError("The Year Ahead export failed its PDF signature or size boundary.");
    }
    return { bytes: new Uint8Array(bytes), fileName, sha256: createHash("sha256").update(bytes).digest("hex") };
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

export async function exportYearAheadReportPdf(
  artifact: YearAheadArtifact,
  paperSize: YearAheadPaperSize,
): Promise<YearAheadPdfExport> {
  assertYearAheadReportDeliverable(artifact);
  const file = artifact.files.find((item) => item.documentKind === "report" && item.size === paperSize);
  if (!file) throw new YearAheadContractError("The requested Year Ahead paper size is unavailable.");
  return renderPdf(renderYearAheadReportHtml(artifact, paperSize), file.fileName);
}

export async function exportCelestialYearMapPdf(
  artifact: YearAheadArtifact,
  printSize: CelestialYearMapPrintSize,
): Promise<YearAheadPdfExport> {
  assertYearMapDeliverable(artifact);
  if (!CELESTIAL_YEAR_MAP_PRINT_SIZES.includes(printSize)) {
    throw new YearAheadContractError("The requested Celestial Year Map size is unavailable.");
  }
  const file = artifact.files.find((item) => item.documentKind === "year_map" && item.size === printSize);
  if (!file) throw new YearAheadContractError("The requested Celestial Year Map file is unavailable.");
  return renderPdf(renderCelestialYearMapHtml(artifact, printSize), file.fileName);
}

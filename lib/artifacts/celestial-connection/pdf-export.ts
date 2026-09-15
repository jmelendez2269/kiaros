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
import { CONNECTION_MAP_PRINT_SIZES, CelestialConnectionContractError, type CelestialConnectionArtifact, type CelestialConnectionPaperSize, type ConnectionMapPrintSize } from "./contract.ts";
import { assertConnectionMapDeliverable, assertConnectionReportDeliverable } from "./generator.ts";
import { renderConnectionMapHtml } from "./connection-map-template.ts";
import { renderCelestialConnectionReportHtml } from "./template.ts";

const execFileAsync = promisify(execFile); const MAXIMUM_PDF_BYTES = 10 * 1024 * 1024;
export interface CelestialConnectionPdfExport { bytes: Uint8Array; fileName: string; sha256: string; }
function localChromiumPath(): string {
  const candidates = [process.env.KIAROS_CHROME_PATH, "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe", "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe", "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe"].filter((item): item is string => Boolean(item));
  const chromium = candidates.find((item) => existsSync(item)); if (!chromium) throw new CelestialConnectionContractError("Local Chrome or Edge is required for Celestial Connection PDF export."); return chromium;
}
async function renderPdf(html: string, fileName: string): Promise<CelestialConnectionPdfExport> {
  if (!isLocalArtifactWorkflowEnabled()) throw new CelestialConnectionContractError("Celestial Connection export requires the development-only artifact workflow flag.");
  const root = await mkdtemp(join(tmpdir(), "kiaros-connection-export-")); const htmlPath = join(root, `${randomUUID()}.html`); const pdfPath = join(root, fileName); const profilePath = join(root, "chromium-profile");
  try {
    await writeFile(htmlPath, html, "utf8");
    await execFileAsync(localChromiumPath(), ["--headless=new", "--disable-background-networking", "--disable-component-update", "--disable-extensions", "--disable-gpu", "--disable-sync", "--metrics-recording-only", "--no-default-browser-check", "--no-first-run", "--no-pdf-header-footer", "--print-to-pdf-no-header", "--export-tagged-pdf", "--generate-pdf-document-outline", "--run-all-compositor-stages-before-draw", "--virtual-time-budget=1000", `--user-data-dir=${profilePath}`, `--print-to-pdf=${pdfPath}`, pathToFileURL(htmlPath).href], { timeout: 45_000, windowsHide: true, maxBuffer: 2 * 1024 * 1024 });
    const bytes = await readFile(pdfPath); if (!bytes.toString("latin1").startsWith("%PDF-") || bytes.byteLength > MAXIMUM_PDF_BYTES) throw new CelestialConnectionContractError("The Celestial Connection export failed its PDF signature or size boundary.");
    return { bytes: new Uint8Array(bytes), fileName, sha256: createHash("sha256").update(bytes).digest("hex") };
  } finally { await rm(root, { recursive: true, force: true }); }
}
export async function exportCelestialConnectionReportPdf(artifact: CelestialConnectionArtifact, paperSize: CelestialConnectionPaperSize): Promise<CelestialConnectionPdfExport> {
  assertConnectionReportDeliverable(artifact); const file = artifact.files.find((item) => item.documentKind === "report" && item.size === paperSize);
  if (!file) throw new CelestialConnectionContractError("The requested relationship report size is unavailable."); return renderPdf(renderCelestialConnectionReportHtml(artifact, paperSize), file.fileName);
}
export async function exportConnectionMapPdf(artifact: CelestialConnectionArtifact, printSize: ConnectionMapPrintSize): Promise<CelestialConnectionPdfExport> {
  assertConnectionMapDeliverable(artifact); if (!CONNECTION_MAP_PRINT_SIZES.includes(printSize)) throw new CelestialConnectionContractError("The requested connection-map size is unavailable.");
  const file = artifact.files.find((item) => item.documentKind === "connection_map" && item.size === printSize); if (!file) throw new CelestialConnectionContractError("The requested connection-map file is unavailable.");
  return renderPdf(renderConnectionMapHtml(artifact, printSize), file.fileName);
}

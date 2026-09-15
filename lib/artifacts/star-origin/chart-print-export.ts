import "server-only";

import { execFile } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { promisify } from "node:util";

import { isLocalArtifactWorkflowEnabled } from "@/lib/artifacts/fulfillment/availability";
import {
  assertDeliverable,
  type StarFamilyChartPrintSize,
  type StarOriginArtifact,
} from "./contract.ts";
import { renderStarFamilyChartPrintHtml } from "./chart-print-template.ts";
import { StarOriginWorkflowError } from "./workflow.ts";

const execFileAsync = promisify(execFile);
const MAXIMUM_PDF_BYTES = 10 * 1024 * 1024;

export interface StarFamilyChartPdfExport {
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
  if (!chromium) {
    throw new StarOriginWorkflowError(
      "invalid_transition",
      "Local Chrome or Edge is required for Star Family chart export.",
    );
  }
  return chromium;
}

export async function exportStarFamilyChartPdf(
  artifact: StarOriginArtifact,
  printSize: StarFamilyChartPrintSize,
): Promise<StarFamilyChartPdfExport> {
  if (!isLocalArtifactWorkflowEnabled()) {
    throw new StarOriginWorkflowError(
      "invalid_transition",
      "Star Family chart export requires the development-only artifact workflow flag.",
    );
  }
  assertDeliverable(artifact);

  const variant = artifact.chartPrintFiles.find(
    (file) => file.printSize === printSize,
  );
  if (!variant) {
    throw new StarOriginWorkflowError(
      "invalid_transition",
      "The requested standalone chart-print size is unavailable.",
    );
  }

  const root = await mkdtemp(join(tmpdir(), "kiaros-star-family-chart-"));
  const htmlPath = join(root, randomUUID() + ".html");
  const pdfPath = join(root, variant.fileName);
  const profilePath = join(root, "chromium-profile");

  try {
    await writeFile(
      htmlPath,
      renderStarFamilyChartPrintHtml(artifact, printSize),
      "utf8",
    );
    await execFileAsync(
      localChromiumPath(),
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
        "--user-data-dir=" + profilePath,
        "--print-to-pdf=" + pdfPath,
        pathToFileURL(htmlPath).href,
      ],
      { timeout: 45_000, windowsHide: true, maxBuffer: 2 * 1024 * 1024 },
    );

    const bytes = await readFile(pdfPath);
    if (
      !bytes.toString("latin1").startsWith("%PDF-") ||
      bytes.byteLength > MAXIMUM_PDF_BYTES
    ) {
      throw new StarOriginWorkflowError(
        "invalid_transition",
        "The Star Family chart failed its PDF signature or size boundary.",
      );
    }
    return {
      bytes: new Uint8Array(bytes),
      fileName: variant.fileName,
      sha256: createHash("sha256").update(bytes).digest("hex"),
    };
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

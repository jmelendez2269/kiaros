import { execFile } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { promisify } from "node:util";

import {
  renderAnchorPrintHtml,
  type AnchorDocumentKind,
  type AnchorPaperSize,
  type AnchorPrintArtifact,
} from "../anchor-print/index.ts";
import { ArtifactWorkflowError } from "./contract.ts";

const execFileAsync = promisify(execFile);

export interface ArtifactPdfExport {
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
    throw new ArtifactWorkflowError(
      "invalid_transition",
      "Local Chrome or Edge is required for PDF export.",
    );
  }
  return chromium;
}

export async function exportArtifactPdfWithLocalChromium(
  artifact: AnchorPrintArtifact,
  documentKind: AnchorDocumentKind,
  paperSize: AnchorPaperSize,
): Promise<ArtifactPdfExport> {
  const fileContract = artifact.files.find(
    (file) => file.documentKind === documentKind && file.paperSize === paperSize,
  );
  if (!fileContract) {
    throw new ArtifactWorkflowError("invalid_transition", "The requested paper size is unavailable.");
  }

  const root = await mkdtemp(join(tmpdir(), "kiaros-etsy-03-export-"));
  const htmlPath = join(root, `${randomUUID()}.html`);
  const pdfPath = join(root, fileContract.fileName);
  const profilePath = join(root, "chromium-profile");

  try {
    await writeFile(htmlPath, renderAnchorPrintHtml(artifact, paperSize, documentKind), "utf8");
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
        `--user-data-dir=${profilePath}`,
        `--print-to-pdf=${pdfPath}`,
        pathToFileURL(htmlPath).href,
      ],
      { timeout: 45_000, windowsHide: true, maxBuffer: 2 * 1024 * 1024 },
    );

    const bytes = await readFile(pdfPath);
    if (!bytes.toString("latin1").startsWith("%PDF-") || bytes.byteLength > fileContract.maximumBytes) {
      throw new ArtifactWorkflowError(
        "invalid_transition",
        "The local export failed its PDF signature or size boundary.",
      );
    }

    return {
      bytes: new Uint8Array(bytes),
      fileName: fileContract.fileName,
      sha256: createHash("sha256").update(bytes).digest("hex"),
    };
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

export async function exportArtifactPdfWithServerlessChromium(
  artifact: AnchorPrintArtifact,
  documentKind: AnchorDocumentKind,
  paperSize: AnchorPaperSize,
): Promise<ArtifactPdfExport> {
  const fileContract = artifact.files.find(
    (file) => file.documentKind === documentKind && file.paperSize === paperSize,
  );
  if (!fileContract) {
    throw new ArtifactWorkflowError("invalid_transition", "The requested paper size is unavailable.");
  }

  const [{ default: bundledChromium }, { default: puppeteer }] = await Promise.all([
    import("@sparticuz/chromium"),
    import("puppeteer-core"),
  ]);
  bundledChromium.setGraphicsMode = false;
  const browser = await puppeteer.launch({
    args: await puppeteer.defaultArgs({ args: bundledChromium.args, headless: "shell" }),
    executablePath: await bundledChromium.executablePath(),
    headless: "shell",
  });

  try {
    const page = await browser.newPage();
    await page.setContent(
      renderAnchorPrintHtml(artifact, paperSize, documentKind),
      { waitUntil: "load", timeout: 45_000 },
    );
    await page.emulateMediaType("print");
    const bytes = await page.pdf({
      displayHeaderFooter: false,
      outline: true,
      preferCSSPageSize: true,
      printBackground: true,
      tagged: true,
      timeout: 60_000,
      waitForFonts: true,
    });
    if (!Buffer.from(bytes).toString("latin1").startsWith("%PDF-") || bytes.byteLength > fileContract.maximumBytes) {
      throw new ArtifactWorkflowError(
        "invalid_transition",
        "The server export failed its PDF signature or size boundary.",
      );
    }
    return {
      bytes: new Uint8Array(bytes),
      fileName: fileContract.fileName,
      sha256: createHash("sha256").update(bytes).digest("hex"),
    };
  } finally {
    await browser.close();
  }
}

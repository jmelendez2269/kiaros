import "server-only";

import type {
  AnchorDocumentKind,
  AnchorPaperSize,
  AnchorPrintArtifact,
} from "../anchor-print/index.ts";
import { ArtifactWorkflowError } from "./contract.ts";
import { isArtifactWorkflowEnabled } from "./availability.ts";
import {
  exportArtifactPdfWithLocalChromium,
  exportArtifactPdfWithServerlessChromium,
  type ArtifactPdfExport,
} from "./pdf-export-core.ts";

export async function exportArtifactPdf(
  artifact: AnchorPrintArtifact,
  documentKind: AnchorDocumentKind,
  paperSize: AnchorPaperSize,
): Promise<ArtifactPdfExport> {
  if (!isArtifactWorkflowEnabled()) {
    throw new ArtifactWorkflowError(
      "invalid_transition",
      "PDF export requires the founder artifact workflow gate.",
    );
  }
  if (process.env.VERCEL === "1") {
    return exportArtifactPdfWithServerlessChromium(artifact, documentKind, paperSize);
  }
  return exportArtifactPdfWithLocalChromium(artifact, documentKind, paperSize);
}

export const exportLocalArtifactPdf = exportArtifactPdf;

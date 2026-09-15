import { NextResponse } from "next/server";
import { z } from "zod";

import {
  ArtifactAdminAccessError,
  requireLocalArtifactAdmin,
} from "@/lib/artifacts/fulfillment/admin-access";
import { exportStarFamilyChartPdf } from "@/lib/artifacts/star-origin/chart-print-export";
import { STAR_FAMILY_CHART_PRINT_SIZES } from "@/lib/artifacts/star-origin/contract";
import {
  getStarOriginWorkflowRecord,
  recordStarOriginExport,
  StarOriginWorkflowError,
} from "@/lib/artifacts/star-origin/workflow";

export const runtime = "nodejs";
export const maxDuration = 60;

const exportSchema = z.object({
  printSize: z.enum(STAR_FAMILY_CHART_PRINT_SIZES),
});

function errorResponse(error: unknown): NextResponse {
  if (error instanceof ArtifactAdminAccessError) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: error.status },
    );
  }
  if (error instanceof StarOriginWorkflowError) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: error.code === "not_found" ? 404 : 400 },
    );
  }
  return NextResponse.json(
    { success: false, error: "Star Family chart export failed closed." },
    { status: 500 },
  );
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ reportId: string }> },
) {
  try {
    const [{ actorId }, { reportId }] = await Promise.all([
      requireLocalArtifactAdmin(),
      params,
    ]);
    const parsed = exportSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: "Invalid chart-print size." },
        { status: 400 },
      );
    }

    const record = getStarOriginWorkflowRecord(reportId);
    if (record.stage !== "approved") {
      throw new StarOriginWorkflowError(
        "invalid_transition",
        "Approve the calculated chart before exporting its standalone print.",
      );
    }
    const result = await exportStarFamilyChartPdf(
      record.artifact,
      parsed.data.printSize,
    );
    const exportedAt = new Date().toISOString();
    recordStarOriginExport(reportId, {
      documentKind: "chart_print",
      paperSize: parsed.data.printSize,
      fileName: result.fileName,
      bytes: result.bytes.byteLength,
      sha256: result.sha256,
      exportedBy: actorId,
      exportedAt,
    });

    const responseBody = new ArrayBuffer(result.bytes.byteLength);
    new Uint8Array(responseBody).set(result.bytes);
    return new NextResponse(responseBody, {
      headers: {
        "Cache-Control": "no-store, private",
        "Content-Disposition": `attachment; filename="${result.fileName}"`,
        "Content-Length": String(result.bytes.byteLength),
        "Content-Type": "application/pdf",
        "X-Artifact-SHA256": result.sha256,
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}

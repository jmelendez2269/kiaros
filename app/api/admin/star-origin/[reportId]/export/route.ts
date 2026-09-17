import { NextResponse } from "next/server";
import { z } from "zod";

import {
  ArtifactAdminAccessError,
  requireLocalArtifactAdmin,
} from "@/lib/artifacts/fulfillment/admin-access";
import { exportStarOriginPdf } from "@/lib/artifacts/star-origin/pdf-export";
import {
  getStarOriginWorkflowRecord,
  recordStarOriginExport,
  StarOriginWorkflowError,
} from "@/lib/artifacts/star-origin/workflow";

export const runtime = "nodejs";
export const maxDuration = 60;

const exportSchema = z.object({ paperSize: z.enum(["letter", "a4"]) });

function errorResponse(error: unknown): NextResponse {
  if (error instanceof ArtifactAdminAccessError) {
    return NextResponse.json({ success: false, error: error.message }, { status: error.status });
  }
  if (error instanceof StarOriginWorkflowError) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: error.code === "not_found" ? 404 : 400 },
    );
  }
  return NextResponse.json(
    { success: false, error: "Star Origin PDF export failed closed." },
    { status: 500 },
  );
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ reportId: string }> },
) {
  try {
    const [{ actorId }, { reportId }] = await Promise.all([requireLocalArtifactAdmin(), params]);
    const parsed = exportSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: "Invalid paper size." }, { status: 400 });
    }

    const record = getStarOriginWorkflowRecord(reportId);
    const result = await exportStarOriginPdf(record.artifact, parsed.data.paperSize);
    const exportedAt = new Date().toISOString();
    recordStarOriginExport(reportId, {
      documentKind: "report",
      paperSize: parsed.data.paperSize,
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

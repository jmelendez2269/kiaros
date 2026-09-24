import { NextResponse } from "next/server";
import { z } from "zod";

import {
  ArtifactAdminAccessError,
  requireArtifactAdmin,
} from "@/lib/artifacts/fulfillment/admin-access";
import { ArtifactWorkflowError } from "@/lib/artifacts/fulfillment/contract";
import { exportArtifactPdf } from "@/lib/artifacts/fulfillment/pdf-export";
import { getArtifactWorkflowRepository } from "@/lib/artifacts/fulfillment/repository";

export const runtime = "nodejs";
export const maxDuration = 120;

const exportSchema = z.object({
  documentKind: z.enum(["report", "anchor_print"]),
  paperSize: z.enum(["letter", "a4"]),
});

function errorResponse(error: unknown): NextResponse {
  if (error instanceof ArtifactAdminAccessError) {
    return NextResponse.json({ success: false, error: error.message }, { status: error.status });
  }
  if (error instanceof ArtifactWorkflowError) {
    const status = error.code === "not_found" ? 404 : 400;
    return NextResponse.json({ success: false, error: error.message }, { status });
  }
  console.error("[admin/artifacts/export] Unexpected error:", error);
  return NextResponse.json({ success: false, error: "PDF export failed closed." }, { status: 500 });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ orderId: string }> },
) {
  try {
    const [{ actorId }, { orderId }] = await Promise.all([
      requireArtifactAdmin(),
      params,
    ]);
    const parsed = exportSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: "Invalid file variant." }, { status: 400 });
    }

    const { repository } = getArtifactWorkflowRepository();
    const record = await repository.get(orderId);
    if (!record.artifact) {
      throw new ArtifactWorkflowError("invalid_transition", "Generate and approve the artifact first.");
    }

    const result = await exportArtifactPdf(
      record.artifact,
      parsed.data.documentKind,
      parsed.data.paperSize,
    );
    await repository.recordExport(
      orderId,
      parsed.data.documentKind,
      parsed.data.paperSize,
      {
        revision: record.revision,
        fileName: result.fileName,
        bytes: result.bytes.byteLength,
        sha256: result.sha256,
        exportedBy: actorId,
        exportedAt: new Date().toISOString(),
      },
      actorId,
      result.bytes,
    );

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

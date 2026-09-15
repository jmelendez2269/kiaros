import { NextResponse } from "next/server";
import { z } from "zod";

import { ArtifactAdminAccessError, requireLocalArtifactAdmin } from "@/lib/artifacts/fulfillment/admin-access";
import { CELESTIAL_YEAR_MAP_PRINT_SIZES, YearAheadContractError } from "@/lib/artifacts/year-ahead/contract";
import { exportCelestialYearMapPdf } from "@/lib/artifacts/year-ahead/pdf-export";
import { getYearAheadWorkflowRecord, recordYearAheadExport, YearAheadWorkflowError } from "@/lib/artifacts/year-ahead/workflow";

export const runtime = "nodejs";
export const maxDuration = 60;
const exportSchema = z.object({ printSize: z.enum(CELESTIAL_YEAR_MAP_PRINT_SIZES) });

function errorResponse(error: unknown): NextResponse {
  if (error instanceof ArtifactAdminAccessError) return NextResponse.json({ success: false, error: error.message }, { status: error.status });
  if (error instanceof YearAheadWorkflowError) return NextResponse.json({ success: false, error: error.message }, { status: error.code === "not_found" ? 404 : 400 });
  if (error instanceof YearAheadContractError) return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  return NextResponse.json({ success: false, error: "Celestial Year Map export failed closed." }, { status: 500 });
}

export async function POST(request: Request, { params }: { params: Promise<{ reportId: string }> }) {
  try {
    const [{ actorId }, { reportId }] = await Promise.all([requireLocalArtifactAdmin(), params]);
    const parsed = exportSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ success: false, error: "Invalid map print size." }, { status: 400 });
    const record = getYearAheadWorkflowRecord(reportId);
    const result = await exportCelestialYearMapPdf(record.artifact, parsed.data.printSize);
    const exportedAt = new Date().toISOString();
    recordYearAheadExport(reportId, { documentKind: "year_map", size: parsed.data.printSize, fileName: result.fileName, bytes: result.bytes.byteLength, sha256: result.sha256, exportedBy: actorId, exportedAt });
    const body = new ArrayBuffer(result.bytes.byteLength); new Uint8Array(body).set(result.bytes);
    return new NextResponse(body, { headers: { "Cache-Control": "no-store, private", "Content-Disposition": `attachment; filename="${result.fileName}"`, "Content-Length": String(result.bytes.byteLength), "Content-Type": "application/pdf", "X-Artifact-SHA256": result.sha256 } });
  } catch (error) { return errorResponse(error); }
}

import { NextResponse } from "next/server";
import { z } from "zod";

import { ArtifactAdminAccessError, requireLocalArtifactAdmin } from "@/lib/artifacts/fulfillment/admin-access";
import { YEAR_AHEAD_QA_ITEM_IDS, YearAheadContractError } from "@/lib/artifacts/year-ahead/contract";
import {
  approveYearAheadWorkflowRecord,
  listYearAheadWorkflowRecords,
  rejectYearAheadWorkflowRecord,
  synthesizeYearAheadWorkflowRecord,
  YearAheadWorkflowError,
} from "@/lib/artifacts/year-ahead/workflow";

export const runtime = "nodejs";
export const maxDuration = 300;

const actionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("synthesize"), externalAiConsent: z.literal(true) }),
  z.object({ action: z.literal("approve"), completedQa: z.array(z.enum(YEAR_AHEAD_QA_ITEM_IDS)) }),
  z.object({ action: z.literal("reject"), note: z.string().trim().min(1).max(1_000) }),
]);

function errorResponse(error: unknown): NextResponse {
  if (error instanceof ArtifactAdminAccessError) return NextResponse.json({ success: false, error: error.message }, { status: error.status });
  if (error instanceof YearAheadWorkflowError) return NextResponse.json({ success: false, error: error.message }, { status: error.code === "not_found" ? 404 : 400 });
  if (error instanceof YearAheadContractError) return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  return NextResponse.json({ success: false, error: "Year Ahead action failed closed." }, { status: 500 });
}

export async function POST(request: Request, { params }: { params: Promise<{ reportId: string }> }) {
  try {
    const [{ actorId }, { reportId }] = await Promise.all([requireLocalArtifactAdmin(), params]);
    const parsed = actionSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ success: false, error: parsed.error.issues[0]?.message ?? "Invalid workflow action." }, { status: 400 });
    const action = parsed.data;
    const record = action.action === "synthesize"
      ? await synthesizeYearAheadWorkflowRecord(reportId, actorId, action.externalAiConsent)
      : action.action === "approve"
        ? approveYearAheadWorkflowRecord(reportId, actorId, action.completedQa)
        : rejectYearAheadWorkflowRecord(reportId, actorId, action.note);
    return NextResponse.json({ success: true, record, reports: listYearAheadWorkflowRecords() });
  } catch (error) {
    return errorResponse(error);
  }
}

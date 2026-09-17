import { NextResponse } from "next/server";
import { z } from "zod";

import {
  ArtifactAdminAccessError,
  requireLocalArtifactAdmin,
} from "@/lib/artifacts/fulfillment/admin-access";
import { STAR_ORIGIN_QA_ITEM_IDS } from "@/lib/artifacts/star-origin/contract";
import {
  approveStarOriginWorkflowRecord,
  listStarOriginWorkflowRecords,
  rejectStarOriginWorkflowRecord,
  StarOriginWorkflowError,
  synthesizeStarOriginWorkflowRecord,
} from "@/lib/artifacts/star-origin/workflow";

export const runtime = "nodejs";
export const maxDuration = 60;

const actionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("synthesize"), externalAiConsent: z.literal(true) }),
  z.object({
    action: z.literal("approve"),
    completedQa: z.array(z.enum(STAR_ORIGIN_QA_ITEM_IDS)),
  }),
  z.object({ action: z.literal("reject"), note: z.string().trim().min(1).max(1_000) }),
]);

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
    { success: false, error: "Star Origin action failed closed." },
    { status: 500 },
  );
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ reportId: string }> },
) {
  try {
    const { actorId } = await requireLocalArtifactAdmin();
    const { reportId } = await params;
    const parsed = actionSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0]?.message ?? "Invalid workflow action." },
        { status: 400 },
      );
    }

    const action = parsed.data;
    const record =
      action.action === "synthesize"
        ? await synthesizeStarOriginWorkflowRecord(reportId, actorId, action.externalAiConsent)
        : action.action === "approve"
          ? approveStarOriginWorkflowRecord(
              reportId,
              actorId,
              new Date(),
              action.completedQa,
            )
          : rejectStarOriginWorkflowRecord(reportId, actorId, action.note);

    return NextResponse.json({
      success: true,
      record,
      reports: listStarOriginWorkflowRecords(),
    });
  } catch (error) {
    return errorResponse(error);
  }
}

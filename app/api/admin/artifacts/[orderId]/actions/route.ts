import { NextResponse } from "next/server";
import { z } from "zod";

import {
  ArtifactAdminAccessError,
  requireArtifactAdmin,
} from "@/lib/artifacts/fulfillment/admin-access";
import {
  ARTIFACT_QA_ITEM_IDS,
  ArtifactWorkflowError,
} from "@/lib/artifacts/fulfillment/contract";
import { getArtifactWorkflowRepository } from "@/lib/artifacts/fulfillment/repository";

export const runtime = "nodejs";

const actionSchema = z.object({
  action: z.enum([
    "validate_intake",
    "request_clarification",
    "resolve_clarification",
    "generate",
    "approve_qa",
    "request_revision",
    "cancel",
    "record_refund",
  ]),
  completedQa: z.array(z.enum(ARTIFACT_QA_ITEM_IDS)).default([]),
});

function errorResponse(error: unknown): NextResponse {
  if (error instanceof ArtifactAdminAccessError) {
    return NextResponse.json({ success: false, error: error.message }, { status: error.status });
  }
  if (error instanceof ArtifactWorkflowError) {
    const status = error.code === "not_found" ? 404 : error.code === "idempotency_conflict" ? 409 : 400;
    return NextResponse.json({ success: false, error: error.message }, { status });
  }
  return NextResponse.json({ success: false, error: "Artifact action failed closed." }, { status: 500 });
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
    const parsed = actionSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0]?.message ?? "Invalid workflow action." },
        { status: 400 },
      );
    }

    const { mode, repository } = getArtifactWorkflowRepository();
    await repository.act(orderId, parsed.data.action, actorId, parsed.data.completedQa);
    return NextResponse.json({ success: true, mode, orders: await repository.list() });
  } catch (error) {
    return errorResponse(error);
  }
}

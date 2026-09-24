import { NextResponse } from "next/server";
import { z } from "zod";

import type { AnchorNormalizedBirth } from "@/lib/artifacts/anchor-print";
import { AnchorPrintContractError } from "@/lib/artifacts/anchor-print/contract";
import {
  buildProductionAnchorCalculation,
  createProductionAnchorInput,
} from "@/lib/artifacts/anchor-print/production";
import { generateProductionAnchorNarrative } from "@/lib/artifacts/fulfillment/narrative";
import {
  ArtifactAdminAccessError,
  requireArtifactAdmin,
} from "@/lib/artifacts/fulfillment/admin-access";
import {
  isLocalArtifactWorkflowEnabled,
  isRealArtifactIntakeEnabled,
} from "@/lib/artifacts/fulfillment/availability";
import { ArtifactWorkflowError } from "@/lib/artifacts/fulfillment/contract";
import { getArtifactWorkflowRepository } from "@/lib/artifacts/fulfillment/repository";
import {
  fingerprintManualArtifactIntake,
} from "@/lib/artifacts/fulfillment/workflow";

export const runtime = "nodejs";
export const maxDuration = 300;

const fixtureSchema = z.object({
  fixtureKind: z.enum(["known_time", "unknown_time"]),
});

const sourcePart = z.string().trim().min(1).max(120).regex(/^[^:\s]+$/, "Use an identifier without spaces or colons.");
const timeZone = z.string().trim().min(1).max(64).refine((value) => {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: value }).format(new Date(0));
    return true;
  } catch {
    return false;
  }
}, "Enter a valid IANA timezone, such as America/New_York.");

const manualSchema = z.object({
  kind: z.literal("manual"),
  shopId: sourcePart,
  receiptId: sourcePart,
  transactionId: sourcePart,
  unitIndex: z.number().int().min(1).max(99).default(1),
  listingId: z.string().trim().max(120).nullable(),
  purchasedAt: z.string().datetime(),
  supportEmail: z.string().trim().email().max(254),
  displayName: z.string().trim().min(1).max(80),
  birthDate: z.string().date(),
  birthTime: z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/).nullable(),
  birthTimeUnknown: z.boolean(),
  birthCity: z.string().trim().min(1).max(120),
  birthCountry: z.string().trim().min(1).max(120),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  timezone: timeZone,
  detailsConfirmed: z.literal(true),
  aiDisclosureConfirmed: z.literal(true),
}).superRefine((value, context) => {
  if (!value.birthTimeUnknown && value.birthTime === null) {
    context.addIssue({ code: "custom", path: ["birthTime"], message: "Birth time is required unless marked unknown." });
  }
  if (value.birthTimeUnknown && value.birthTime !== null) {
    context.addIssue({ code: "custom", path: ["birthTime"], message: "Clear the birth time when it is marked unknown." });
  }
});

function errorResponse(error: unknown): NextResponse {
  if (error instanceof ArtifactAdminAccessError) {
    return NextResponse.json({ success: false, error: error.message }, { status: error.status });
  }
  if (error instanceof ArtifactWorkflowError) {
    const status = error.code === "not_found" ? 404 : error.code === "idempotency_conflict" ? 409 : 400;
    return NextResponse.json({ success: false, error: error.message }, { status });
  }
  if (error instanceof AnchorPrintContractError) {
    console.error("[admin/artifacts] AnchorPrintContractError:", error.message, error.stack);
    return NextResponse.json(
      {
        success: false,
        error: "Anchor artifact generation failed: contract validation error. Check server logs for details.",
      },
      { status: 500 },
    );
  }
  console.error("[admin/artifacts] Unexpected error:", error);
  return NextResponse.json({ success: false, error: "Artifact workflow failed closed." }, { status: 500 });
}

export async function GET() {
  try {
    await requireArtifactAdmin();
    const { mode, repository } = getArtifactWorkflowRepository();
    return NextResponse.json({ success: true, mode, orders: await repository.list() });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const { actorId } = await requireArtifactAdmin();
    const body = await request.json().catch(() => null);
    const fixture = fixtureSchema.safeParse(body);
    const manual = fixture.success ? null : manualSchema.safeParse(body);
    if (!fixture.success && (!manual || !manual.success)) {
      return NextResponse.json(
        { success: false, error: manual?.error.issues[0]?.message ?? "Invalid artifact intake." },
        { status: 400 },
      );
    }

    const { mode, repository } = getArtifactWorkflowRepository();
    if (fixture.success) {
      if (!isLocalArtifactWorkflowEnabled()) {
        throw new ArtifactWorkflowError(
          "fictional_data_required",
          "Fictional fixtures are available only in local development.",
        );
      }
      await repository.createFixture(fixture.data.fixtureKind, actorId);
    } else {
      if (!isRealArtifactIntakeEnabled()) {
        throw new ArtifactWorkflowError(
          "manual_data_required",
          "Manual intake remains disabled unless its local-only source flag is explicitly enabled.",
        );
      }
      if (!manual?.success) {
        throw new ArtifactWorkflowError("ambiguous_intake", "Manual intake could not be validated.");
      }
      const data = manual.data;
      const normalizedBirth: AnchorNormalizedBirth = {
        date: data.birthDate,
        time: data.birthTimeUnknown ? null : data.birthTime,
        timeUnknown: data.birthTimeUnknown,
        city: data.birthCity,
        country: data.birthCountry,
        timezone: data.timezone,
        latitude: data.latitude,
        longitude: data.longitude,
      };
      const calculation = buildProductionAnchorCalculation(normalizedBirth);
      const source = {
        source: "etsy" as const,
        shopId: data.shopId,
        receiptId: data.receiptId,
        transactionId: data.transactionId,
        unitIndex: data.unitIndex,
        quantity: 1,
        listingId: data.listingId,
        purchasedAt: data.purchasedAt,
      };
      const sourcePayloadFingerprint = fingerprintManualArtifactIntake({
        source,
        supportEmail: data.supportEmail,
        displayName: data.displayName,
        normalizedBirth,
      });
      const narrative = await generateProductionAnchorNarrative(calculation, data.birthTimeUnknown);
      const generatorInput = createProductionAnchorInput({
        artifactId: `art_${sourcePayloadFingerprint.slice(0, 32)}`,
        displayName: data.displayName,
        normalizedBirth,
        narrative,
      });
      await repository.createManual(
        {
          fictional: false,
          source,
          sku: "KAI-ETSY-ANCHOR-V1",
          supportEmail: data.supportEmail,
          displayName: data.displayName,
          sourcePayloadFingerprint,
          generatorInput,
        },
        actorId,
      );
    }
    return NextResponse.json({ success: true, mode, orders: await repository.list() });
  } catch (error) {
    return errorResponse(error);
  }
}

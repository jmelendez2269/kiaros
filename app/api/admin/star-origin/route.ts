import { NextResponse } from "next/server";
import { z } from "zod";

import {
  ArtifactAdminAccessError,
  requireLocalArtifactAdmin,
} from "@/lib/artifacts/fulfillment/admin-access";
import { isLocalRealArtifactIntakeEnabled } from "@/lib/artifacts/fulfillment/availability";
import {
  createStarOriginEtsyWorkflowRecord,
  listStarOriginWorkflowRecords,
  StarOriginWorkflowError,
} from "@/lib/artifacts/star-origin/workflow";

export const runtime = "nodejs";
export const maxDuration = 60;

const createSchema = z
  .object({
    productKey: z.enum(["star_origin_report", "star_family_chart"]),
    shopId: z.string().trim().min(1).max(120).regex(/^[^:\s]+$/, "Use a shop identifier without spaces or colons."),
    receiptId: z.string().trim().min(1).max(120).regex(/^[^:\s]+$/, "Use an order number without spaces or colons."),
    transactionId: z.string().trim().min(1).max(120).regex(/^[^:\s]+$/, "Use a transaction ID without spaces or colons."),
    unitIndex: z.number().int().min(1).max(99),
    listingId: z.string().trim().max(120).nullable(),
    purchasedAt: z.string().datetime(),
    supportEmail: z.string().trim().email().max(254),
    detailsConfirmed: z.literal(true),
    displayName: z.string().trim().max(80).nullable(),
    birthDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    birthTime: z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/),
    birthCity: z.string().trim().min(1).max(100),
    birthCountry: z.string().trim().min(1).max(100),
    timezone: z.string().trim().min(1).max(64),
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180),
  })
  .superRefine((value, context) => {
    try {
      new Intl.DateTimeFormat("en-US", { timeZone: value.timezone }).format(
        new Date(0),
      );
    } catch {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["timezone"],
        message: "Enter a valid IANA timezone, such as America/New_York.",
      });
    }
  });

function errorResponse(error: unknown): NextResponse {
  if (error instanceof ArtifactAdminAccessError) {
    return NextResponse.json({ success: false, error: error.message }, { status: error.status });
  }
  if (error instanceof StarOriginWorkflowError) {
    return NextResponse.json(
      { success: false, error: error.message },
      {
        status:
          error.code === "not_found"
            ? 404
            : error.code === "idempotency_conflict"
              ? 409
              : 400,
      },
    );
  }
  const message = error instanceof Error ? error.message : "Star Origin workflow failed closed.";
  return NextResponse.json({ success: false, error: message }, { status: 500 });
}

export async function GET() {
  try {
    await requireLocalArtifactAdmin();
    return NextResponse.json(
      { success: true, reports: listStarOriginWorkflowRecords() },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const { actorId } = await requireLocalArtifactAdmin();
    if (!isLocalRealArtifactIntakeEnabled()) {
      throw new StarOriginWorkflowError(
        "ambiguous_intake",
        "Manual Star Origin Etsy intake is disabled unless the local-only real-intake flag is explicitly enabled.",
      );
    }
    const parsed = createSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0]?.message ?? "Invalid Star Origin input." },
        { status: 400 },
      );
    }
    const value = parsed.data;
    const record = createStarOriginEtsyWorkflowRecord(
      {
        productKey: value.productKey,
        supportEmail: value.supportEmail,
        source: {
          source: "etsy",
          shopId: value.shopId,
          receiptId: value.receiptId,
          transactionId: value.transactionId,
          unitIndex: value.unitIndex,
          quantity: 1,
          listingId: value.listingId,
          purchasedAt: value.purchasedAt,
        },
      },
      {
        displayName: value.displayName || null,
        tier: "standard",
        normalizedBirth: {
          date: value.birthDate,
          time: value.birthTime,
          timeUnknown: false,
          city: value.birthCity,
          country: value.birthCountry,
          timezone: value.timezone,
          latitude: value.latitude,
          longitude: value.longitude,
        },
      },
      actorId,
    );
    return NextResponse.json({ success: true, record, reports: listStarOriginWorkflowRecords() });
  } catch (error) {
    return errorResponse(error);
  }
}

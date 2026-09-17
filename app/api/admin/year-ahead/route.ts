import { NextResponse } from "next/server";
import { z } from "zod";

import { ArtifactAdminAccessError, requireLocalArtifactAdmin } from "@/lib/artifacts/fulfillment/admin-access";
import { isLocalRealArtifactIntakeEnabled } from "@/lib/artifacts/fulfillment/availability";
import {
  createYearAheadEtsyWorkflowRecord,
  listYearAheadWorkflowRecords,
  YearAheadWorkflowError,
} from "@/lib/artifacts/year-ahead/workflow";
import { YearAheadContractError } from "@/lib/artifacts/year-ahead/contract";

export const runtime = "nodejs";
export const maxDuration = 60;

const placeSchema = {
  city: z.string().trim().min(1).max(100),
  country: z.string().trim().min(1).max(100),
  timezone: z.string().trim().min(1).max(64),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
};

const createSchema = z.object({
  productKey: z.enum(["year_ahead_report", "celestial_year_map"]),
  shopId: z.string().trim().min(1).max(120).regex(/^[^:\s]+$/),
  receiptId: z.string().trim().min(1).max(120).regex(/^[^:\s]+$/),
  transactionId: z.string().trim().min(1).max(120).regex(/^[^:\s]+$/),
  unitIndex: z.number().int().min(1).max(99),
  listingId: z.string().trim().max(120).nullable(),
  purchasedAt: z.string().datetime(),
  supportEmail: z.string().trim().email().max(254),
  detailsConfirmed: z.literal(true),
  displayName: z.string().trim().min(1).max(80),
  targetBirthdayYear: z.number().int().min(1900).max(2200),
  birthDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  birthTime: z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/),
  birthCity: placeSchema.city,
  birthCountry: placeSchema.country,
  birthTimezone: placeSchema.timezone,
  birthLatitude: placeSchema.latitude,
  birthLongitude: placeSchema.longitude,
  returnCity: placeSchema.city,
  returnCountry: placeSchema.country,
  returnTimezone: placeSchema.timezone,
  returnLatitude: placeSchema.latitude,
  returnLongitude: placeSchema.longitude,
});

function errorResponse(error: unknown): NextResponse {
  if (error instanceof ArtifactAdminAccessError) return NextResponse.json({ success: false, error: error.message }, { status: error.status });
  if (error instanceof YearAheadWorkflowError) {
    return NextResponse.json({ success: false, error: error.message }, { status: error.code === "not_found" ? 404 : error.code === "idempotency_conflict" ? 409 : 400 });
  }
  if (error instanceof YearAheadContractError) return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  return NextResponse.json({ success: false, error: error instanceof Error ? error.message : "Year Ahead workflow failed closed." }, { status: 500 });
}

export async function GET() {
  try {
    await requireLocalArtifactAdmin();
    return NextResponse.json({ success: true, reports: listYearAheadWorkflowRecords() }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const { actorId } = await requireLocalArtifactAdmin();
    if (!isLocalRealArtifactIntakeEnabled()) {
      throw new YearAheadWorkflowError("ambiguous_intake", "Manual Year Ahead Etsy intake is disabled unless the local-only real-intake flag is explicitly enabled.");
    }
    const parsed = createSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ success: false, error: parsed.error.issues[0]?.message ?? "Invalid Year Ahead input." }, { status: 400 });
    const value = parsed.data;
    const record = createYearAheadEtsyWorkflowRecord({
      productKey: value.productKey,
      supportEmail: value.supportEmail,
      source: {
        source: "etsy", shopId: value.shopId, receiptId: value.receiptId,
        transactionId: value.transactionId, unitIndex: value.unitIndex, quantity: 1,
        listingId: value.listingId, purchasedAt: value.purchasedAt,
      },
    }, {
      displayName: value.displayName,
      targetBirthdayYear: value.targetBirthdayYear,
      normalizedBirth: {
        date: value.birthDate, time: value.birthTime, city: value.birthCity,
        country: value.birthCountry, timezone: value.birthTimezone,
        latitude: value.birthLatitude, longitude: value.birthLongitude,
      },
      returnPlace: {
        city: value.returnCity, country: value.returnCountry, timezone: value.returnTimezone,
        latitude: value.returnLatitude, longitude: value.returnLongitude,
      },
    }, actorId);
    return NextResponse.json({ success: true, record, reports: listYearAheadWorkflowRecords() });
  } catch (error) {
    return errorResponse(error);
  }
}

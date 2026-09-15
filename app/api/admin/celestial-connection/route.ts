import { NextResponse } from "next/server";
import { z } from "zod";

import { ArtifactAdminAccessError, requireLocalArtifactAdmin } from "@/lib/artifacts/fulfillment/admin-access";
import { isLocalRealArtifactIntakeEnabled } from "@/lib/artifacts/fulfillment/availability";
import { CONNECTION_RELATIONSHIP_TYPES, CelestialConnectionContractError } from "@/lib/artifacts/celestial-connection/contract";
import { createCelestialConnectionEtsyWorkflowRecord, listCelestialConnectionWorkflowRecords, CelestialConnectionWorkflowError } from "@/lib/artifacts/celestial-connection/workflow";

export const runtime = "nodejs"; export const maxDuration = 60;
const personSchema = z.object({
  displayName: z.string().trim().min(1).max(60), birthDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  birthTime: z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/).nullable(), timeUnknown: z.boolean(),
  city: z.string().trim().min(1).max(100), country: z.string().trim().min(1).max(100), timezone: z.string().trim().min(1).max(64),
  latitude: z.number().min(-90).max(90), longitude: z.number().min(-180).max(180),
});
const createSchema = z.object({
  productKey: z.enum(["relationship_report", "connection_map"]), relationshipType: z.enum(CONNECTION_RELATIONSHIP_TYPES),
  shopId: z.string().trim().min(1).max(120).regex(/^[^:\s]+$/), receiptId: z.string().trim().min(1).max(120).regex(/^[^:\s]+$/),
  transactionId: z.string().trim().min(1).max(120).regex(/^[^:\s]+$/), unitIndex: z.number().int().min(1).max(99),
  listingId: z.string().trim().max(120).nullable(), purchasedAt: z.string().datetime(), supportEmail: z.string().trim().email().max(254),
  detailsConfirmed: z.literal(true), personA: personSchema, personB: personSchema,
});
function errorResponse(error: unknown): NextResponse {
  if (error instanceof ArtifactAdminAccessError) return NextResponse.json({ success: false, error: error.message }, { status: error.status });
  if (error instanceof CelestialConnectionWorkflowError) return NextResponse.json({ success: false, error: error.message }, { status: error.code === "not_found" ? 404 : error.code === "idempotency_conflict" ? 409 : 400 });
  if (error instanceof CelestialConnectionContractError) return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  return NextResponse.json({ success: false, error: "Celestial Connection workflow failed closed." }, { status: 500 });
}
export async function GET() { try { await requireLocalArtifactAdmin(); return NextResponse.json({ success: true, reports: listCelestialConnectionWorkflowRecords() }, { headers: { "Cache-Control": "no-store" } }); } catch (error) { return errorResponse(error); } }
export async function POST(request: Request) {
  try {
    const { actorId } = await requireLocalArtifactAdmin(); if (!isLocalRealArtifactIntakeEnabled()) throw new CelestialConnectionWorkflowError("ambiguous_intake", "Manual Celestial Connection Etsy intake requires the local-only real-intake flag.");
    const parsed = createSchema.safeParse(await request.json().catch(() => null)); if (!parsed.success) return NextResponse.json({ success: false, error: parsed.error.issues[0]?.message ?? "Invalid relationship order." }, { status: 400 });
    const value = parsed.data; const person = (item: z.infer<typeof personSchema>) => ({ displayName: item.displayName, date: item.birthDate, time: item.timeUnknown ? null : item.birthTime, timeUnknown: item.timeUnknown, place: { city: item.city, country: item.country, timezone: item.timezone, latitude: item.latitude, longitude: item.longitude } });
    const record = createCelestialConnectionEtsyWorkflowRecord({ productKey: value.productKey, supportEmail: value.supportEmail, source: { source: "etsy", shopId: value.shopId, receiptId: value.receiptId, transactionId: value.transactionId, unitIndex: value.unitIndex, quantity: 1, listingId: value.listingId, purchasedAt: value.purchasedAt } }, { relationshipType: value.relationshipType, personA: person(value.personA), personB: person(value.personB) }, actorId);
    return NextResponse.json({ success: true, record, reports: listCelestialConnectionWorkflowRecords() });
  } catch (error) { return errorResponse(error); }
}

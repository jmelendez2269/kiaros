/**
 * /api/blueprint (Phase 1 stub)
 * Replaced by /api/blueprint/generate and /api/blueprint/status in Phase 2.
 */

import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({ error: "Use /api/blueprint/status" }, { status: 301 });
}

export async function POST() {
  return NextResponse.json({ error: "Use /api/blueprint/generate" }, { status: 301 });
}

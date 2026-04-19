/**
 * POST /api/feedback
 *
 * Submit user feedback for beta learning
 *
 * TODO: Complete implementation with Supabase
 */

import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { type, message, rating } = body;

    // TODO: Validate feedback data
    // TODO: Insert into feedback table in Supabase
    // TODO: Send notification to team (optional)

    return NextResponse.json(
      { error: "Feedback submission not yet implemented" },
      { status: 501 }
    );
  } catch (error) {
    console.error("Feedback API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import { getCommerceTier, parseAccessPlan, parseCommerceTierKey } from "@/lib/commerce/config";
import { createCheckoutSession } from "@/lib/commerce/stripe";
import { createAdminSupabase } from "@/lib/supabase/admin";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "Sign in before starting checkout." }, { status: 401 });
  }

  const payload = await request.json().catch(() => null);
  const tierKey = parseCommerceTierKey(payload?.tierKey);
  const accessPlan = parseAccessPlan(payload?.accessPlan) ?? "yearly";

  if (!tierKey) {
    return NextResponse.json({ error: "Choose a valid tier first." }, { status: 400 });
  }

  const tier = getCommerceTier(tierKey);
  const supabase = createAdminSupabase();

  const { data: profile, error: profileError } = await supabase
    .from("user_profiles")
    .select("email")
    .eq("clerk_user_id", userId)
    .single();

  if (profileError || !profile?.email) {
    return NextResponse.json(
      { error: "Your profile email isn't ready yet. Please try again in a moment." },
      { status: 409 }
    );
  }

  try {
    const session = await createCheckoutSession({
      tier,
      accessPlan,
      clerkUserId: userId,
      customerEmail: profile.email,
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Stripe Checkout couldn't start right now.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}

import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import { getStripeClient } from "@/lib/commerce/stripe";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { BRAND } from "@/lib/brand";

export const runtime = "nodejs";

function getAppUrl() {
  return process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3699";
}

export async function POST() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Sign in before managing billing." }, { status: 401 });
  }

  const supabase = createAdminSupabase();
  const { data: profile } = await supabase
    .from("user_profiles")
    .select("id")
    .eq("clerk_user_id", userId)
    .single();

  if (!profile) {
    return NextResponse.json({ error: `Your ${BRAND.product} profile is not ready yet.` }, { status: 409 });
  }

  const { data: order } = await supabase
    .from("direct_purchase_orders")
    .select("stripe_customer_id")
    .eq("user_id", profile.id)
    .not("stripe_customer_id", "is", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!order?.stripe_customer_id) {
    return NextResponse.json(
      { error: `No Stripe billing account is linked to this ${BRAND.product} account yet.` },
      { status: 404 }
    );
  }

  const session = await getStripeClient().billingPortal.sessions.create({
    customer: order.stripe_customer_id,
    return_url: `${getAppUrl()}/settings`,
  });

  return NextResponse.json({ url: session.url });
}

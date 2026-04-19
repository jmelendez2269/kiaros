import { Webhook } from "svix";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import type { WebhookEvent } from "@clerk/nextjs/server";
import { createAdminSupabase } from "@/lib/supabase/admin";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const secret = process.env.CLERK_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "Missing CLERK_WEBHOOK_SECRET" }, { status: 500 });
  }

  const h = await headers();
  const svixId = h.get("svix-id");
  const svixTimestamp = h.get("svix-timestamp");
  const svixSignature = h.get("svix-signature");
  if (!svixId || !svixTimestamp || !svixSignature) {
    return NextResponse.json({ error: "Missing svix headers" }, { status: 400 });
  }

  const payload = await req.text();
  let evt: WebhookEvent;
  try {
    evt = new Webhook(secret).verify(payload, {
      "svix-id": svixId,
      "svix-timestamp": svixTimestamp,
      "svix-signature": svixSignature,
    }) as WebhookEvent;
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const supabase = createAdminSupabase();

  if (evt.type === "user.created") {
    const { id, email_addresses, first_name, last_name } = evt.data;
    const email = email_addresses?.[0]?.email_address;
    if (!email) {
      return NextResponse.json({ error: "User has no email" }, { status: 400 });
    }
    const displayName = [first_name, last_name].filter(Boolean).join(" ") || null;

    const { error } = await supabase
      .from("user_profiles")
      .upsert(
        { clerk_user_id: id, email, display_name: displayName },
        { onConflict: "clerk_user_id" }
      );
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  } else if (evt.type === "user.updated") {
    const { id, email_addresses, first_name, last_name } = evt.data;
    const email = email_addresses?.[0]?.email_address;
    const displayName = [first_name, last_name].filter(Boolean).join(" ") || null;
    const { error } = await supabase
      .from("user_profiles")
      .update({ email, display_name: displayName })
      .eq("clerk_user_id", id);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  } else if (evt.type === "user.deleted") {
    const { id } = evt.data;
    if (id) {
      const { error } = await supabase.from("user_profiles").delete().eq("clerk_user_id", id);
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
    }
  }

  return NextResponse.json({ received: true });
}

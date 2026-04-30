import { NextResponse } from "next/server";
import Stripe from "stripe";

import {
  fulfillCheckoutSession,
  getStripeClient,
  syncInvoiceSubscription,
  syncSubscriptionEntitlement,
} from "@/lib/commerce/stripe";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    return NextResponse.json({ error: "Missing STRIPE_WEBHOOK_SECRET" }, { status: 500 });
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing Stripe signature" }, { status: 400 });
  }

  const body = await request.text();
  let stripe: Stripe;
  let event: Stripe.Event;

  try {
    stripe = getStripeClient();
  } catch (error) {
    const message = error instanceof Error ? error.message : "Missing Stripe configuration";
    return NextResponse.json({ error: message }, { status: 500 });
  }

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch {
    return NextResponse.json({ error: "Invalid Stripe signature" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed":
      case "checkout.session.async_payment_succeeded": {
        const session = event.data.object as Stripe.Checkout.Session;
        await fulfillCheckoutSession({ sessionId: session.id });
        break;
      }

      case "invoice.payment_succeeded":
      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        await syncInvoiceSubscription(invoice);
        break;
      }

      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        await syncSubscriptionEntitlement(subscription);
        break;
      }

      default:
        break;
    }
  } catch (error) {
    console.error("[stripe-webhook] Failed to process event:", event.type, error);
    return NextResponse.json({ error: "Stripe webhook processing failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

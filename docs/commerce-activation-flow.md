# Kiaros Commerce Activation Flow

This doc captures the first launch-ready version of the Etsy-to-Kiaros redemption experience, along with the customer-facing copy for the three core artifacts.

## Positioning Principles

- Etsy is a marketplace checkout, not a lesser product.
- Website checkout is the best direct price, but Etsy customers still receive full Kiaros access.
- The Etsy handoff should feel premium and intentional, not like a workaround.
- The next-year reward should be framed as a loyalty gift, not compensation for having paid more on Etsy.

## Artifact 1 — Etsy Fulfillment PDF

### Cover title

Welcome to Kiaros

### Body copy

Your Etsy purchase includes full access to your Kiaros planner on our website.

Kiaros is designed to meet you where you are in the year. Once you activate your access, your planner experience will begin from your current season while still giving you the wider annual context that supports the rest of your year.

### Activation steps

1. Go to `kiaros.com/activate`
2. Enter your Etsy order number
3. Enter the email used with your Etsy purchase
4. Verify your access and create your Kiaros account
5. Begin your planner

### Support line

If you need help activating your purchase, contact `support@kiaros.co` and include your Etsy order number.

### Loyalty note

As a thank-you for beginning your Kiaros journey through Etsy, your account will also receive a loyalty reward toward next year's planner after activation.

## Artifact 2 — Activation Page

### Hero eyebrow

Etsy Activation

### Hero title

Unlock your Kiaros planner

### Hero body

Your Etsy purchase includes full access to Kiaros. Verify your order below, then create your account to begin with a planner experience that starts from where you are now.

### Form labels

- Etsy order number
- Email used for purchase

### Primary CTA

Verify purchase

### Success state

Your purchase has been verified.

Next, create your Kiaros account to activate your planner and begin onboarding.

### Signed-in completion state

Finish activation

This links the verified purchase to your Kiaros account and unlocks your planner access.

### Reassurance points

- Full access is included with your Etsy purchase
- Your planner begins from your current season in the year
- A loyalty reward for next year's planner will be sent to your Kiaros account email after activation

## Artifact 3 — Post-Activation Email

### Subject line

Your Kiaros access is live

### Preview text

Your planner is ready, and your loyalty reward for next year is on its way.

### Email body

Hi {{ first_name | default: "there" }},

Your Kiaros access has been activated successfully.

You can now sign in and begin your planner experience from your current point in the year, with the wider annual view still available to support the rest of your path.

Sign in here:
`https://kiaros.com/sign-in`

As a thank-you for activating through Etsy, we've also reserved a loyalty reward for next year's planner and linked it to this email address:
`{{ email }}`

We'll send details on how to redeem that reward through checkout when next year's planner is available.

If anything feels off with your access, reply to this email and we'll help you get settled.

With care,
Kiaros

## Launch Integration Notes

### Activation model

- Etsy sends a generic PDF, not a per-buyer code.
- The customer claims access at `kiaros.com/activate` using:
  - Etsy order number
  - Etsy purchase email
- Kiaros verifies that order against imported marketplace order data.
- Once verified, Kiaros issues a claim token.
- The user creates or signs into a Clerk account.
- Kiaros consumes the claim token and creates the planner entitlement.

### Why this is better than embedding real codes in Etsy files

- No need to generate unique PDFs per order.
- Reduced code sharing risk.
- Cleaner support flow for refunds, duplicates, and manual review.
- The Kiaros account email becomes the source of truth for future loyalty rewards.

### Stripe loyalty reward

- Loyalty rewards should be sent to the email used to create the Kiaros account, not the Etsy email unless they match.
- In Stripe:
  - create a Coupon for the next-year loyalty value
  - create a customer-specific Promotion Code tied to that customer's Stripe Customer record
  - set `max_redemptions = 1`
  - set an explicit expiry window
- Email the reward from Kiaros after activation is complete.

### Recommended first release scope

- Import Etsy orders into Supabase
- Public activation page
- Claim token flow
- Planner entitlement creation
- Loyalty reward record creation
- Stripe coupon/promotion code creation in a follow-up step once Stripe is wired

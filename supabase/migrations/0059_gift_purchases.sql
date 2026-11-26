-- ============================================================
-- 0059_gift_purchases.sql
--
-- Gift a year of Kairos. Anyone can buy a gift without an account;
-- Stripe takes a one-time payment, and the buyer gets a gift code
-- and a link to pass on. The recipient redeems the code on their own
-- account, which grants a one-year entitlement with source 'gift'.
-- Writes and reads go through the service role only.
-- ============================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.gift_purchases (
  id                         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code                       TEXT NOT NULL UNIQUE,
  stripe_checkout_session_id TEXT NOT NULL UNIQUE,
  stripe_payment_intent_id   TEXT,
  stripe_customer_id         TEXT,
  purchaser_email            TEXT NOT NULL,
  purchaser_name             TEXT CHECK (purchaser_name IS NULL OR char_length(purchaser_name) <= 80),
  recipient_name             TEXT CHECK (recipient_name IS NULL OR char_length(recipient_name) <= 80),
  gift_message               TEXT CHECK (gift_message IS NULL OR char_length(gift_message) <= 600),
  product_tier               TEXT NOT NULL CHECK (product_tier IN ('planner', 'planner_oracle')),
  oracle_enabled             BOOLEAN NOT NULL DEFAULT FALSE,
  amount_total_cents         INTEGER NOT NULL,
  currency                   TEXT NOT NULL DEFAULT 'usd',
  status                     TEXT NOT NULL DEFAULT 'paid'
                               CHECK (status IN ('paid', 'redeemed', 'refunded', 'voided')),
  purchased_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
  redeemed_user_id           UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  redeemed_at                TIMESTAMPTZ,
  buyer_email_sent_at        TIMESTAMPTZ,
  metadata                   JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_at                 TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                 TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_gift_purchases_status ON public.gift_purchases (status);
CREATE INDEX IF NOT EXISTS idx_gift_purchases_purchaser_email ON public.gift_purchases (purchaser_email);
CREATE INDEX IF NOT EXISTS idx_gift_purchases_redeemed_user ON public.gift_purchases (redeemed_user_id);

ALTER TABLE public.gift_purchases ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.gift_purchases FROM anon, authenticated;
GRANT ALL ON public.gift_purchases TO service_role;

-- Gift redemptions become product entitlements with source 'gift'.
ALTER TABLE public.product_entitlements
  DROP CONSTRAINT IF EXISTS product_entitlements_source_check;
ALTER TABLE public.product_entitlements
  ADD CONSTRAINT product_entitlements_source_check
  CHECK (source IN ('etsy', 'stripe', 'comp', 'gift'));

COMMIT;

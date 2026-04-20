-- ============================================================
-- Migration 0005 — commerce activation and loyalty schema
-- ============================================================

BEGIN;

-- ------------------------------------------------------------
-- marketplace_orders
-- Imported marketplace purchases awaiting activation.
-- Managed by server-side jobs/admin tooling only.
-- ------------------------------------------------------------
CREATE TABLE marketplace_orders (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source            TEXT NOT NULL CHECK (source IN ('etsy')),
  external_order_id TEXT NOT NULL,
  purchaser_email   TEXT NOT NULL,
  purchaser_name    TEXT,
  listing_key       TEXT,
  product_tier      TEXT NOT NULL CHECK (product_tier IN ('planner','planner_oracle')),
  planner_year      SMALLINT NOT NULL,
  oracle_enabled    BOOLEAN NOT NULL DEFAULT FALSE,
  status            TEXT NOT NULL DEFAULT 'imported'
                      CHECK (status IN ('imported','claimed','activated','refunded','voided')),
  purchased_at      TIMESTAMPTZ,
  imported_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  claimed_user_id   UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
  claimed_at        TIMESTAMPTZ,
  metadata          JSONB NOT NULL DEFAULT '{}'::JSONB,
  UNIQUE (source, external_order_id)
);

CREATE INDEX idx_marketplace_orders_email ON marketplace_orders(source, purchaser_email);
CREATE INDEX idx_marketplace_orders_status ON marketplace_orders(status);

ALTER TABLE marketplace_orders ENABLE ROW LEVEL SECURITY;

-- No user policies. Reads and writes happen via service-role code paths.

-- ------------------------------------------------------------
-- activation_claims
-- Short-lived verified claims created after order-number + email
-- verification and later attached to a Clerk account.
-- ------------------------------------------------------------
CREATE TABLE activation_claims (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  marketplace_order_id  UUID NOT NULL REFERENCES marketplace_orders(id) ON DELETE CASCADE,
  claim_email           TEXT NOT NULL,
  claim_token           TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex'),
  status                TEXT NOT NULL DEFAULT 'pending'
                          CHECK (status IN ('pending','verified','activated','expired','cancelled')),
  verified_at           TIMESTAMPTZ,
  expires_at            TIMESTAMPTZ,
  claimed_clerk_user_id TEXT,
  claimed_user_id       UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
  claimed_at            TIMESTAMPTZ,
  consumed_at           TIMESTAMPTZ,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_activation_claims_order ON activation_claims(marketplace_order_id);
CREATE INDEX idx_activation_claims_token ON activation_claims(claim_token);
CREATE INDEX idx_activation_claims_status ON activation_claims(status);

ALTER TABLE activation_claims ENABLE ROW LEVEL SECURITY;

-- No user policies. Claims are resolved through service-role routes.

-- ------------------------------------------------------------
-- product_entitlements
-- Source-of-truth for access to planner tiers and Oracle.
-- ------------------------------------------------------------
CREATE TABLE product_entitlements (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  source          TEXT NOT NULL CHECK (source IN ('etsy','stripe','comp')),
  source_order_id UUID,
  product_tier    TEXT NOT NULL CHECK (product_tier IN ('planner','planner_oracle')),
  planner_year    SMALLINT NOT NULL,
  oracle_enabled  BOOLEAN NOT NULL DEFAULT FALSE,
  starts_at       DATE NOT NULL,
  ends_at         DATE NOT NULL,
  status          TEXT NOT NULL DEFAULT 'active'
                    CHECK (status IN ('active','expired','revoked')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (source, source_order_id)
);

CREATE INDEX idx_product_entitlements_user ON product_entitlements(user_id, planner_year DESC);
CREATE INDEX idx_product_entitlements_status ON product_entitlements(status);

ALTER TABLE product_entitlements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own_entitlements_select" ON product_entitlements FOR SELECT
  USING (user_id = (
    SELECT id FROM user_profiles
    WHERE clerk_user_id = app_current_clerk_user_id()
  ));

-- Writes happen via service-role routes and admin tooling.

-- ------------------------------------------------------------
-- loyalty_rewards
-- Tracks next-year loyalty gifts that will later map to Stripe
-- coupons and customer-scoped promotion codes.
-- ------------------------------------------------------------
CREATE TABLE loyalty_rewards (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                  UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  entitlement_id           UUID REFERENCES product_entitlements(id) ON DELETE SET NULL,
  delivery_email           TEXT NOT NULL,
  status                   TEXT NOT NULL DEFAULT 'pending'
                             CHECK (status IN ('pending','created','emailed','redeemed','expired','cancelled')),
  reward_year              SMALLINT NOT NULL,
  amount_off_cents         INTEGER,
  currency                 TEXT DEFAULT 'usd',
  stripe_customer_id       TEXT,
  stripe_coupon_id         TEXT,
  stripe_promotion_code_id TEXT,
  promotion_code           TEXT,
  redeem_by                TIMESTAMPTZ,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
  sent_at                  TIMESTAMPTZ,
  redeemed_at              TIMESTAMPTZ,
  metadata                 JSONB NOT NULL DEFAULT '{}'::JSONB
);

CREATE INDEX idx_loyalty_rewards_user ON loyalty_rewards(user_id, reward_year DESC);
CREATE INDEX idx_loyalty_rewards_status ON loyalty_rewards(status);

ALTER TABLE loyalty_rewards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own_loyalty_rewards_select" ON loyalty_rewards FOR SELECT
  USING (user_id = (
    SELECT id FROM user_profiles
    WHERE clerk_user_id = app_current_clerk_user_id()
  ));

COMMIT;

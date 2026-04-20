BEGIN;

CREATE TABLE direct_purchase_orders (
  id                         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clerk_user_id              TEXT NOT NULL,
  user_id                    UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
  purchaser_email            TEXT NOT NULL,
  product_tier               TEXT NOT NULL CHECK (product_tier IN ('planner','planner_oracle')),
  planner_year               SMALLINT NOT NULL,
  oracle_enabled             BOOLEAN NOT NULL DEFAULT FALSE,
  stripe_checkout_session_id TEXT NOT NULL UNIQUE,
  stripe_payment_intent_id   TEXT,
  stripe_customer_id         TEXT,
  amount_subtotal_cents      INTEGER,
  amount_total_cents         INTEGER,
  currency                   TEXT NOT NULL DEFAULT 'usd',
  status                     TEXT NOT NULL DEFAULT 'paid'
                               CHECK (status IN ('initiated','paid','activated','refunded','voided')),
  purchased_at               TIMESTAMPTZ,
  created_at                 TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                 TIMESTAMPTZ NOT NULL DEFAULT now(),
  metadata                   JSONB NOT NULL DEFAULT '{}'::JSONB
);

CREATE INDEX idx_direct_purchase_orders_user ON direct_purchase_orders(user_id, planner_year DESC);
CREATE INDEX idx_direct_purchase_orders_status ON direct_purchase_orders(status);

ALTER TABLE direct_purchase_orders ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER trg_direct_purchase_orders_updated_at
  BEFORE UPDATE ON direct_purchase_orders
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

ALTER TABLE loyalty_rewards
  ADD CONSTRAINT loyalty_rewards_user_reward_year_unique UNIQUE (user_id, reward_year);

COMMIT;

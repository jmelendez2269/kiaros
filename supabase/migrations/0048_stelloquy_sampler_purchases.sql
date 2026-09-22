BEGIN;

-- Stelloquy Sampler purchases table
-- Records $1 one-time sampler purchases with 3-credit grants
-- SAMPLE-01 requirement: idempotent purchase, one per account, no product_entitlements

CREATE TABLE stelloquy_sampler_purchases (
  id                         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                    UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  stripe_checkout_session_id TEXT NOT NULL UNIQUE,
  stripe_payment_intent_id   TEXT,
  stripe_customer_id         TEXT,
  credits_granted            INTEGER NOT NULL DEFAULT 3
                               CHECK (credits_granted > 0),
  credits_remaining          INTEGER NOT NULL DEFAULT 3
                               CHECK (credits_remaining >= 0 AND credits_remaining <= credits_granted),
  amount_cents               INTEGER NOT NULL DEFAULT 100,
  currency                   TEXT NOT NULL DEFAULT 'usd',
  status                     TEXT NOT NULL DEFAULT 'active'
                               CHECK (status IN ('active','exhausted','refunded')),
  purchased_at               TIMESTAMPTZ NOT NULL,
  created_at                 TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                 TIMESTAMPTZ NOT NULL DEFAULT now(),
  metadata                   JSONB NOT NULL DEFAULT '{}'::JSONB
);

CREATE INDEX idx_stelloquy_sampler_purchases_user ON stelloquy_sampler_purchases(user_id);
CREATE INDEX idx_stelloquy_sampler_purchases_status ON stelloquy_sampler_purchases(status);

ALTER TABLE stelloquy_sampler_purchases ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER trg_stelloquy_sampler_purchases_updated_at
  BEFORE UPDATE ON stelloquy_sampler_purchases
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

-- Enforce one sampler purchase per account
CREATE UNIQUE INDEX idx_stelloquy_sampler_one_per_user 
  ON stelloquy_sampler_purchases(user_id)
  WHERE status IN ('active', 'exhausted');

COMMIT;

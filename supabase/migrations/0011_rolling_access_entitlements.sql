BEGIN;

ALTER TABLE marketplace_orders
  ADD COLUMN access_plan TEXT NOT NULL DEFAULT 'yearly'
  CHECK (access_plan IN ('monthly', 'yearly'));

ALTER TABLE direct_purchase_orders
  ADD COLUMN access_plan TEXT NOT NULL DEFAULT 'yearly'
  CHECK (access_plan IN ('monthly', 'yearly')),
  ADD COLUMN stripe_subscription_id TEXT,
  ADD COLUMN stripe_subscription_item_id TEXT,
  ADD COLUMN stripe_price_id TEXT;

CREATE INDEX idx_direct_purchase_orders_subscription_id
  ON direct_purchase_orders(stripe_subscription_id)
  WHERE stripe_subscription_id IS NOT NULL;

ALTER TABLE product_entitlements
  ADD COLUMN access_plan TEXT NOT NULL DEFAULT 'yearly'
  CHECK (access_plan IN ('monthly', 'yearly'));

CREATE INDEX idx_product_entitlements_access_plan
  ON product_entitlements(user_id, access_plan, ends_at DESC);

COMMIT;

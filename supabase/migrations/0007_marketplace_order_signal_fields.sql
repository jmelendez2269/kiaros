BEGIN;

ALTER TABLE marketplace_orders
  ADD COLUMN etsy_listing_id TEXT,
  ADD COLUMN etsy_sku TEXT,
  ADD COLUMN source_message_id TEXT;

CREATE INDEX idx_marketplace_orders_listing_id ON marketplace_orders(etsy_listing_id);
CREATE INDEX idx_marketplace_orders_sku ON marketplace_orders(etsy_sku);
CREATE UNIQUE INDEX idx_marketplace_orders_source_message_id
  ON marketplace_orders(source_message_id)
  WHERE source_message_id IS NOT NULL;

COMMIT;

BEGIN;

CREATE TABLE public.first_party_funnel_events (
  id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id                    VARCHAR(160) NOT NULL UNIQUE
                                CHECK (event_id ~ '^[A-Za-z0-9][A-Za-z0-9._:-]*$'),
  event_name                  TEXT NOT NULL
                                CHECK (event_name IN (
                                  'pricing_viewed',
                                  'tier_selected',
                                  'preview_started',
                                  'preview_completed',
                                  'preview_viewed',
                                  'checkout_started',
                                  'checkout_canceled',
                                  'checkout_completed',
                                  'blueprint_ready',
                                  'day_7_return',
                                  'subscription_canceled',
                                  'second_invoice_paid',
                                  'sampler_purchased',
                                  'sampler_credit_used',
                                  'paid_upgrade_completed'
                                )),
  occurred_at                 TIMESTAMPTZ NOT NULL,
  received_at                 TIMESTAMPTZ NOT NULL DEFAULT now(),
  anonymous_id                UUID,
  user_id                     UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  session_id                  UUID,
  source                      VARCHAR(80),
  medium                      VARCHAR(80),
  campaign                    VARCHAR(120),
  referrer_host               VARCHAR(253),
  entry_path                  VARCHAR(256),
  experiment_key              VARCHAR(80),
  experiment_variant          VARCHAR(80),
  product_tier                TEXT
                                CHECK (product_tier IS NULL OR product_tier IN (
                                  'planner',
                                  'planner_oracle',
                                  'stelloquy_sampler',
                                  'personalized_week'
                                )),
  access_plan                 TEXT
                                CHECK (access_plan IS NULL OR access_plan IN (
                                  'monthly',
                                  'yearly',
                                  'one_time',
                                  'legacy_etsy'
                                )),
  stripe_checkout_session_id  VARCHAR(255),
  stripe_order_id             VARCHAR(255),
  converted_entitlement_id    UUID REFERENCES public.product_entitlements(id) ON DELETE SET NULL,
  metadata                    JSONB NOT NULL DEFAULT '{}'::JSONB,

  CONSTRAINT funnel_event_has_identity
    CHECK (anonymous_id IS NOT NULL OR user_id IS NOT NULL),
  CONSTRAINT funnel_event_source_format
    CHECK (source IS NULL OR source ~ '^[A-Za-z0-9][A-Za-z0-9._:+~-]*$'),
  CONSTRAINT funnel_event_medium_format
    CHECK (medium IS NULL OR medium ~ '^[A-Za-z0-9][A-Za-z0-9._:+~-]*$'),
  CONSTRAINT funnel_event_campaign_format
    CHECK (campaign IS NULL OR campaign ~ '^[A-Za-z0-9][A-Za-z0-9 ._:+~-]*$'),
  CONSTRAINT funnel_event_referrer_host_format
    CHECK (
      referrer_host IS NULL OR (
        referrer_host !~ '[/?#]' AND
        referrer_host !~ '\.\.' AND
        (referrer_host ~ '^[A-Za-z0-9]$' OR referrer_host ~ '^[A-Za-z0-9][A-Za-z0-9.-]*[A-Za-z0-9]$')
      )
    ),
  CONSTRAINT funnel_event_entry_path_format
    CHECK (entry_path IS NULL OR entry_path ~ '^/[A-Za-z0-9/_~.+-]*$'),
  CONSTRAINT funnel_event_experiment_key_format
    CHECK (experiment_key IS NULL OR experiment_key ~ '^[A-Za-z0-9][A-Za-z0-9._:+~-]*$'),
  CONSTRAINT funnel_event_experiment_variant_format
    CHECK (experiment_variant IS NULL OR experiment_variant ~ '^[A-Za-z0-9][A-Za-z0-9._:+~-]*$'),
  CONSTRAINT funnel_event_checkout_id_format
    CHECK (
      stripe_checkout_session_id IS NULL OR
      stripe_checkout_session_id ~ '^[A-Za-z0-9_]+$'
    ),
  CONSTRAINT funnel_event_order_id_format
    CHECK (stripe_order_id IS NULL OR stripe_order_id ~ '^[A-Za-z0-9_]+$'),
  CONSTRAINT funnel_event_metadata_shape
    CHECK (
      jsonb_typeof(metadata) = 'object' AND
      octet_length(metadata::TEXT) <= 1024 AND
      metadata - ARRAY[
        'amount_minor',
        'currency',
        'planner_year',
        'completion_duration_ms',
        'return_day',
        'invoice_number',
        'credit_balance',
        'is_upgrade',
        'entry_surface',
        'reason_code'
      ]::TEXT[] = '{}'::JSONB
    ),
  CONSTRAINT funnel_event_metadata_amount
    CHECK (
      NOT (metadata ? 'amount_minor') OR (
        jsonb_typeof(metadata -> 'amount_minor') = 'number' AND
        metadata ->> 'amount_minor' ~ '^[0-9]+$' AND
        (metadata ->> 'amount_minor')::NUMERIC BETWEEN 0 AND 100000000
      )
    ),
  CONSTRAINT funnel_event_metadata_currency
    CHECK (
      NOT (metadata ? 'currency') OR
      (jsonb_typeof(metadata -> 'currency') = 'string' AND
       metadata ->> 'currency' ~ '^[A-Za-z]{3}$')
    ),
  CONSTRAINT funnel_event_metadata_planner_year
    CHECK (
      NOT (metadata ? 'planner_year') OR (
        jsonb_typeof(metadata -> 'planner_year') = 'number' AND
        metadata ->> 'planner_year' ~ '^[0-9]+$' AND
        (metadata ->> 'planner_year')::INTEGER BETWEEN 2020 AND 2100
      )
    ),
  CONSTRAINT funnel_event_metadata_duration
    CHECK (
      NOT (metadata ? 'completion_duration_ms') OR (
        jsonb_typeof(metadata -> 'completion_duration_ms') = 'number' AND
        metadata ->> 'completion_duration_ms' ~ '^[0-9]+$' AND
        (metadata ->> 'completion_duration_ms')::NUMERIC BETWEEN 0 AND 86400000
      )
    ),
  CONSTRAINT funnel_event_metadata_return_day
    CHECK (
      NOT (metadata ? 'return_day') OR (
        jsonb_typeof(metadata -> 'return_day') = 'number' AND
        metadata ->> 'return_day' ~ '^[0-9]+$' AND
        (metadata ->> 'return_day')::INTEGER BETWEEN 0 AND 365
      )
    ),
  CONSTRAINT funnel_event_metadata_invoice_number
    CHECK (
      NOT (metadata ? 'invoice_number') OR (
        jsonb_typeof(metadata -> 'invoice_number') = 'number' AND
        metadata ->> 'invoice_number' ~ '^[0-9]+$' AND
        (metadata ->> 'invoice_number')::INTEGER BETWEEN 1 AND 1000
      )
    ),
  CONSTRAINT funnel_event_metadata_credit_balance
    CHECK (
      NOT (metadata ? 'credit_balance') OR (
        jsonb_typeof(metadata -> 'credit_balance') = 'number' AND
        metadata ->> 'credit_balance' ~ '^[0-9]+$' AND
        (metadata ->> 'credit_balance')::INTEGER BETWEEN 0 AND 10000
      )
    ),
  CONSTRAINT funnel_event_metadata_upgrade
    CHECK (
      NOT (metadata ? 'is_upgrade') OR
      jsonb_typeof(metadata -> 'is_upgrade') = 'boolean'
    ),
  CONSTRAINT funnel_event_metadata_entry_surface
    CHECK (
      NOT (metadata ? 'entry_surface') OR
      (jsonb_typeof(metadata -> 'entry_surface') = 'string' AND
       metadata ->> 'entry_surface' ~ '^[A-Za-z0-9][A-Za-z0-9._:+~-]{0,63}$')
    ),
  CONSTRAINT funnel_event_metadata_reason_code
    CHECK (
      NOT (metadata ? 'reason_code') OR
      (jsonb_typeof(metadata -> 'reason_code') = 'string' AND
       metadata ->> 'reason_code' ~ '^[A-Za-z0-9][A-Za-z0-9._:+~-]{0,63}$')
    )
);

CREATE UNIQUE INDEX idx_funnel_event_checkout_once
  ON public.first_party_funnel_events(event_name, stripe_checkout_session_id)
  WHERE stripe_checkout_session_id IS NOT NULL;

CREATE UNIQUE INDEX idx_funnel_event_order_once
  ON public.first_party_funnel_events(event_name, stripe_order_id)
  WHERE stripe_order_id IS NOT NULL;

CREATE INDEX idx_funnel_event_name_occurred
  ON public.first_party_funnel_events(event_name, occurred_at DESC);

CREATE INDEX idx_funnel_event_anonymous_occurred
  ON public.first_party_funnel_events(anonymous_id, occurred_at DESC)
  WHERE anonymous_id IS NOT NULL;

CREATE INDEX idx_funnel_event_user_occurred
  ON public.first_party_funnel_events(user_id, occurred_at DESC)
  WHERE user_id IS NOT NULL;

CREATE INDEX idx_funnel_event_session_occurred
  ON public.first_party_funnel_events(session_id, occurred_at DESC)
  WHERE session_id IS NOT NULL;

CREATE INDEX idx_funnel_event_experiment_occurred
  ON public.first_party_funnel_events(experiment_key, experiment_variant, occurred_at DESC)
  WHERE experiment_key IS NOT NULL;

ALTER TABLE public.first_party_funnel_events ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.first_party_funnel_events FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.first_party_funnel_events TO service_role;

CREATE OR REPLACE FUNCTION public.link_first_party_funnel_identity(
  p_anonymous_id UUID,
  p_user_id UUID
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_linked_count INTEGER;
BEGIN
  UPDATE public.first_party_funnel_events
  SET user_id = p_user_id
  WHERE anonymous_id = p_anonymous_id
    AND user_id IS NULL;

  GET DIAGNOSTICS v_linked_count = ROW_COUNT;
  RETURN v_linked_count;
END;
$$;

REVOKE ALL ON FUNCTION public.link_first_party_funnel_identity(UUID, UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.link_first_party_funnel_identity(UUID, UUID) TO service_role;

COMMIT;

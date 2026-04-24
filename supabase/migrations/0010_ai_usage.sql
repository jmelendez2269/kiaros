-- ============================================================
-- Migration 0010 — AI usage tracking
-- ============================================================
-- Per-user monthly counters for Oracle + blueprint API spend.
-- Rows are upserted from server routes using the service role.
-- Users can read their own totals via RLS; only service role writes.
-- ============================================================

BEGIN;

CREATE TABLE ai_usage (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  period_month          DATE NOT NULL,
  feature               TEXT NOT NULL,
  model                 TEXT NOT NULL,
  message_count         INTEGER NOT NULL DEFAULT 0,
  input_tokens          BIGINT  NOT NULL DEFAULT 0,
  input_tokens_cached   BIGINT  NOT NULL DEFAULT 0,
  cache_creation_tokens BIGINT  NOT NULL DEFAULT 0,
  output_tokens         BIGINT  NOT NULL DEFAULT 0,
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, period_month, feature, model)
);

CREATE INDEX idx_ai_usage_user_month ON ai_usage (user_id, period_month DESC);

ALTER TABLE ai_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY ai_usage_select_own ON ai_usage
  FOR SELECT
  USING (user_id = (
    SELECT id FROM user_profiles
    WHERE clerk_user_id = app_current_clerk_user_id()
  ));

-- No INSERT / UPDATE / DELETE policies: only service role writes.

-- Atomic increment for token usage. Called by service role.
CREATE OR REPLACE FUNCTION increment_ai_usage(
  p_user_id UUID,
  p_period_month DATE,
  p_feature TEXT,
  p_model TEXT,
  p_messages INTEGER,
  p_input_tokens BIGINT,
  p_input_tokens_cached BIGINT,
  p_cache_creation_tokens BIGINT,
  p_output_tokens BIGINT
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO ai_usage (
    user_id, period_month, feature, model,
    message_count, input_tokens, input_tokens_cached,
    cache_creation_tokens, output_tokens, updated_at
  )
  VALUES (
    p_user_id, p_period_month, p_feature, p_model,
    p_messages, p_input_tokens, p_input_tokens_cached,
    p_cache_creation_tokens, p_output_tokens, now()
  )
  ON CONFLICT (user_id, period_month, feature, model)
  DO UPDATE SET
    message_count         = ai_usage.message_count + EXCLUDED.message_count,
    input_tokens          = ai_usage.input_tokens + EXCLUDED.input_tokens,
    input_tokens_cached   = ai_usage.input_tokens_cached + EXCLUDED.input_tokens_cached,
    cache_creation_tokens = ai_usage.cache_creation_tokens + EXCLUDED.cache_creation_tokens,
    output_tokens         = ai_usage.output_tokens + EXCLUDED.output_tokens,
    updated_at            = now();
END;
$$;

COMMIT;

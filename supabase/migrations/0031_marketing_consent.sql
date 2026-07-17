-- ============================================================
-- 0031_marketing_consent.sql
--
-- Adds an opt-in flag for marketing/product-update emails from
-- Project Parallax, captured on the onboarding birth-data step
-- (right after sign-up). Defaults to false/unset for existing rows.
-- ============================================================

ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS marketing_consent BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS marketing_consent_at TIMESTAMPTZ;

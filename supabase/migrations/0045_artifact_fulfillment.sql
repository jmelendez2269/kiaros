-- ETSY-03 isolated artifact fulfillment persistence.
-- AUTHORIZED FOR DISPOSABLE LOCAL APPLY on 2026-08-20.
-- Do not apply to any remote target until migration history is reconciled,
-- isolated staging is positively identified, and the exact apply is approved.

CREATE TABLE public.artifact_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sku TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  artifact_type TEXT NOT NULL CHECK (artifact_type IN ('anchor_print')),
  schema_version TEXT NOT NULL,
  template_version TEXT NOT NULL,
  required_input_fields TEXT[] NOT NULL DEFAULT '{}',
  active BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Server-managed operational roles. Browser roles receive no access to this
-- table; the service boundary resolves permissions after Clerk authentication.
CREATE TABLE public.artifact_admin_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clerk_user_id TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('operator', 'reviewer', 'privacy_admin')),
  granted_by_clerk_user_id TEXT NOT NULL,
  granted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  revoked_at TIMESTAMPTZ,
  UNIQUE (clerk_user_id, role)
);

CREATE TABLE public.artifact_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fulfillment_unit_key TEXT NOT NULL UNIQUE,
  source TEXT NOT NULL CHECK (source = 'etsy'),
  source_shop_id TEXT NOT NULL,
  source_receipt_id TEXT NOT NULL,
  source_transaction_id TEXT NOT NULL,
  source_unit_index INTEGER NOT NULL CHECK (source_unit_index >= 1),
  source_quantity INTEGER NOT NULL CHECK (source_quantity = 1),
  source_listing_id TEXT,
  source_payload_fingerprint TEXT NOT NULL CHECK (source_payload_fingerprint ~ '^[a-f0-9]{64}$'),
  product_id UUID NOT NULL REFERENCES public.artifact_products(id) ON DELETE RESTRICT,
  fulfillment_status TEXT NOT NULL DEFAULT 'intake_draft' CHECK (
    fulfillment_status IN (
      'intake_draft',
      'clarification_required',
      'ready_to_generate',
      'generating',
      'qa_required',
      'revision_required',
      'approved',
      'exported',
      'ready_for_external_delivery',
      'delivered',
      'canceled'
    )
  ),
  financial_status TEXT NOT NULL DEFAULT 'paid' CHECK (
    financial_status IN ('paid', 'refund_pending', 'refunded')
  ),
  current_revision INTEGER NOT NULL DEFAULT 1 CHECK (current_revision >= 1),
  purchased_at TIMESTAMPTZ NOT NULL,
  due_at TIMESTAMPTZ NOT NULL,
  generation_started_at TIMESTAMPTZ,
  approved_at TIMESTAMPTZ,
  external_delivery_ready_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  closed_at TIMESTAMPTZ,
  refund_recorded_at TIMESTAMPTZ,
  legal_hold_until TIMESTAMPTZ,
  created_by_clerk_user_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT artifact_orders_unit_identity UNIQUE (
    source,
    source_shop_id,
    source_receipt_id,
    source_transaction_id,
    source_unit_index
  ),
  CONSTRAINT artifact_orders_key_shape CHECK (
    fulfillment_unit_key = concat(
      'etsy:',
      source_shop_id,
      ':',
      source_receipt_id,
      ':',
      source_transaction_id,
      ':',
      source_unit_index::text
    )
  ),
  CONSTRAINT artifact_orders_source_parts CHECK (
    source_shop_id !~ '[:[:space:]]'
    AND source_receipt_id !~ '[:[:space:]]'
    AND source_transaction_id !~ '[:[:space:]]'
  )
);

-- Raw personalization is isolated so it can be purged after 30 days without
-- removing the birth-data-free order ledger.
CREATE TABLE public.artifact_personalization (
  order_id UUID PRIMARY KEY REFERENCES public.artifact_orders(id) ON DELETE CASCADE,
  support_email TEXT NOT NULL,
  display_name TEXT,
  birth_date DATE NOT NULL,
  birth_time TIME,
  birth_time_unknown BOOLEAN NOT NULL,
  birth_city TEXT NOT NULL,
  birth_country TEXT NOT NULL,
  allowlisted_source_fields JSONB NOT NULL DEFAULT '{}'::jsonb,
  purge_after TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT artifact_personalization_time_consistency CHECK (
    (birth_time_unknown AND birth_time IS NULL)
    OR (NOT birth_time_unknown AND birth_time IS NOT NULL)
  ),
  CONSTRAINT artifact_personalization_source_object CHECK (
    jsonb_typeof(allowlisted_source_fields) = 'object'
  )
);

-- Normalized calculation data is a guest artifact profile, never an account.
CREATE TABLE public.artifact_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL UNIQUE REFERENCES public.artifact_orders(id) ON DELETE CASCADE,
  artifact_id TEXT NOT NULL UNIQUE CHECK (artifact_id ~ '^art_[A-Za-z0-9_-]{8,80}$'),
  normalized_birth JSONB NOT NULL,
  calculation JSONB NOT NULL,
  narrative JSONB NOT NULL,
  calculation_version TEXT NOT NULL,
  ephemeris_provider TEXT NOT NULL,
  ephemeris_version TEXT NOT NULL,
  timezone_provenance TEXT NOT NULL,
  chart_fingerprint TEXT NOT NULL,
  purge_after TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT artifact_profiles_normalized_birth_object CHECK (jsonb_typeof(normalized_birth) = 'object'),
  CONSTRAINT artifact_profiles_calculation_object CHECK (jsonb_typeof(calculation) = 'object'),
  CONSTRAINT artifact_profiles_narrative_object CHECK (jsonb_typeof(narrative) = 'object')
);

CREATE TABLE public.artifact_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.artifact_orders(id) ON DELETE CASCADE,
  revision INTEGER NOT NULL CHECK (revision >= 1),
  paper_size TEXT NOT NULL CHECK (paper_size IN ('letter', 'a4')),
  private_bucket TEXT NOT NULL DEFAULT 'etsy-artifacts-private' CHECK (
    private_bucket = 'etsy-artifacts-private'
  ),
  storage_object_key TEXT NOT NULL UNIQUE CHECK (
    storage_object_key ~ '^artifact-files/[0-9a-f-]{36}\.pdf$'
  ),
  file_name TEXT NOT NULL CHECK (file_name ~ '^art_[A-Za-z0-9_-]+_anchor-print_(letter|a4)\.pdf$'),
  byte_size BIGINT NOT NULL CHECK (byte_size > 0 AND byte_size <= 10485760),
  sha256 TEXT NOT NULL CHECK (sha256 ~ '^[a-f0-9]{64}$'),
  generation_status TEXT NOT NULL DEFAULT 'generated' CHECK (
    generation_status IN ('generated', 'qa_approved', 'superseded', 'deletion_pending', 'deleted')
  ),
  purge_after TIMESTAMPTZ NOT NULL,
  deleted_at TIMESTAMPTZ,
  created_by_clerk_user_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (order_id, revision, paper_size)
);

CREATE TABLE public.artifact_qa_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.artifact_orders(id) ON DELETE CASCADE,
  revision INTEGER NOT NULL CHECK (revision >= 1),
  calculation_checked BOOLEAN NOT NULL DEFAULT false,
  narrative_checked BOOLEAN NOT NULL DEFAULT false,
  layout_checked BOOLEAN NOT NULL DEFAULT false,
  disclosures_checked BOOLEAN NOT NULL DEFAULT false,
  accessibility_checked BOOLEAN NOT NULL DEFAULT false,
  privacy_metadata_checked BOOLEAN NOT NULL DEFAULT false,
  approved BOOLEAN NOT NULL DEFAULT false,
  reviewed_by_clerk_user_id TEXT NOT NULL,
  reviewed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT artifact_qa_approval_complete CHECK (
    NOT approved OR (
      calculation_checked
      AND narrative_checked
      AND layout_checked
      AND disclosures_checked
      AND accessibility_checked
      AND privacy_metadata_checked
    )
  ),
  UNIQUE (order_id, revision)
);

-- Support history is isolated from order/calculation data for its own retention clock.
CREATE TABLE public.artifact_support_cases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.artifact_orders(id) ON DELETE CASCADE,
  case_type TEXT NOT NULL CHECK (
    case_type IN ('clarification', 'correction', 'cancellation', 'refund', 'privacy_request')
  ),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
  support_email TEXT NOT NULL,
  case_summary TEXT NOT NULL CHECK (char_length(case_summary) BETWEEN 1 AND 2000),
  opened_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  closed_at TIMESTAMPTZ,
  purge_after TIMESTAMPTZ NOT NULL,
  created_by_clerk_user_id TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Append-only audit evidence deliberately excludes birth data, email, and message bodies.
CREATE TABLE public.artifact_order_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.artifact_orders(id) ON DELETE RESTRICT,
  event_type TEXT NOT NULL CHECK (
    event_type IN (
      'intake_created',
      'intake_replayed',
      'intake_conflict',
      'clarification_requested',
      'clarification_resolved',
      'intake_validated',
      'generation_started',
      'generation_succeeded',
      'generation_failed',
      'qa_approved',
      'revision_requested',
      'export_recorded',
      'external_delivery_ready',
      'delivery_recorded',
      'canceled',
      'refund_recorded',
      'retention_due',
      'retention_completed',
      'legal_hold_set',
      'legal_hold_cleared'
    )
  ),
  actor_clerk_user_id TEXT NOT NULL,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  from_state TEXT,
  to_state TEXT NOT NULL,
  revision INTEGER NOT NULL CHECK (revision >= 1),
  reason_code TEXT,
  checksum TEXT CHECK (checksum IS NULL OR checksum ~ '^[a-f0-9]{64}$'),
  non_sensitive_details JSONB NOT NULL DEFAULT '{}'::jsonb CHECK (
    jsonb_typeof(non_sensitive_details) = 'object'
  )
);

CREATE INDEX artifact_orders_status_due_idx
  ON public.artifact_orders (fulfillment_status, due_at);
CREATE INDEX artifact_orders_closed_idx
  ON public.artifact_orders (closed_at)
  WHERE closed_at IS NOT NULL;
CREATE INDEX artifact_files_order_revision_idx
  ON public.artifact_files (order_id, revision);
CREATE INDEX artifact_support_cases_order_status_idx
  ON public.artifact_support_cases (order_id, status);
CREATE INDEX artifact_order_events_order_time_idx
  ON public.artifact_order_events (order_id, occurred_at DESC);

CREATE OR REPLACE FUNCTION public.set_artifact_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.set_artifact_updated_at() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER artifact_products_updated_at
BEFORE UPDATE ON public.artifact_products
FOR EACH ROW EXECUTE FUNCTION public.set_artifact_updated_at();

CREATE TRIGGER artifact_orders_updated_at
BEFORE UPDATE ON public.artifact_orders
FOR EACH ROW EXECUTE FUNCTION public.set_artifact_updated_at();

CREATE TRIGGER artifact_personalization_updated_at
BEFORE UPDATE ON public.artifact_personalization
FOR EACH ROW EXECUTE FUNCTION public.set_artifact_updated_at();

CREATE TRIGGER artifact_profiles_updated_at
BEFORE UPDATE ON public.artifact_profiles
FOR EACH ROW EXECUTE FUNCTION public.set_artifact_updated_at();

CREATE TRIGGER artifact_support_cases_updated_at
BEFORE UPDATE ON public.artifact_support_cases
FOR EACH ROW EXECUTE FUNCTION public.set_artifact_updated_at();

CREATE OR REPLACE FUNCTION public.prevent_artifact_event_mutation()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  RAISE EXCEPTION 'artifact order events are append-only';
END;
$$;

REVOKE ALL ON FUNCTION public.prevent_artifact_event_mutation() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER artifact_order_events_immutable
BEFORE UPDATE OR DELETE ON public.artifact_order_events
FOR EACH ROW EXECUTE FUNCTION public.prevent_artifact_event_mutation();

-- A server-side privacy job consumes this read-only candidate list. File objects
-- must be deleted from private storage before their database rows are removed.
CREATE OR REPLACE FUNCTION public.artifact_retention_candidates(
  p_as_of TIMESTAMPTZ DEFAULT now()
)
RETURNS TABLE (
  record_type TEXT,
  record_id UUID,
  order_id UUID,
  storage_object_key TEXT,
  due_at TIMESTAMPTZ
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT 'raw_personalization', p.order_id, p.order_id, NULL::text, p.purge_after
  FROM public.artifact_personalization p
  JOIN public.artifact_orders o ON o.id = p.order_id
  WHERE p.purge_after <= p_as_of
    AND (o.legal_hold_until IS NULL OR o.legal_hold_until < p_as_of)
  UNION ALL
  SELECT 'normalized_profile', p.id, p.order_id, NULL::text, p.purge_after
  FROM public.artifact_profiles p
  JOIN public.artifact_orders o ON o.id = p.order_id
  WHERE p.purge_after <= p_as_of
    AND (o.legal_hold_until IS NULL OR o.legal_hold_until < p_as_of)
  UNION ALL
  SELECT 'generated_file', f.id, f.order_id, f.storage_object_key, f.purge_after
  FROM public.artifact_files f
  JOIN public.artifact_orders o ON o.id = f.order_id
  WHERE f.purge_after <= p_as_of
    AND f.deleted_at IS NULL
    AND (o.legal_hold_until IS NULL OR o.legal_hold_until < p_as_of)
  UNION ALL
  SELECT 'support_case', s.id, s.order_id, NULL::text, s.purge_after
  FROM public.artifact_support_cases s
  JOIN public.artifact_orders o ON o.id = s.order_id
  WHERE s.purge_after <= p_as_of
    AND (o.legal_hold_until IS NULL OR o.legal_hold_until < p_as_of);
$$;

REVOKE ALL ON FUNCTION public.artifact_retention_candidates(TIMESTAMPTZ) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.artifact_retention_candidates(TIMESTAMPTZ) TO service_role;

-- Fixture-only intake is committed as one transaction so a failed related
-- insert cannot leave an order without its private personalization/profile.
CREATE OR REPLACE FUNCTION public.artifact_create_fixture_order(
  p_intake JSONB,
  p_actor_clerk_user_id TEXT,
  p_now TIMESTAMPTZ
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_existing public.artifact_orders%ROWTYPE;
  v_order_id UUID := gen_random_uuid();
  v_product_id UUID;
  v_source JSONB := p_intake->'source';
  v_input JSONB := p_intake->'generatorInput';
  v_calculation JSONB := p_intake->'generatorInput'->'calculation';
  v_provenance JSONB := p_intake->'generatorInput'->'calculation'->'provenance';
  v_unit_key TEXT;
  v_purchased_at TIMESTAMPTZ := (p_intake->'source'->>'purchasedAt')::timestamptz;
  v_due_at TIMESTAMPTZ;
BEGIN
  IF p_intake->>'fictional' <> 'true'
    OR p_intake->>'sku' <> 'KAI-ETSY-ANCHOR-V1'
    OR p_intake->>'supportEmail' NOT LIKE '%.test'
    OR v_input->>'artifactId' NOT LIKE 'art_fixture_%'
    OR v_source->>'shopId' NOT LIKE 'fixture-%'
    OR v_source->>'receiptId' NOT LIKE 'fixture-%'
    OR v_source->>'transactionId' NOT LIKE 'fixture-%'
    OR (v_source->>'unitIndex')::integer < 1
    OR (v_source->>'quantity')::integer <> 1
    OR p_intake->>'sourcePayloadFingerprint' !~ '^[a-f0-9]{64}$'
  THEN
    RAISE EXCEPTION 'artifact_fixture_data_required';
  END IF;

  v_unit_key := concat(
    'etsy:',
    v_source->>'shopId', ':',
    v_source->>'receiptId', ':',
    v_source->>'transactionId', ':',
    v_source->>'unitIndex'
  );

  SELECT * INTO v_existing
  FROM public.artifact_orders
  WHERE fulfillment_unit_key = v_unit_key
  FOR UPDATE;

  IF FOUND THEN
    IF v_existing.source_payload_fingerprint <> p_intake->>'sourcePayloadFingerprint' THEN
      RAISE EXCEPTION 'artifact_idempotency_conflict';
    END IF;
    INSERT INTO public.artifact_order_events (
      order_id, event_type, actor_clerk_user_id, occurred_at,
      from_state, to_state, revision, reason_code
    ) VALUES (
      v_existing.id, 'intake_replayed', p_actor_clerk_user_id, p_now,
      v_existing.fulfillment_status, v_existing.fulfillment_status,
      v_existing.current_revision, 'identical_payload'
    );
    RETURN v_existing.id;
  END IF;

  SELECT id INTO v_product_id
  FROM public.artifact_products
  WHERE sku = 'KAI-ETSY-ANCHOR-V1';
  IF v_product_id IS NULL THEN
    RAISE EXCEPTION 'artifact_product_missing';
  END IF;

  SELECT business_day + (v_purchased_at - date_trunc('day', v_purchased_at))
  INTO v_due_at
  FROM generate_series(
    date_trunc('day', v_purchased_at) + interval '1 day',
    date_trunc('day', v_purchased_at) + interval '10 days',
    interval '1 day'
  ) AS business_day
  WHERE extract(isodow FROM business_day) BETWEEN 1 AND 5
  ORDER BY business_day
  OFFSET 2 LIMIT 1;

  INSERT INTO public.artifact_orders (
    id, fulfillment_unit_key, source, source_shop_id, source_receipt_id,
    source_transaction_id, source_unit_index, source_quantity,
    source_listing_id, source_payload_fingerprint, product_id,
    purchased_at, due_at, created_by_clerk_user_id, created_at, updated_at
  ) VALUES (
    v_order_id, v_unit_key, 'etsy', v_source->>'shopId', v_source->>'receiptId',
    v_source->>'transactionId', (v_source->>'unitIndex')::integer,
    (v_source->>'quantity')::integer, v_source->>'listingId',
    p_intake->>'sourcePayloadFingerprint', v_product_id,
    v_purchased_at, v_due_at,
    p_actor_clerk_user_id, p_now, p_now
  );

  INSERT INTO public.artifact_personalization (
    order_id, support_email, display_name, birth_date, birth_time,
    birth_time_unknown, birth_city, birth_country, allowlisted_source_fields,
    purge_after, created_at, updated_at
  ) VALUES (
    v_order_id, p_intake->>'supportEmail', p_intake->>'displayName',
    (v_input->'normalizedBirth'->>'date')::date,
    NULLIF(v_input->'normalizedBirth'->>'time', '')::time,
    (v_input->'normalizedBirth'->>'timeUnknown')::boolean,
    v_input->'normalizedBirth'->>'city', v_input->'normalizedBirth'->>'country',
    jsonb_build_object('listingId', v_source->>'listingId', 'fixture', true),
    'infinity'::timestamptz, p_now, p_now
  );

  INSERT INTO public.artifact_profiles (
    order_id, artifact_id, normalized_birth, calculation, narrative,
    calculation_version, ephemeris_provider, ephemeris_version,
    timezone_provenance, chart_fingerprint, purge_after, created_at, updated_at
  ) VALUES (
    v_order_id, v_input->>'artifactId', v_input->'normalizedBirth',
    v_calculation, v_input->'narrative', v_provenance->>'calculationVersion',
    v_provenance->>'ephemerisProvider', v_provenance->>'ephemerisVersion',
    v_provenance->>'timezoneProvenance', v_provenance->>'chartFingerprint',
    'infinity'::timestamptz, p_now, p_now
  );

  INSERT INTO public.artifact_order_events (
    order_id, event_type, actor_clerk_user_id, occurred_at,
    from_state, to_state, revision
  ) VALUES (
    v_order_id, 'intake_created', p_actor_clerk_user_id, p_now,
    NULL, 'intake_draft', 1
  );
  RETURN v_order_id;
END;
$$;

-- State, QA evidence, file metadata, and audit events cross one transaction.
-- Private object upload happens first; the server removes that object if this
-- commit fails, preventing a database record from pointing at a missing file.
CREATE OR REPLACE FUNCTION public.artifact_commit_workflow_transition(
  p_order_id UUID,
  p_expected_updated_at TIMESTAMPTZ,
  p_snapshot JSONB,
  p_new_events JSONB,
  p_qa JSONB DEFAULT NULL,
  p_file JSONB DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_order public.artifact_orders%ROWTYPE;
  v_closed_at TIMESTAMPTZ;
BEGIN
  IF jsonb_typeof(p_snapshot) <> 'object'
    OR jsonb_typeof(p_new_events) <> 'array'
    OR jsonb_array_length(p_new_events) < 1
  THEN
    RAISE EXCEPTION 'artifact_invalid_transition_payload';
  END IF;

  SELECT * INTO v_order
  FROM public.artifact_orders
  WHERE id = p_order_id
  FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'artifact_order_not_found'; END IF;
  IF v_order.updated_at <> p_expected_updated_at THEN
    RAISE EXCEPTION 'artifact_concurrent_update';
  END IF;

  v_closed_at := CASE
    WHEN p_snapshot->>'fulfillment_status' = 'canceled'
      THEN COALESCE(v_order.closed_at, (p_snapshot->>'updated_at')::timestamptz)
    ELSE v_order.closed_at
  END;

  IF p_qa IS NOT NULL THEN
    INSERT INTO public.artifact_qa_reviews (
      order_id, revision, calculation_checked, narrative_checked,
      layout_checked, disclosures_checked, accessibility_checked,
      privacy_metadata_checked, approved, reviewed_by_clerk_user_id, reviewed_at
    ) VALUES (
      p_order_id, (p_qa->>'revision')::integer,
      (p_qa->>'calculation_checked')::boolean,
      (p_qa->>'narrative_checked')::boolean,
      (p_qa->>'layout_checked')::boolean,
      (p_qa->>'disclosures_checked')::boolean,
      (p_qa->>'accessibility_checked')::boolean,
      (p_qa->>'privacy_metadata_checked')::boolean,
      (p_qa->>'approved')::boolean,
      p_qa->>'reviewed_by_clerk_user_id',
      (p_qa->>'reviewed_at')::timestamptz
    );
  END IF;

  IF p_file IS NOT NULL THEN
    INSERT INTO public.artifact_files (
      order_id, revision, paper_size, private_bucket, storage_object_key,
      file_name, byte_size, sha256, generation_status, purge_after,
      created_by_clerk_user_id, created_at
    ) VALUES (
      p_order_id, (p_file->>'revision')::integer, p_file->>'paper_size',
      p_file->>'private_bucket', p_file->>'storage_object_key',
      p_file->>'file_name', (p_file->>'byte_size')::bigint,
      p_file->>'sha256', p_file->>'generation_status',
      COALESCE(v_closed_at + interval '180 days', 'infinity'::timestamptz),
      p_file->>'created_by_clerk_user_id', (p_file->>'created_at')::timestamptz
    );
  END IF;

  INSERT INTO public.artifact_order_events (
    id, order_id, event_type, actor_clerk_user_id, occurred_at,
    from_state, to_state, revision, reason_code, checksum
  )
  SELECT
    (item->>'event_id')::uuid, p_order_id, item->>'event_type',
    item->>'actor_clerk_user_id', (item->>'occurred_at')::timestamptz,
    item->>'from_state', item->>'to_state', (item->>'revision')::integer,
    item->>'reason_code', item->>'checksum'
  FROM jsonb_array_elements(p_new_events) AS item;

  UPDATE public.artifact_orders
  SET fulfillment_status = p_snapshot->>'fulfillment_status',
      financial_status = p_snapshot->>'financial_status',
      current_revision = (p_snapshot->>'current_revision')::integer,
      generation_started_at = (p_snapshot->>'generation_started_at')::timestamptz,
      refund_recorded_at = (p_snapshot->>'refund_recorded_at')::timestamptz,
      approved_at = CASE
        WHEN p_snapshot->>'fulfillment_status' = 'approved'
          THEN COALESCE(approved_at, (p_snapshot->>'updated_at')::timestamptz)
        ELSE approved_at
      END,
      external_delivery_ready_at = CASE
        WHEN p_snapshot->>'fulfillment_status' = 'ready_for_external_delivery'
          THEN COALESCE(external_delivery_ready_at, (p_snapshot->>'updated_at')::timestamptz)
        ELSE external_delivery_ready_at
      END,
      closed_at = v_closed_at
  WHERE id = p_order_id;

  IF v_closed_at IS NOT NULL AND v_order.closed_at IS NULL THEN
    UPDATE public.artifact_personalization
    SET purge_after = v_closed_at + interval '30 days'
    WHERE order_id = p_order_id;
    UPDATE public.artifact_profiles
    SET purge_after = v_closed_at + interval '180 days'
    WHERE order_id = p_order_id;
    UPDATE public.artifact_files
    SET purge_after = v_closed_at + interval '180 days'
    WHERE order_id = p_order_id AND deleted_at IS NULL;
    UPDATE public.artifact_support_cases
    SET purge_after = v_closed_at + interval '365 days'
    WHERE order_id = p_order_id;
  END IF;
  RETURN true;
END;
$$;

-- Claims a due file before object deletion. A failed storage call leaves the
-- row retryable as deletion_pending; a legal hold blocks the claim itself.
CREATE OR REPLACE FUNCTION public.artifact_begin_file_retention(
  p_record_id UUID,
  p_order_id UUID,
  p_as_of TIMESTAMPTZ DEFAULT now()
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_affected INTEGER := 0;
BEGIN
  UPDATE public.artifact_files f
  SET generation_status = 'deletion_pending'
  FROM public.artifact_orders o
  WHERE f.id = p_record_id
    AND f.order_id = p_order_id
    AND o.id = f.order_id
    AND f.purge_after <= p_as_of
    AND f.deleted_at IS NULL
    AND (o.legal_hold_until IS NULL OR o.legal_hold_until < p_as_of)
    AND f.generation_status IN ('generated', 'qa_approved', 'superseded', 'deletion_pending');
  GET DIAGNOSTICS v_affected = ROW_COUNT;
  RETURN v_affected = 1;
END;
$$;

-- Called only after the server job has removed a generated file from private
-- storage. Each successful deletion gets due/completed audit evidence.
CREATE OR REPLACE FUNCTION public.artifact_complete_retention(
  p_record_type TEXT,
  p_record_id UUID,
  p_order_id UUID,
  p_actor_clerk_user_id TEXT,
  p_as_of TIMESTAMPTZ DEFAULT now()
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_order public.artifact_orders%ROWTYPE;
  v_affected INTEGER := 0;
BEGIN
  SELECT * INTO v_order
  FROM public.artifact_orders
  WHERE id = p_order_id
  FOR UPDATE;
  IF NOT FOUND THEN RETURN false; END IF;
  IF p_record_type <> 'generated_file'
    AND v_order.legal_hold_until IS NOT NULL
    AND v_order.legal_hold_until >= p_as_of
  THEN
    RETURN false;
  END IF;

  CASE p_record_type
    WHEN 'raw_personalization' THEN
      DELETE FROM public.artifact_personalization
      WHERE order_id = p_record_id AND purge_after <= p_as_of;
    WHEN 'normalized_profile' THEN
      DELETE FROM public.artifact_profiles
      WHERE id = p_record_id AND order_id = p_order_id AND purge_after <= p_as_of;
    WHEN 'generated_file' THEN
      UPDATE public.artifact_files
      SET generation_status = 'deleted', deleted_at = p_as_of
      WHERE id = p_record_id AND order_id = p_order_id
        AND purge_after <= p_as_of AND deleted_at IS NULL
        AND generation_status = 'deletion_pending';
    WHEN 'support_case' THEN
      DELETE FROM public.artifact_support_cases
      WHERE id = p_record_id AND order_id = p_order_id AND purge_after <= p_as_of;
    ELSE
      RAISE EXCEPTION 'artifact_unknown_retention_type';
  END CASE;
  GET DIAGNOSTICS v_affected = ROW_COUNT;
  IF v_affected = 0 THEN RETURN false; END IF;

  INSERT INTO public.artifact_order_events (
    order_id, event_type, actor_clerk_user_id, occurred_at,
    from_state, to_state, revision, reason_code
  ) VALUES
    (p_order_id, 'retention_due', p_actor_clerk_user_id, p_as_of,
      v_order.fulfillment_status, v_order.fulfillment_status,
      v_order.current_revision, p_record_type),
    (p_order_id, 'retention_completed', p_actor_clerk_user_id, p_as_of,
      v_order.fulfillment_status, v_order.fulfillment_status,
      v_order.current_revision, p_record_type);
  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.artifact_create_fixture_order(JSONB, TEXT, TIMESTAMPTZ)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.artifact_commit_workflow_transition(UUID, TIMESTAMPTZ, JSONB, JSONB, JSONB, JSONB)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.artifact_begin_file_retention(UUID, UUID, TIMESTAMPTZ)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.artifact_complete_retention(TEXT, UUID, UUID, TEXT, TIMESTAMPTZ)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.artifact_create_fixture_order(JSONB, TEXT, TIMESTAMPTZ)
  TO service_role;
GRANT EXECUTE ON FUNCTION public.artifact_commit_workflow_transition(UUID, TIMESTAMPTZ, JSONB, JSONB, JSONB, JSONB)
  TO service_role;
GRANT EXECUTE ON FUNCTION public.artifact_begin_file_retention(UUID, UUID, TIMESTAMPTZ)
  TO service_role;
GRANT EXECUTE ON FUNCTION public.artifact_complete_retention(TEXT, UUID, UUID, TEXT, TIMESTAMPTZ)
  TO service_role;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'etsy-artifacts-private',
  'etsy-artifacts-private',
  false,
  10485760,
  ARRAY['application/pdf']::text[]
)
ON CONFLICT (id) DO UPDATE
SET public = false,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

INSERT INTO public.artifact_products (
  sku,
  name,
  artifact_type,
  schema_version,
  template_version,
  required_input_fields,
  active
)
VALUES (
  'KAI-ETSY-ANCHOR-V1',
  'Personal Natal Chart Anchor Print',
  'anchor_print',
  'kairos.anchor-print.v1',
  'anchor-print.obsidian-almanac.v1',
  ARRAY['display_name', 'birth_date', 'birth_time_or_unknown', 'birth_city', 'birth_country'],
  false
)
ON CONFLICT (sku) DO NOTHING;

ALTER TABLE public.artifact_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.artifact_products FORCE ROW LEVEL SECURITY;
ALTER TABLE public.artifact_admin_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.artifact_admin_roles FORCE ROW LEVEL SECURITY;
ALTER TABLE public.artifact_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.artifact_orders FORCE ROW LEVEL SECURITY;
ALTER TABLE public.artifact_personalization ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.artifact_personalization FORCE ROW LEVEL SECURITY;
ALTER TABLE public.artifact_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.artifact_profiles FORCE ROW LEVEL SECURITY;
ALTER TABLE public.artifact_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.artifact_files FORCE ROW LEVEL SECURITY;
ALTER TABLE public.artifact_qa_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.artifact_qa_reviews FORCE ROW LEVEL SECURITY;
ALTER TABLE public.artifact_support_cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.artifact_support_cases FORCE ROW LEVEL SECURITY;
ALTER TABLE public.artifact_order_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.artifact_order_events FORCE ROW LEVEL SECURITY;

-- No browser-role policies are created. All artifact access is through an
-- authenticated server route that checks a server-controlled artifact role,
-- then uses the service role. Future policies must be added in a new migration.
REVOKE ALL ON TABLE public.artifact_products FROM anon, authenticated;
REVOKE ALL ON TABLE public.artifact_admin_roles FROM anon, authenticated;
REVOKE ALL ON TABLE public.artifact_orders FROM anon, authenticated;
REVOKE ALL ON TABLE public.artifact_personalization FROM anon, authenticated;
REVOKE ALL ON TABLE public.artifact_profiles FROM anon, authenticated;
REVOKE ALL ON TABLE public.artifact_files FROM anon, authenticated;
REVOKE ALL ON TABLE public.artifact_qa_reviews FROM anon, authenticated;
REVOKE ALL ON TABLE public.artifact_support_cases FROM anon, authenticated;
REVOKE ALL ON TABLE public.artifact_order_events FROM anon, authenticated;

-- Supabase may provide broad service-role default privileges on newly-created
-- public tables. Reset them before granting the exact operational surface so
-- append-only audit evidence is protected by both ACLs and its trigger.
REVOKE ALL ON TABLE public.artifact_products FROM service_role;
REVOKE ALL ON TABLE public.artifact_admin_roles FROM service_role;
REVOKE ALL ON TABLE public.artifact_orders FROM service_role;
REVOKE ALL ON TABLE public.artifact_personalization FROM service_role;
REVOKE ALL ON TABLE public.artifact_profiles FROM service_role;
REVOKE ALL ON TABLE public.artifact_files FROM service_role;
REVOKE ALL ON TABLE public.artifact_qa_reviews FROM service_role;
REVOKE ALL ON TABLE public.artifact_support_cases FROM service_role;
REVOKE ALL ON TABLE public.artifact_order_events FROM service_role;

GRANT ALL ON TABLE public.artifact_products TO service_role;
GRANT ALL ON TABLE public.artifact_admin_roles TO service_role;
GRANT ALL ON TABLE public.artifact_orders TO service_role;
GRANT ALL ON TABLE public.artifact_personalization TO service_role;
GRANT ALL ON TABLE public.artifact_profiles TO service_role;
GRANT ALL ON TABLE public.artifact_files TO service_role;
GRANT ALL ON TABLE public.artifact_qa_reviews TO service_role;
GRANT ALL ON TABLE public.artifact_support_cases TO service_role;
GRANT SELECT, INSERT ON TABLE public.artifact_order_events TO service_role;

COMMENT ON TABLE public.artifact_orders IS
  'Birth-data-free minimal artifact ledger. Never grants application access.';
COMMENT ON TABLE public.artifact_personalization IS
  'Raw allowlisted personalization with a 30-day post-closure retention boundary.';
COMMENT ON TABLE public.artifact_profiles IS
  'Guest normalized calculation record; not an authenticated application profile.';
COMMENT ON TABLE public.artifact_files IS
  'Private artifact file evidence. Object keys are random and never buyer-visible.';
COMMENT ON TABLE public.artifact_order_events IS
  'Append-only, non-sensitive fulfillment audit evidence.';

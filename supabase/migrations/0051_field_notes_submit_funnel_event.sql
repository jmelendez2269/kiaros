BEGIN;

ALTER TABLE public.first_party_funnel_events
  DROP CONSTRAINT first_party_funnel_events_event_name_check;

ALTER TABLE public.first_party_funnel_events
  ADD CONSTRAINT first_party_funnel_events_event_name_check
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
    'paid_upgrade_completed',
    'field_notes_submit'
  ));

COMMIT;

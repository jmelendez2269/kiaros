# n8n Etsy Ingest

This workflow is the near-real-time fallback for Etsy order activation without requiring a direct Etsy app integration inside Kiaros.

## Goal

1. Etsy sends a seller order email.
2. n8n watches that mailbox.
3. n8n extracts the order details.
4. n8n POSTs the normalized order into Kiaros.
5. Kiaros upserts `marketplace_orders`.
6. The customer can activate immediately at `/activate`.

## Recommended n8n Trigger

- `Email Trigger (IMAP)` if you can dedicate an inbox for Etsy order emails.
- `Gmail Trigger` if you're using Gmail and polling is acceptable.

Official docs:

- https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.emailimap/
- https://docs.n8n.io/integrations/builtin/trigger-nodes/n8n-nodes-base.gmailtrigger/

## Suggested n8n Flow

1. Trigger on new email.
2. Filter for messages from `transaction@etsy.com`.
3. Extract:
   - external order id
   - purchaser email
   - purchaser name
   - listing title
   - listing id if available
   - SKU if available
   - purchase timestamp
   - source email message id
4. POST to:
   - `POST https://your-domain/api/commerce/etsy-ingest`
5. Include header:
   - `x-kiaros-ingest-secret: <N8N_INGEST_SECRET>`

## Expected JSON Payload

```json
{
  "external_order_id": "1234567890",
  "purchaser_email": "buyer@example.com",
  "purchaser_name": "Buyer Name",
  "listing_key": "Kiaros Planner + Oracle 2026",
  "listing_id": "123456789",
  "sku": "KIAROS-PLANNER-ORACLE-2026",
  "purchased_at": "2026-04-19T15:32:00Z",
  "source_message_id": "<abc123@example.com>",
  "raw_source": {
    "from": "transaction@etsy.com",
    "subject": "You made a sale on Etsy",
    "excerpt": "..."
  }
}
```

## Deterministic Mapping

Kiaros maps Etsy orders to tiers using these env vars:

- `ETSY_SKU_PLANNER`
- `ETSY_SKU_PLANNER_ORACLE`
- `ETSY_LISTING_ID_PLANNER`
- `ETSY_LISTING_ID_PLANNER_ORACLE`

Use SKU and listing ID matching first. Listing title is only the fallback.

## Required Kiaros Env Vars

- `N8N_INGEST_SECRET`
- `ETSY_SKU_PLANNER`
- `ETSY_SKU_PLANNER_ORACLE`
- optional:
  - `ETSY_LISTING_ID_PLANNER`
  - `ETSY_LISTING_ID_PLANNER_ORACLE`

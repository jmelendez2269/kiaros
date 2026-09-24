# Etsy Anchor Print Manual Delivery & Retention SOP

> **Operator Standard Operating Procedure**  
> Created: 2026-09-24  
> Covers: Manual Etsy Messages PDF delivery, retention schedule alignment, controlled dry-run testing

---

## Purpose

This SOP documents the controlled manual delivery workflow for Etsy Anchor Print (Personal Natal Astrology Report + Anchor Print) orders through Etsy Messages, the retention schedule aligned with published Privacy Policy and Terms of Service, and the operator checklist for internal dry-run testing using fictional data.

**Critical constraints:**

- **Etsy listing publication remains OFF** until separate approval closes all gates in `docs/etsy-anchor-print-launch-approval-packet.md`.
- **Real buyer intake via n8n or external webhook remains OFF** until separate approval.
- This SOP supports named operators performing controlled testing and, after all approvals, manual fulfillment of real orders entered through `/admin/artifacts`.

---

## Named Operator Access

### Who qualifies as a named operator

A **named operator** is a Clerk-authenticated user with:

1. **Clerk `publicMetadata.isAdmin === true`** — set manually via Clerk dashboard by an existing admin  
   _Source: `lib/artifacts/fulfillment/admin-access.ts` lines 28-29_

**No separate environment variable allowlist.** Operator authorization is Clerk-based only.

Optional future layer (schema exists but not actively enforced in admin route code as of 2026-09-24):

- `artifact_admin_roles` table row with role `operator`, `reviewer`, or `privacy_admin`  
  _Source: `supabase/migrations/0045_artifact_fulfillment.sql` lines 21-29_

### How to verify operator access

1. Sign in to the Kiaros admin surface
2. Navigate to `/admin/artifacts` (route exists at `app/(admin)/admin/artifacts`)
3. If the page loads and shows the artifact workflow console → access granted
4. If redirected to sign-in or shown `404` → access denied

**Production status 2026-09-24:** Admin UI is durable on `main`. All three flags enabled in Vercel production. Named operators have full access to the workflow console.

---

## Flag Inventory & Production Status

**Production environment verified 2026-09-24:**

| Flag | Vercel Production Value | What It Gates | Enforcement Layer |
|------|-------------------------|---------------|-------------------|
| `KIAROS_ETSY_ARTIFACT_ADMIN` | `"true"` ✅ | Admin UI routes (`/admin/artifacts`, `/api/admin/artifacts/*`) | `lib/feature-flags.ts` line 34, checked in `lib/artifacts/fulfillment/availability.ts` lines 9-11 |
| `KIAROS_ETSY_ARTIFACT_PERSISTENCE` | `"true"` ✅ | Supabase persistence (all eight operational tables active) | `lib/feature-flags.ts` line 38, checked in `lib/artifacts/fulfillment/availability.ts` lines 10-11 and `lib/artifacts/fulfillment/repository.ts` line 98 |
| `KIAROS_ETSY_ARTIFACT_REAL_INTAKE` | `"true"` ✅ | Manual real-order intake via `/admin/artifacts` (UI unlocked) | `lib/feature-flags.ts` line 42, checked in `lib/artifacts/fulfillment/availability.ts` lines 14-18 |

**All three flags are enabled in production.** This unlocks the admin workflow for named operators but does **not** automatically activate the product or publish the Etsy listing.

**Additional production constraints (held separately):**

- **Product inactive:** `KAI-ETSY-ANCHOR-V1` row in `artifact_products` table has `active=false` — no orders can reference this SKU until separately activated
- **Etsy listing unpublished:** Listing remains in draft on Etsy Seller Dashboard — no buyers can discover or purchase until separately published
- **Real buyer intake held:** Named operators have UI access but must not process real buyer orders until all approval gates close

**Combined gate logic:**

```typescript
// lib/artifacts/fulfillment/availability.ts lines 14-18
function isRealArtifactIntakeEnabled(): boolean {
  return isArtifactWorkflowEnabled()
    && isEtsyArtifactPersistenceEnabled()
    && isEtsyArtifactRealIntakeEnabled();
}
```

All three flags `"true"` → real intake **technically enabled**, but **operationally held** via inactive product + unpublished listing + operator discipline.

### Etsy SKU/Listing Mapping — Legacy Activation Only (Not Artifact Fulfillment)

These environment variables map Etsy orders to Kairos access tiers for the **separate legacy activation workflow** (`POST /api/commerce/etsy-ingest`). They do **not** control artifact fulfillment.

| Variable | Purpose | Notes |
|----------|---------|-------|
| `ETSY_SKU_PLANNER` | Maps SKU to Planner-only tier | Used by `lib/commerce/etsy-mapping.ts`; legacy activation path only |
| `ETSY_SKU_PLANNER_ORACLE` | Maps SKU to Planner+Oracle tier | Same |
| `ETSY_LISTING_ID_PLANNER` | Maps listing ID to Planner-only tier | Fallback if SKU unavailable |
| `ETSY_LISTING_ID_PLANNER_ORACLE` | Maps listing ID to Planner+Oracle tier | Same |

**Do not confuse these with artifact fulfillment.** Anchor Print uses SKU `KAI-ETSY-ANCHOR-V1` internally but has no automated Etsy intake yet.

### n8n Ingest Secret — Not Used for Artifacts

`N8N_INGEST_SECRET` gates `POST /api/commerce/etsy-ingest`, the legacy activation webhook. **This is not the artifact fulfillment path.** Artifacts currently have no automated Etsy intake; all orders are entered manually at `/admin/artifacts`.

---

## Admin Dry-Run Click Path (Non-Production or Production with Fake IDs)

Use this workflow to verify the generate → QA → download flow without touching real buyer data or publishing to Etsy.

### Prerequisites

- Signed in as a Clerk admin (`publicMetadata.isAdmin === true`)
- All three artifact flags enabled (current production state)

### Important: Local Dev vs Production Dry-Run

**Local development (NODE_ENV !== "production"):**
- Use fictional **fixture** orders: click "Known time fixture" or "Unknown time fixture"
- System creates orders with `fixture-*` shop/receipt/transaction IDs
- Support email ending in `.test`
- Artifact ID prefixed `art_fixture_`

**Production dry-run (kairosplanner.xyz):**
- **Fixtures are NOT available** in production
- Use **manual intake** with clearly fake IDs:
  - Shop ID: `DRYRUN-SHOP-001`
  - Receipt ID: `DRYRUN-RECEIPT-001`
  - Transaction ID: `DRYRUN-TX-001`
  - Support email: `dryrun@example.test` (or similar clearly fake address)
  - Display name: `DRYRUN Test` or `Avery (dry-run)`
- Mark order as `fictional: true` during intake
- Use recognizable fake birth data (e.g., Portland 1990-04-04)

### Step-by-step (Production Manual Intake)

1. **Navigate:** `/admin/artifacts`

2. **Create Dry-Run Order:**
   - Click **"Create manual order"** (real intake UI available in production)
   - Fill the intake form with clearly fake data:
     - **Shop ID:** `DRYRUN-SHOP-001`
     - **Receipt ID:** `DRYRUN-RECEIPT-001`
     - **Transaction ID:** `DRYRUN-TX-001`
     - **Unit index:** `1`
     - **Quantity:** `1`
     - **Listing ID:** (blank or `DRYRUN-LISTING-001`)
     - **Purchased at:** Current timestamp
     - **Support email:** `dryrun@example.test`
     - **Display name:** `DRYRUN Test` or `Avery (dry-run)`
     - **Birth date:** `1990-04-04`
     - **Birth time:** `08:30 AM` (or `UNKNOWN` for unknown-time test)
     - **Birth city:** `Portland`
     - **Birth country:** `United States`
     - **Fictional:** ☑ Check this box
   - Submit → order appears in workflow console in `Intake draft` state

3. **Validate Intake:**
   - Select the new order
   - Click **"Validate intake"**
   - State changes to `Ready to generate`

4. **Generate Report:**
   - Click **"Generate"**
   - State changes to `Generating`, then `QA required`
   - 26-page report + 1-page Anchor Print generated for both US Letter and A4

5. **Approve QA:**
   - Check all six QA items:
     - ☑ Calculation and uncertainty rules checked
     - ☑ Narrative facts, spelling, and tone checked
     - ☑ Report and Anchor Print reviewed in Letter and A4
     - ☑ Scope, AI-assistance, and advice disclosures present
     - ☑ Reading order, text equivalents, and non-color cues checked
     - ☑ Filename and buyer-visible metadata contain no private internals
   - Click **"Approve QA"**
   - State changes to `Approved`

6. **Export PDFs:**
   - Click **"Export all formats"** (or export each individually)
   - Each export records SHA-256 hash, file size, operator ID, timestamp
   - After all four files exported, state changes to `Ready for external delivery`

7. **Download for Review:**
   - Click **"Download"** next to each file variant:
     - Report (Letter)
     - Report (A4)
     - Anchor Print (Letter)
     - Anchor Print (A4)
   - Review PDFs locally for accessibility, content quality, metadata privacy

8. **Optional: Request Revision:**
   - If QA finds issues, click **"Request revision"**
   - State changes to `Revision required`
   - Click **"Generate"** again to create revision 2
   - Repeat QA → Approve → Export cycle

9. **Verify Audit Trail:**
   - Expand order detail
   - Confirm all events recorded with timestamps, actor IDs, state transitions
   - Confirm file evidence recorded with SHA-256, storage key (or null for local), bytes

### What NOT to do in dry-run

- ❌ **Do not use** real Etsy shop/receipt/transaction IDs from actual orders
- ❌ **Do not use** real buyer birth data, names, emails, or addresses
- ❌ **Do not publish** any Etsy listing (listing remains draft on Etsy Seller Dashboard)
- ❌ **Do not activate** the product row in `artifact_products` (`active=false` must remain)
- ❌ **Do not upload** PDFs to Etsy or any public URL
- ❌ **Do not send** any Etsy Messages or emails to real people
- ❌ **Do not uncheck** the "Fictional" checkbox for dry-run orders

---

## Manual Etsy Messages Delivery (Real Orders After Approval)

**Pre-flight check:** All approval gates in `docs/etsy-anchor-print-launch-approval-packet.md` must be closed:

- ☑ Founder offer approved
- ☑ Legal review complete
- ☑ Independent accessibility review complete
- ☑ Controlled deployment/flag activation approved
- ☑ Etsy publication separately approved

### When to deliver

Deliver PDFs **after** all of these conditions are met:

1. Order state is `Ready for external delivery`
2. All four PDF variants exported and SHA-256 verified
3. All six QA items approved by a named operator
4. Support email confirmed valid (not `.test`)
5. No pending clarification or revision request

### What to attach

Attach all four PDFs to a single Etsy Messages conversation:

- `{display_name}_natal_report_letter_{yyyy_mm_dd}.pdf` (US Letter)
- `{display_name}_natal_report_a4_{yyyy_mm_dd}.pdf` (A4)
- `{display_name}_anchor_print_letter_{yyyy_mm_dd}.pdf` (US Letter)
- `{display_name}_anchor_print_a4_{yyyy_mm_dd}.pdf` (A4)

Replace `{display_name}` with the buyer's provided name (or `natal` if blank), and `{yyyy_mm_dd}` with the purchase date.

### What to say

Use this template (adjust for tone/context):

> **Subject:** Your Kairos Personal Natal Astrology Report + Anchor Print
> 
> Hi [Name],
> 
> Thank you for your order! Attached are your four personalized PDF files:
> 
> 1. **26-page Natal Report + Planner Tour** (US Letter)
> 2. **26-page Natal Report + Planner Tour** (A4)
> 3. **One-page Anchor Print keepsake** (US Letter)
> 4. **One-page Anchor Print keepsake** (A4)
> 
> Both paper sizes contain the same content — use whichever fits your region or printer.
> 
> The report includes your natal wheel, complete placements, fourteen interpretive chapters, and eight reflection prompts. The Anchor Print distills six key themes as a standalone keepsake.
> 
> If you notice a calculation error, spelling mistake, or file defect, please reply within 14 days and I'll correct it within two business days.
> 
> Warmly,  
> [Operator Name]  
> Kairos

### Post-delivery workflow actions

After sending the Etsy Message:

1. **Record delivery timestamp** — future: add `delivered_at` column or event type; manual note for now
2. **Start retention clock** — 30 days from delivery for raw personalization (see Retention Schedule)
3. **Monitor Etsy Messages** for buyer questions, correction requests, or refund cases
4. **Do not close order record** until retention schedule completes

---

## Retention Schedule & Privacy Policy Alignment

The retention schedule is defined in:

- `app/privacy/page.tsx` (public Privacy Policy)
- `app/terms/page.tsx` (public Terms of Service)
- `lib/artifacts/fulfillment/retention.ts` (automated retention logic)
- `supabase/migrations/0045_artifact_fulfillment.sql` RPC `artifact_retention_candidates`

### Retention windows (from delivery date)

| Data Type | Column/Table | Retention Window | Deletion Method |
|-----------|--------------|------------------|-----------------|
| **Raw personalization** | `artifact_personalizations.raw_input_json` | **30 days** | `artifact_complete_retention('raw_personalization', ...)` |
| **Normalized profile** | `artifact_personalizations.normalized_profile_json` | **180 days** | `artifact_complete_retention('normalized_profile', ...)` |
| **Generated PDF files** | `artifact_files` + Supabase Storage | **180 days** | `artifact_complete_retention('generated_file', ...)` + storage delete |
| **Support correspondence** | External (Etsy Messages, email) | **12 months** | Manual purge; not stored in Kiaros DB |
| **Minimal order ledger** | `artifact_orders` (birth-data-free columns only) | **7 years or legally required** | Final `artifact_complete_retention(...)` with cascading cleanup |

**Important:** These windows start from **delivery date** (or case closure for canceled orders), not purchase date.

### Privacy Policy citation

From `app/privacy/page.tsx` (current as of 2026-09-24):

> **6.3 Etsy Artifact Orders**
> 
> When you purchase a personalized artifact (such as a natal astrology report) through Etsy, we collect and process your birth details to generate your order. We retain:
> 
> - **Raw personalization data:** deleted within **30 days** of delivery or case closure;
> - **Normalized calculation data and generated files:** deleted within **180 days** of delivery or case closure to support corrections;
> - **Support correspondence:** retained for up to **12 months**;
> - **Minimal order ledger** (no birth data): retained for **7 years** or the legally required period for tax, refund, and dispute records.

### Terms of Service citation

From `app/terms/page.tsx` (current as of 2026-09-24):

> **7. Data Retention**
> 
> We retain your personal information only as long as necessary to fulfill the purposes described in our Privacy Policy. For Etsy artifact orders, we delete raw personalization within 30 days of delivery and normalized calculation data within 180 days, while retaining a minimal ledger for up to 7 years for legal compliance.

### How to run retention (manual process)

Until order volume justifies automation, retention is a manual operator procedure:

1. **Identify eligible orders:**
   - Query `artifact_retention_candidates(p_as_of := NOW())` via Supabase SQL Editor
   - Returns rows with `record_type`, `record_id`, `order_id`, `storage_object_key`

2. **Run retention script (local/staging only):**
   ```typescript
   import { runLocalArtifactRetention } from "@/lib/artifacts/fulfillment/retention";
   
   const result = await runLocalArtifactRetention({
     actorId: "clerk:your_user_id",
     asOf: new Date().toISOString(),
   });
   
   console.log(result);
   // { considered: N, completed: N, skipped: N, failures: [...] }
   ```

3. **Review failures:**
   - Any entry in `failures` array indicates a retention error
   - Common failure reasons: `missing_storage_key`, `claim_failed`, `storage_delete_failed`, `completion_failed`
   - Log failures for investigation; retry or escalate

4. **Verify deletions:**
   - Check `artifact_personalizations.deleted_at` populated
   - Check `artifact_files.deleted_at` populated
   - Check Supabase Storage bucket `etsy-artifacts-private` no longer contains deleted keys
   - Confirm minimal `artifact_orders` row remains with redacted/nulled birth data

### Automation future work

When order volume exceeds ~50/month:

- Deploy `app/api/cron/artifact-retention/route.ts` (does not exist yet)
- Add Vercel cron schedule (e.g., daily at 2 AM UTC)
- Monitor via logs, alerting for retention failures
- Still preserve manual audit capability

---

## What This SOP Explicitly Does NOT Authorize

1. **Etsy listing publication** — requires separate founder approval after all gates close (listing remains draft on Etsy Seller Dashboard)
2. **Product activation** — `KAI-ETSY-ANCHOR-V1` must remain `active=false` in `artifact_products` until separate approval
3. **Real buyer order processing** — only `DRYRUN-*` IDs with fictional checkbox checked until all approval gates close
4. **Automated Etsy API upload or messaging** — not implemented; all delivery is manual Etsy Messages
5. **Gifting or third-party orders** — not supported; buyer must provide own birth data with consent
6. **Using real buyer data in dry-runs** — always use clearly fake `DRYRUN-*` IDs + fictional checkbox
7. **Bypassing QA approval** — every order requires complete 6-item QA checklist

---

## Operator Checklist for One Production Dry-Run

Use this checklist to verify the workflow in production before processing any real buyer order:

- [ ] Confirm Clerk admin access granted (`publicMetadata.isAdmin === true`)
- [ ] Confirm all three artifact flags enabled in Vercel production (current state)
- [ ] Confirm `KAI-ETSY-ANCHOR-V1` product row has `active=false` in `artifact_products` table
- [ ] Confirm Etsy listing remains unpublished (draft on Etsy Seller Dashboard)
- [ ] Navigate to `/admin/artifacts` → page loads successfully
- [ ] Click **"Create manual order"** → fill intake form with clearly fake `DRYRUN-*` IDs
- [ ] Check **"Fictional"** checkbox → submit → order created in `Intake draft`
- [ ] Click **"Validate intake"** → state changes to `Ready to generate`
- [ ] Click **"Generate"** → state changes through `Generating` to `QA required`
- [ ] Verify artifact generated: 26-page report + 1-page Anchor Print visible in UI
- [ ] Check all six QA items → click **"Approve QA"** → state changes to `Approved`
- [ ] Click **"Export all formats"** → state changes to `Ready for external delivery`
- [ ] Download each of the four PDF variants (Report Letter/A4, Anchor Print Letter/A4)
- [ ] Open each PDF → verify:
  - [ ] Selectable text, embedded fonts, readable at 100% zoom
  - [ ] Only dry-run data (name/email contain "DRYRUN" or clearly fake)
  - [ ] Calculation facts, interpretive chapters, prompts, disclosures all present
  - [ ] Chart wheel, placement table, aspect grid visible
  - [ ] Anchor Print shows six themes, no private metadata in filename
- [ ] Verify audit trail in UI → all events recorded with timestamps, actor IDs
- [ ] **Do not send** any Etsy Messages, emails, or upload files anywhere
- [ ] **Do not publish** Etsy listing or activate product row
- [ ] **Do not process** real buyer orders until all approval gates close

---

## Summary

- **Named operators** are Clerk admins (`publicMetadata.isAdmin === true`), no separate env allowlist
- **All three artifact flags enabled** in Vercel production as of 2026-09-24
- **Product inactive** (`KAI-ETSY-ANCHOR-V1` has `active=false` in database)
- **Etsy listing unpublished** (draft on Etsy Seller Dashboard)
- **Real buyer intake held** by operator discipline (fictional checkbox, fake IDs only)
- **Listing publication** is a separate manual Etsy Seller action, not gated by a Kiaros flag
- **Delivery** is manual Etsy Messages attachment after QA approval
- **Retention** follows published Privacy/Terms schedule (30/180 days/12 months/7 years)
- **Production dry-run** uses manual intake with `DRYRUN-*` IDs + fictional checkbox

**Before first real order:**

1. Close all approval gates in `docs/etsy-anchor-print-launch-approval-packet.md`:
   - ☑ Founder offer approved (26-page report, $34, separate Anchor Print)
   - ☐ Legal review complete
   - ☐ Independent accessibility review complete
2. Activate product row: set `active=true` on `KAI-ETSY-ANCHOR-V1` in `artifact_products` (separate approval + migration)
3. Publish Etsy listing manually via Etsy Seller Dashboard (separate approval)
4. Process first real order: uncheck "Fictional", use real Etsy receipt/transaction IDs, verify buyer consent
5. Monitor first 5-10 orders closely for QA quality, delivery timing, buyer feedback
6. Document any issues, iterate SOP as needed

---

**Document Version:** 1.0  
**Last Updated:** 2026-09-24  
**Next Review:** After first 10 real orders delivered, or 2026-12-31, whichever comes first

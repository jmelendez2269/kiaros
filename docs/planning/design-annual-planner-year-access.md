# Design Note: Annual Subscription Planner Year Access

**Status:** Design proposal — not yet implemented  
**Author:** Cloud Agent  
**Date:** 2026-09-24  
**Context:** PR #13 (`cursor/annual-subscription-renewals-9872`) converted annual direct Planner purchases into yearly Stripe subscriptions. Each renewal extends `product_entitlements.ends_at` by 365 days but leaves `planner_year` frozen at the year of initial purchase. Result: a paid annual subscriber who bought in 2026 will never gain access to the 2027 Blueprint, even though their entitlement window extends into 2027.

**CEO decision (Kai):** An ACTIVE PAID annual subscriber gets access to whichever planner year's Blueprint is current during their paid window. That's what "Covers 365 days from purchase" means. The deadline is the planner-year roll to 2027 (the `CURRENT_PLANNER_YEAR` bump in `lib/commerce/config.ts`), not first renewals.

---

## 1. Current Behavior: Where Planner Year Gates Access or Content

### 1.1 Capabilities Resolver (`lib/commerce/capabilities.ts`)

**Function:** `resolveAccessCapabilities`

```typescript
const fullYears = sortedYears(
  [...activeAnnual, ...readOnlyAnnual].map(({ entitlement }) => entitlement.plannerYear),
);
```

**Behavior:** 
- Collects `plannerYear` from each entitlement row
- Returns `blueprintFullAccessYears: number[]` — the years the user can read/write
- `getBlueprintYearCapability(capabilities, plannerYear)` checks if a specific year is in that list

**Current issue:** An entitlement created 2026-01-15 with `planner_year = 2026` and `ends_at = 2027-01-14` grants access to the 2026 Blueprint only, even though the paid window extends 14 days into 2027.

---

### 1.2 Blueprint Generation (`app/api/blueprint/generate/route.ts`)

**Route:** `POST /api/blueprint/generate`

```typescript
const plan_year = profile.plan_year ?? new Date().getFullYear();
```

**Behavior:** 
- Uses `user_profiles.plan_year` (set during onboarding to `CURRENT_PLANNER_YEAR`)
- Generates a Blueprint for that year
- The user can only generate for their assigned `plan_year`

**Current issue:** A user who signed up in 2026 has `plan_year = 2026` forever. When 2027 starts, they cannot generate a 2027 Blueprint even if their annual subscription is still active. No mechanism exists to advance `user_profiles.plan_year` on year roll or renewal.

---

### 1.3 Blueprint Reading (`lib/blueprint/load.ts`)

**Function:** `loadBlueprintForYear`

```typescript
const access: BlueprintYearCapability = getBlueprintYearCapability(capabilities, plannerYear)
```

**Behavior:**
- Loads Blueprint for a specific `plan_year` from `blueprints` table
- Access is gated by `capabilities.blueprintFullAccessYears` (which comes from entitlement `planner_year`)
- If year not in `blueprintFullAccessYears`, returns `{ access: "none", ... }`

**Current issue:** Even if a 2027 Blueprint row exists (say, admin-generated), a subscriber with only a 2026 entitlement cannot read it.

---

### 1.4 Oracle System Prompt (`lib/ai/oracle-system-prompt.ts`)

**Function:** `buildOracleSystemPrompt`

```typescript
buildLayer4(ctx.profile, ctx.blueprint, ctx.today)
```

**Behavior:**
- Pulls the current Blueprint (via `loadCurrentBlueprint(supabaseUserId)`)
- `loadCurrentBlueprint` calls `loadBlueprintForYearUncached(userId, new Date().getFullYear())`
- If access to that year is `none`, returns `null` → Oracle sees "Blueprint: not yet generated"

**Current issue:** A 2026 subscriber active into 2027 sees "Blueprint: not yet generated" starting Jan 1, 2027, because their entitlement `planner_year = 2026` does not grant access to 2027.

**Impact on Oracle routes:**
- `POST /api/oracle/chat` — streams chat responses without 2027 Blueprint context
- `POST /api/oracle/explain` — explains journal entries without 2027 Blueprint context
- `POST /api/oracle/captures` — saves captures but cannot ground them in 2027 Blueprint

---

### 1.5 Cosmic Calendar (`app/(app)/year/page.tsx`, month/week views)

**Behavior:**
- Year/month/week views call `loadBlueprintForYear(userId, displayedYear)`
- Access is gated by capabilities
- If `access === "none"`, UI shows a locked state or empty view

**Current issue:** A subscriber who bought 2026 annual on Dec 1, 2026 and whose window runs through Nov 30, 2027 cannot view the calendar for 2027 starting Jan 1, 2027.

---

### 1.6 Daily Tracker (`app/(app)/tracker/page.tsx`)

**Direct dependency:** None — Daily Tracker does not gate on `planner_year` directly. Logs are stored with `log_date` but not tied to a specific Blueprint year.

**Indirect dependency:** The "Active Planner" check (`requireActivePlannerAccess`) relies on `capabilities.canUsePlanner`, which derives from having at least one active entitlement. The entitlement's `planner_year` does not block tracker writes, but if the entitlement expires, tracker writes stop.

**Year-roll issue:** No direct issue. If the user's entitlement is still active (even with `planner_year = 2026`), they can continue logging through 2027. However, tracker display logic may expect a current Blueprint for context.

---

### 1.7 Curriculum Plans & Sessions

**Schema:**
- `curriculum_plans` table has no `planner_year` column
- Plans are tied to user, not year
- Sessions reference weeks by `week_number` (1–52)

**Indirect dependency:** Curriculum sessions are shown in the Month view calendar, which depends on Blueprint access. If the user cannot read the 2027 Blueprint, the calendar view is locked, and curriculum session display is affected.

**Year-roll issue:** No direct gating on `planner_year`. Curriculum plans can span year boundaries. The issue is UI presentation, not data access.

---

### 1.8 Loyalty Rewards (`loyalty_rewards` table)

**Schema:**

```sql
CREATE TABLE loyalty_rewards (
  user_id UUID NOT NULL,
  reward_year SMALLINT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending','created','emailed','redeemed','expired','cancelled')),
  ...
  UNIQUE (user_id, reward_year)
);
```

**Behavior:**
- One-time annual buyers (direct Stripe, pre-PR #13) and Etsy buyers get a `$18` loyalty reward for `NEXT_PLANNER_YEAR` (2027)
- Annual subscribers (PR #13 onward) do NOT get a separate loyalty reward; the locked founding price IS their reward
- At checkout, `findRedeemableLoyaltyReward` looks for `reward_year = tier.plannerYear` (the year being purchased)

**Kai's decision (in PR #13 copy):** Loyalty rewards are GATED by year. A 2027 reward can only be redeemed toward a 2027 purchase. This is intentional — the reward is for the NEXT year, not a rolling credit.

**Year-roll issue:** No change needed here per Kai's direction. This design note only flags that loyalty reward gating by `reward_year` is separate from the entitlement access question and is a product/pricing decision that Kai has already decided.

---

### 1.9 Etsy Activation (`app/api/activate/complete/route.ts`)

**Behavior:**

```typescript
const entitlementPayload = buildAnnualEntitlementRecord({
  user_id: profile.id,
  source: "etsy",
  product_tier: order.product_tier,
  planner_year: order.planner_year,
  oracle_enabled: order.oracle_enabled,
  startAt: new Date(),
});
```

**Current state:**
- Etsy orders are imported with `marketplace_orders.planner_year` set to `CURRENT_PLANNER_YEAR` at import time
- When activated, that `planner_year` is copied to the entitlement
- A user who activates an Etsy code on 2026-12-15 gets `planner_year = 2026`, `ends_at = 2027-12-14` (365-day window from activation)

**Year-roll issue:** Same as direct annual buyers. An Etsy code activated late 2026 grants a 365-day window that crosses into 2027, but the entitlement `planner_year = 2026` only grants access to 2026 Blueprint.

**Product question (for Kai/Jack):** Should a late-2026 Etsy activation grant access to BOTH 2026 and 2027 Blueprints during the overlap? Or is the expectation that the buyer purchases the year printed on the Etsy listing (2026), regardless of when they activate?

---

### 1.10 Monthly Subscriptions

**Schema:**
- `product_entitlements.access_plan` = `"monthly"`
- Entitlement is created with `planner_year = CURRENT_PLANNER_YEAR` at signup

**Behavior:**
- Each month, `syncSubscriptionEntitlement` updates `ends_at` to `subscription.current_period_end`
- `planner_year` is NEVER updated
- A user who signs up for monthly on 2026-12-01 has `planner_year = 2026` forever

**Year-roll issue:** Same as annual. A monthly subscriber who signed up in 2026 cannot access the 2027 Blueprint starting Jan 1, 2027, even though their monthly subscription is still active.

**Impact severity:** HIGHER than annual, because monthly subscribers are ALWAYS crossing year boundaries. A subscriber who joins in any month of 2026 hits this issue on Jan 1, 2027.

---

### 1.11 Read-Only Access After Expiry

**Schema:**
- `resolveCapabilityEntitlementState` returns `"read_only"` when `today > endsAt` AND `accessPlan === "yearly"`
- Monthly entitlements become `"expired"` immediately after `ends_at`

**Behavior:**
- An expired annual entitlement grants read-only access to `entitlement.plannerYear`
- The user can view their Blueprint, journal, goals, but cannot write

**Year-roll issue:**
- A user who bought 2026 annual on Jan 1, 2026 has `ends_at = 2026-12-30` (365 days)
- After Dec 30, 2026, they get read-only access to the 2026 Blueprint
- They CANNOT read the 2027 Blueprint even in read-only mode (they never had an entitlement for 2027)

**Product question (for Kai/Jack):** Should read-only access extend to ANY Blueprint the user generated while their entitlement was active? E.g., if the 2026 annual subscriber generated a 2027 Blueprint on Dec 15, 2026 (because their window was extended by the fix proposed here), should they retain read-only access to BOTH 2026 and 2027 Blueprints after expiry?

---

## 2. Proposed Model Options

### Option A: Derive Covered Planner Years from Active Window at Resolve Time (RECOMMENDED)

**Change:** Modify `resolveAccessCapabilities` to compute which planner years are covered by each entitlement's `[starts_at, ends_at]` window, rather than trusting `entitlement.planner_year` as the single year granted.

**Logic:**

```typescript
// For each entitlement:
const coveredYears = [];
const startYear = new Date(`${entitlement.startsAt}T00:00:00.000Z`).getUTCFullYear();
const endYear = new Date(`${entitlement.endsAt}T00:00:00.000Z`).getUTCFullYear();

for (let year = startYear; year <= endYear; year++) {
  // Does this entitlement's window meaningfully overlap with this planner year?
  // Define "meaningful" as >= 30 days overlap (policy decision)
  const yearStart = `${year}-01-01`;
  const yearEnd = `${year}-12-31`;
  const overlapStart = entitlement.startsAt > yearStart ? entitlement.startsAt : yearStart;
  const overlapEnd = entitlement.endsAt < yearEnd ? entitlement.endsAt : yearEnd;
  const overlapDays = daysBetween(overlapStart, overlapEnd);
  
  if (overlapDays >= 30) {
    coveredYears.push(year);
  }
}
```

**Result:**
- A 2026 annual entitlement with `starts_at = 2026-01-15`, `ends_at = 2027-01-14` grants access to BOTH 2026 (350 days) and 2027 (14 days)
- `blueprintFullAccessYears = [2026, 2027]`
- The user can read and write both Blueprints during the overlap window

**Blueprint generation:** Still use `user_profiles.plan_year` as the PRIMARY year, but allow generation for any year in `capabilities.blueprintFullAccessYears`. Add a year picker to the Blueprint generation UI or auto-generate for the current calendar year if in the covered set.

**Pros:**
- No migration needed — entitlements table stays as-is
- Handles all edge cases: late-year purchases, Etsy activations, monthly subscribers crossing year boundaries
- Semantically correct: "365 days from purchase" means coverage of calendar years that fall within that window

**Cons:**
- More complex capability resolution (but only ~20 lines of code)
- Need to define "meaningful overlap" threshold (30 days? 7 days? Any overlap?)
- A subscriber who buys on Dec 31, 2026 gets 1 day of 2026 access and 364 days of 2027 access — is that the intended behavior?

**Read-only access after expiry:**
- `planner_year` becomes a list: `covered_planner_years = [2026, 2027]` (derived at read-only time)
- User retains read-only access to ALL years they accessed while active

**Migration:** None required for existing entitlements. Code change in `capabilities.ts` only.

---

### Option B: Write a New Entitlement Row Per Planner Year

**Change:** When an annual subscription renews or crosses a year boundary, write a SECOND entitlement row with `planner_year = NEXT_YEAR`.

**Logic (in `syncInvoiceSubscription`):**

```typescript
// After extending ends_at on the existing entitlement:
if (newEndsAt.getFullYear() > entitlement.planner_year) {
  // The window now crosses into a new year
  const nextYear = entitlement.planner_year + 1;
  
  await supabase
    .from("product_entitlements")
    .upsert({
      user_id: entitlement.user_id,
      source: "stripe",
      source_order_id: `${order.id}-${nextYear}`, // synthetic compound key
      product_tier: entitlement.product_tier,
      planner_year: nextYear,
      oracle_enabled: entitlement.oracle_enabled,
      starts_at: `${nextYear}-01-01`,
      ends_at: entitlement.ends_at,
      access_plan: entitlement.access_plan,
      status: "active",
    }, { onConflict: "source,source_order_id" });
}
```

**Result:**
- A 2026 annual subscriber who renews gets TWO entitlement rows:
  - Row 1: `planner_year = 2026`, `source_order_id = abc123`, `ends_at = 2027-01-14`
  - Row 2: `planner_year = 2027`, `source_order_id = abc123-2027`, `starts_at = 2027-01-01`, `ends_at = 2027-01-14`

**Pros:**
- No change to `capabilities.ts` — it already collects years from all entitlement rows
- Read-only access works as-is — each row represents a discrete year

**Cons:**
- More entitlement rows (but still only 1–2 per subscriber per renewal)
- Synthetic `source_order_id` compound key — breaks the 1:1 mapping between Stripe order and entitlement
- Confusing for refunds: which entitlement row do you revoke?
- Etsy activations and one-time purchases need the same logic

**Migration:** None required, but Stripe webhook handlers (`syncInvoiceSubscription`) and Etsy activation must implement the row-splitting logic.

---

### Option C: Advance `planner_year` on Renewal

**Change:** When an annual subscription renews, UPDATE the existing entitlement's `planner_year` to the new year.

**Logic (in `syncInvoiceSubscription`):**

```typescript
if (renewalInvoice.status === "paid") {
  const newYear = new Date().getFullYear(); // or derive from invoice period
  
  await supabase
    .from("product_entitlements")
    .update({
      planner_year: newYear,
      ends_at: toISODate(newEndsAt),
    })
    .eq("source", "stripe")
    .eq("source_order_id", order.id);
}
```

**Result:**
- A 2026 annual subscriber who renews on 2027-01-15 gets `planner_year = 2027`, `ends_at = 2028-01-14`
- The 2026 Blueprint becomes inaccessible (unless read-only access is handled separately)

**Pros:**
- Simplest schema change — one entitlement row, one year at a time
- Matches intuition: "I paid for 2027 access now"

**Cons:**
- LOSES ACCESS to the prior year's Blueprint during the overlap window
- A subscriber who renews on Dec 15, 2026 immediately loses 2026 Blueprint access and only gets 2027 (but 2027 Blueprint may not be generated yet!)
- Read-only access to prior years must be handled by a separate mechanism (e.g., track all historical `planner_year` values in a JSONB column)
- Etsy and one-time purchases have no renewal event, so they'd remain stuck on purchase year

**Verdict:** NOT RECOMMENDED. Breaks continuity during year transitions.

---

### Option D: Separate `purchased_year` and `accessible_years` Columns

**Change:** Add `accessible_years SMALLINT[]` to `product_entitlements`, computed from the `[starts_at, ends_at]` window.

**Logic:**

```typescript
const accessibleYears = [];
const startYear = new Date(`${startsAt}T00:00:00.000Z`).getUTCFullYear();
const endYear = new Date(`${endsAt}T00:00:00.000Z`).getUTCFullYear();
for (let year = startYear; year <= endYear; year++) {
  accessibleYears.push(year);
}

await supabase
  .from("product_entitlements")
  .update({ accessible_years: accessibleYears });
```

**Result:**
- `planner_year` remains as the "purchased for" year (for loyalty rewards, reporting)
- `accessible_years` is the derived list used by `resolveAccessCapabilities`

**Pros:**
- Clear separation of purchase year (for rewards) vs. access years (for capabilities)
- No synthetic keys or row-splitting

**Cons:**
- Requires migration to add column and backfill
- Redundant with `[starts_at, ends_at]` — accessible years can always be derived

**Verdict:** Functionally equivalent to Option A, but adds schema complexity. Option A derives on read; this pre-computes on write. Prefer Option A unless read performance is critical (it's not — entitlements are cached per request).

---

## 3. Recommendation: Option A (Derive Covered Years from Window)

**Why:**
1. No schema migration required
2. Handles all cases: annual, monthly, Etsy, late-year purchases
3. Semantically correct: "365 days from purchase" means what it says
4. Read-only access automatically extends to all years accessed while active

**Implementation sketch:**

### 3.1 Core Change: `lib/commerce/capabilities.ts`

```typescript
function getCoveredYears(entitlement: CapabilityEntitlement): number[] {
  const startYear = new Date(`${entitlement.startsAt}T00:00:00.000Z`).getUTCFullYear();
  const endYear = new Date(`${entitlement.endsAt}T00:00:00.000Z`).getUTCFullYear();
  const years: number[] = [];
  
  for (let year = startYear; year <= endYear; year++) {
    const yearStart = `${year}-01-01`;
    const yearEnd = `${year}-12-31`;
    const overlapStart = entitlement.startsAt > yearStart ? entitlement.startsAt : yearStart;
    const overlapEnd = entitlement.endsAt < yearEnd ? entitlement.endsAt : yearEnd;
    
    // Only grant access if the entitlement covers at least 14 days of this year
    // (policy: a purchase made on Dec 31 should not count as "full year access")
    const overlapMs = new Date(`${overlapEnd}T00:00:00.000Z`).getTime() 
                    - new Date(`${overlapStart}T00:00:00.000Z`).getTime();
    const overlapDays = Math.floor(overlapMs / (1000 * 60 * 60 * 24)) + 1;
    
    if (overlapDays >= 14) {
      years.push(year);
    }
  }
  
  return years;
}

export function resolveAccessCapabilities(input: ResolveAccessCapabilitiesInput): AccessCapabilities {
  // ... existing code ...
  
  const fullYears = sortedYears(
    [...activeAnnual, ...readOnlyAnnual].flatMap(({ entitlement }) => 
      getCoveredYears(entitlement)
    ),
  );
  
  // ... rest unchanged ...
}
```

**Threshold policy:** Use 14 days as the minimum overlap to grant access. This prevents edge cases like a Dec 31 purchase granting "2026 access" for 1 day. The 14-day threshold is arbitrary but conservative.

**Alternative:** Use 30 days (roughly 1 month). Requires Kai/Jack product decision.

---

### 3.2 Blueprint Generation: Allow User to Choose Year

**Route:** `POST /api/blueprint/generate`

**Change:** Accept an optional `planYear` body parameter. If provided and in `capabilities.blueprintFullAccessYears`, generate for that year. Otherwise, default to `new Date().getFullYear()` if accessible, else fallback to `user_profiles.plan_year`.

```typescript
const { planYear: requestedYear } = await request.json();

const capabilities = await loadUserAccessCapabilities(userId);
const currentYear = new Date().getFullYear();

let plan_year: number;
if (requestedYear && capabilities.blueprintFullAccessYears.includes(requestedYear)) {
  plan_year = requestedYear;
} else if (capabilities.blueprintFullAccessYears.includes(currentYear)) {
  plan_year = currentYear;
} else {
  plan_year = profile.plan_year ?? currentYear;
}
```

**UI:** On the `/onboarding/generate` or `/dashboard` page, if the user has access to multiple years (e.g., `[2026, 2027]`), show a year picker: "Generate Blueprint for 2026 or 2027?"

**Default:** Auto-generate for the current calendar year if accessible. This means a 2026 subscriber whose window extends into 2027 will auto-generate 2027 Blueprint on Jan 1, 2027 (if they request generation).

---

### 3.3 Oracle & Calendar: Already Handled

Once `blueprintFullAccessYears` includes 2027, these surfaces automatically work:

- **Oracle:** `loadCurrentBlueprint` calls `loadBlueprintForYear(userId, currentYear)`, which checks `getBlueprintYearCapability(capabilities, currentYear)`. If `currentYear` is in `blueprintFullAccessYears`, access is granted.
- **Calendar:** Same logic. Year/month/week views call `loadBlueprintForYear(userId, displayedYear)`.

No additional changes required.

---

### 3.4 Year-Roll Runbook: What Happens When `CURRENT_PLANNER_YEAR` → 2027

**Trigger:** Jack or Kai bumps `CURRENT_PLANNER_YEAR = 2027` in `lib/commerce/config.ts` and deploys.

**Immediate effects:**

1. **New purchases:** Tier configs now show `plannerYear: 2027`. New entitlements are created with `planner_year = 2027`.

2. **Existing annual/monthly subscribers:** Their entitlement rows still have `planner_year = 2026`, but their `ends_at` extends into 2027. With Option A implemented, `resolveAccessCapabilities` now returns `blueprintFullAccessYears = [2026, 2027]`.

3. **Blueprint generation:** Users with 2027 access can now generate 2027 Blueprints. The UI should default to 2027 if the current date is >= 2027-01-01.

4. **Oracle & Calendar:** Automatically pull 2027 Blueprint if accessible.

5. **Loyalty rewards:** New purchases in 2027 create rewards for `NEXT_PLANNER_YEAR = 2028` (per existing logic).

**Required migrations:** NONE, if Option A is implemented. All changes are code-only.

**Founder gate check:** Any time `CURRENT_PLANNER_YEAR` is bumped, Kai/Jack must decide:
- Does the locked founding price carry forward to 2027 purchases?
- Does the 2027 Blueprint generation use the same AI model and prompt structure?

If either answer is no, those decisions must be implemented BEFORE the year roll.

**Testing before year roll:**
1. Manually set `CURRENT_PLANNER_YEAR = 2027` in dev/staging
2. Create a test entitlement with `planner_year = 2026`, `ends_at = 2027-06-30`
3. Verify that `resolveAccessCapabilities` returns `[2026, 2027]`
4. Attempt to generate 2027 Blueprint — should succeed
5. Check Oracle system prompt — should include 2027 Blueprint if generated
6. Check Calendar year view for 2027 — should load if accessible

---

## 4. One-Time Annual Buyers: Retroactive Coverage?

**Question:** Should a one-time annual buyer who purchased on 2026-12-01 (365-day window through 2027-11-30) get access to the 2027 Blueprint starting Jan 1, 2027?

**Option A says YES:** Their entitlement window covers 335 days of 2027, so they get 2027 access.

**Alternative product position (requires Kai/Jack decision):**
- One-time purchases are for a SPECIFIC YEAR (2026), regardless of activation date
- The 365-day window is for reading/writing that year's Blueprint, not for accessing future years
- If the user wants 2027, they buy again in 2027

**Implications:**
- If "specific year" position is chosen, Option A logic must be amended to check entitlement source:
  - `source = "stripe"` + `access_plan = "yearly"` + subscription exists → derive covered years
  - `source = "stripe"` + no subscription → single year only (`planner_year`)
  - `source = "etsy"` → single year only (`planner_year`)

**Recommendation:** Defer to Kai/Jack, but note that the copy on the Stripe checkout and Etsy listings says "Covers 365 days from purchase," not "Access to 2026 only." If the copy implies time-based access, Option A's behavior is correct.

---

## 5. Read-Only Access After Expiry: Which Years Stay Readable?

**Current behavior (annual only):**
- After `ends_at`, user gets read-only access to `entitlement.plannerYear` only

**With Option A:**
- After `ends_at`, user gets read-only access to ALL years in `getCoveredYears(entitlement)`

**Example:**
- User bought 2026 annual on Dec 1, 2026 (`ends_at = 2026-11-30`)
- During active window, `blueprintFullAccessYears = [2026]`
- On Dec 1, 2027 (after expiry), `blueprintFullAccessYears = [2026]` (read-only)

**Example 2:**
- User bought 2026 annual on Jan 1, 2026 (`ends_at = 2026-12-30`)
- Subscription renewed automatically on Dec 30, 2026, extending `ends_at = 2027-12-29`
- During active window through 2027-12-29, `blueprintFullAccessYears = [2026, 2027]`
- On Dec 30, 2027 (after expiry), `blueprintFullAccessYears = [2026, 2027]` (both read-only)

**Product question (for Kai/Jack):** Is this desired behavior? Or should read-only access be limited to the "primary" year (the year purchased)?

**Recommendation:** Read-only access should extend to ALL years the user accessed while active. This respects the user's work — they generated goals, journal entries, and Blueprints for those years, and those artifacts should remain readable even after access expires.

---

## 6. Monthly Subscribers: Same Fix or Different Logic?

**Current issue:** Monthly subscribers signed up in 2026 have `planner_year = 2026` forever, even as their subscription continues into 2027.

**Option A fixes this:** `getCoveredYears` computes years from `[starts_at, ends_at]`. As `ends_at` is updated each month by Stripe webhooks, the covered years automatically shift forward.

**Example:**
- User signs up monthly on 2026-11-15
- `starts_at = 2026-11-15`, `ends_at = 2026-12-15`, `planner_year = 2026`
- On Dec 15, Stripe renews: `ends_at = 2027-01-15`
- `getCoveredYears` now returns `[2026, 2027]` (45 days of 2026, 15 days of 2027)
- On Jan 15, Stripe renews again: `starts_at` unchanged, `ends_at = 2027-02-15`
- `getCoveredYears` returns `[2026, 2027]` (45 days of 2026, 46 days of 2027)

**Issue:** The user retains access to 2026 forever, because `starts_at` is never updated. Is this desired?

**Alternative logic for monthly:**
- Update `starts_at` on each renewal to `MAX(starts_at, 12 months ago)`
- This slides the window forward and drops years that are > 12 months old

**Recommendation:** Keep it simple — use Option A as-is. Monthly subscribers paying continuously deserve access to the prior year's Blueprint for continuity. If memory/performance becomes an issue (it won't), revisit.

---

## 7. Implementation Effort Estimate

### Code changes (small)

| File | Change | Lines | Risk |
|------|--------|-------|------|
| `lib/commerce/capabilities.ts` | Add `getCoveredYears()` helper, call in `resolveAccessCapabilities` | ~40 | Low — pure function, testable in isolation |
| `app/api/blueprint/generate/route.ts` | Accept optional `planYear` param, validate against capabilities | ~15 | Low — optional param, backward-compatible |
| UI: add year picker to Blueprint generation page | Conditional render if `blueprintFullAccessYears.length > 1` | ~30 | Low — UI only |

**Total:** ~85 lines of production code.

---

### Tests (medium — this is the real work)

| Test Suite | Coverage | Effort |
|------------|----------|--------|
| `lib/commerce/capabilities.test.ts` | 20 test cases covering edge cases:<br>- Single-year entitlement<br>- 365-day window crossing year boundary<br>- Late-year purchase (Dec 15 → 2027)<br>- Multi-year subscription (2 renewals)<br>- Monthly crossing year boundary<br>- Read-only after expiry (covered years)<br>- Threshold edge cases (13 vs 14 days overlap)<br>- Etsy activation late in year | High — requires Supabase mock + date fixtures |
| `app/api/blueprint/generate/route.test.ts` | 10 test cases:<br>- Generate for default year<br>- Generate for explicitly requested year<br>- Reject year not in `blueprintFullAccessYears`<br>- Auto-select current year if accessible | Medium — requires auth mock + DB mock |
| Integration: Oracle reads correct year | 5 test cases:<br>- Oracle prompt includes 2027 Blueprint if generated<br>- Oracle prompt shows "not generated" if 2027 Blueprint missing | Low — snapshot test of prompt string |

**Total:** ~35 test cases, ~300–400 lines of test code.

---

### Manual QA (critical before prod)

| Scenario | Test Steps | Pass Criteria |
|----------|------------|---------------|
| Annual subscriber crosses year boundary | 1. Create entitlement with `planner_year = 2026`, `ends_at = 2027-06-30`<br>2. Set system clock to 2027-01-15<br>3. Load `/year` page | Calendar shows 2027 if 2027 Blueprint generated |
| Oracle includes 2027 context | 1. Generate 2027 Blueprint<br>2. Open `/oracle`<br>3. Ask "What's my theme for this quarter?" | Response references Q1 2027 theme |
| Blueprint generation year picker | 1. Log in as user with `blueprintFullAccessYears = [2026, 2027]`<br>2. Navigate to generation UI | Shows year picker; can select 2026 or 2027 |
| Read-only access after expiry | 1. Create entitlement with `ends_at = yesterday`<br>2. Verify `accessState = "read_only_annual"`<br>3. Load 2026 Blueprint | Blueprint visible, edit actions disabled |

---

### Deployment risk: LOW

- No schema migration
- Backward-compatible (existing entitlements work as-is)
- Incremental rollout: deploy code, then bump `CURRENT_PLANNER_YEAR` in a separate deploy

**Rollback plan:** Revert code deploy. Entitlement data unchanged.

---

## 8. Open Questions for Kai/Jack

1. **Minimum overlap threshold:** Should it be 14 days, 30 days, or "any overlap"? (Recommendation: 14 days)

2. **One-time annual buyers:** Should late-2026 purchases grant 2027 access during the overlap, or is the purchase locked to 2026 regardless of activation date? (Affects copy on Stripe checkout and Etsy listings)

3. **Etsy activation:** Same question — should a late-2026 Etsy activation grant 2027 access, or is the buyer purchasing "2026" as printed on the listing?

4. **Read-only access:** Should read-only extend to ALL years accessed while active, or only the "primary" purchase year? (Recommendation: all years)

5. **Monthly subscribers:** Should they retain access to prior years indefinitely as long as they keep paying, or should the window slide forward after 12 months? (Recommendation: retain prior years)

6. **Year-roll timing:** When should `CURRENT_PLANNER_YEAR` bump to 2027? Options:
   - Dec 1, 2026 (6 weeks early, gives users time to generate 2027 Blueprints for planning)
   - Jan 1, 2027 (aligned with calendar year)
   - Kai/Jack decides based on Blueprint generation workload capacity

7. **Founder pricing:** Does the locked annual price ($140 Planner, $220 Oracle) carry forward to 2027 and beyond? If yes, no action needed. If no, add a `founding_price_eligible_through` column to track eligibility end date.

---

## 9. Unknown Gaps (Could Not Determine from Code)

1. **Curriculum week numbering:** Curriculum sessions reference `week_number` (1–52). If a user's Blueprint spans 2026 and 2027, are curriculum weeks aligned to the user's "plan year" (still 2026?) or to the calendar year? The code does not make this clear.

2. **Month briefs:** `month_briefs` table has `month_number` (1–12) and is tied to a Blueprint year. If a user has access to both 2026 and 2027, do they see month briefs for both years in the calendar? The code suggests yes (via `loadBlueprintForYear`), but UI behavior is unclear.

3. **Push/rest arc display:** The year view shows a push/rest ribbon derived from `blueprints.push_rest_arc`. If the user has 2026 and 2027 Blueprints, does the ribbon splice them together, or switch cleanly on Jan 1? The code in `components/year/PushRestRibbon.tsx` does not indicate.

4. **Onboarding re-entry:** If a user's 2026 Blueprint exists but they now have 2027 access, does the onboarding flow let them generate a 2027 Blueprint, or does it skip to dashboard? The route `app/api/onboarding/complete/route.ts` checks `onboarding_completed_at` but does not check for multiple years.

---

## 10. Test Plan Summary

### Unit tests (Jest + Supabase mocks)

1. `getCoveredYears()` edge cases:
   - Single-year window (2026-01-01 to 2026-12-30)
   - Cross-year window (2026-12-01 to 2027-11-30)
   - Multi-year window (2026-01-01 to 2028-12-30)
   - Threshold boundary (2026-12-18 to 2027-01-01 = 14 days exactly)
   - Below threshold (2026-12-19 to 2027-01-01 = 13 days)

2. `resolveAccessCapabilities()` integration:
   - One active annual entitlement crossing year boundary
   - Two active annual entitlements (2026 and 2027 purchased separately)
   - One expired annual entitlement (read-only for covered years)
   - One active monthly entitlement crossing year boundary
   - Conflicting entitlements (2026 annual + 2027 monthly)

3. Blueprint generation route:
   - No `planYear` param → defaults to current year if accessible
   - `planYear = 2027` + accessible → generates 2027 Blueprint
   - `planYear = 2028` + NOT accessible → rejects with 403
   - User with only 2026 access requests 2027 → rejects with 403

### Integration tests (E2E with real Supabase + Stripe sandbox)

1. Stripe annual subscription renewal:
   - Subscribe on 2026-06-15
   - Webhook: `invoice.payment_succeeded` on 2027-06-15
   - Verify `ends_at` extended to 2028-06-15
   - Verify `blueprintFullAccessYears` includes 2027 and 2028 after renewal

2. Etsy activation late in year:
   - Import Etsy order with `planner_year = 2026`
   - Activate on 2026-11-20
   - Verify `blueprintFullAccessYears = [2026, 2027]`
   - Generate 2027 Blueprint → succeeds
   - View `/year/2027` → succeeds

3. Read-only access after expiry:
   - Create entitlement with `ends_at = yesterday`
   - Load 2026 Blueprint → succeeds (read-only)
   - Load 2027 Blueprint → fails if not generated during active window
   - Attempt to edit goals → fails with 403

---

## 11. Final Recommendation Summary

**Implement Option A:** Derive covered planner years from the entitlement's `[starts_at, ends_at]` window at capability-resolve time.

**Key changes:**
1. Add `getCoveredYears()` helper to `lib/commerce/capabilities.ts` (~20 lines)
2. Replace `entitlement.plannerYear` with `getCoveredYears(entitlement)` in `resolveAccessCapabilities` (~5 lines)
3. Add optional `planYear` param to `/api/blueprint/generate` and validate against capabilities (~15 lines)
4. Add year picker UI to Blueprint generation page if `blueprintFullAccessYears.length > 1` (~30 lines)

**Test coverage:**
- 35 unit + integration test cases
- 4 manual QA scenarios

**Deployment:**
- Zero-downtime: deploy code, then bump `CURRENT_PLANNER_YEAR` in a separate deploy
- Rollback: revert code deploy (no data migration to undo)

**Open product decisions for Kai/Jack:**
1. Minimum overlap threshold (14 days recommended)
2. One-time annual buyers: year-locked or time-window access?
3. Etsy activations: same question
4. Read-only access: all covered years or purchase year only?

**Effort:** ~2 days eng work (1 day code + 1 day tests), low risk, high impact.

---

**END OF DESIGN NOTE**

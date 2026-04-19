---
type: handoff
subject: kiaros-phase5
status: active
created: 2026-04-13
---

# Phase 5 Handoff — Tracker + Oracle

**Read `docs/architecture-v2.md` first.** This doc is the session-start guide for Phase 5, not a replacement for the architecture.

---

## State at Phase 4 completion

All routes and components that exist:

```
app/(app)/
  layout.tsx              ← sidebar layout (Sidebar + ml-56 main)
  page.tsx                ← redirects to /dashboard
  dashboard/page.tsx      ← DashboardOverview (Server Component)
  blueprint/page.tsx      ← BlueprintView (Server Component)
  calendar/page.tsx       ← CosmicCalendar (Server + Client Components)

components/
  shared/
    MoonPhaseIcon.tsx
    TransitBadge.tsx
    CyclePhaseTag.tsx
  dashboard/
    Sidebar.tsx
    DashboardOverview.tsx
  blueprint/
    BlueprintView.tsx
    QuarterSection.tsx
    MonthSection.tsx
  calendar/
    CosmicCalendar.tsx    ← 'use client', view state
    YearView.tsx
    MonthView.tsx
    WeekView.tsx
    utils.ts

lib/
  ai/
    blueprint-system-prompt.ts
    blueprint-generator.ts
  ephemeris/
    astronomia-adapter.ts
    transit-calculator.ts
    pluto-table.ts
    index.ts
  supabase/
    client.ts   ← browser anon client
    server.ts   ← RLS-aware per-request server client
    admin.ts    ← service-role (webhooks only)

types/
  blueprint.ts    ← all ephemeris + blueprint types
  database.ts     ← generated from live Supabase schema
```

TypeScript is clean (`tsc --noEmit` → exit 0) going into Phase 5.

---

## Phase 5 build order

Build Tracker first (pure data, no AI complexity), then Oracle.

### Part A — Tracker

**What it does:** Users log daily values for custom metrics grouped by their goal categories. The tracker page shows today's log form, a consistency heatmap, and per-category mini trend cards.

#### 1. Data model

**`tracker_metrics`** — defines what a user tracks. One row per metric.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | PK |
| `user_id` | uuid | FK → user_profiles |
| `category_id` | uuid \| null | FK → goal_categories |
| `key` | text | slug, e.g. `"sleep_hours"` — used as the key in `daily_logs.values` |
| `label` | text | Human label, e.g. `"Sleep (hours)"` |
| `data_type` | text | `'boolean' \| 'number' \| 'scale' \| 'text'` |
| `config` | jsonb \| null | `{ min, max, step }` for scale/number; optional |
| `sort_order` | int | within category |
| `is_active` | bool | soft-delete / hide |

**`daily_logs`** — one row per user per date (upsert on `(user_id, log_date)`).

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | PK |
| `user_id` | uuid | FK → user_profiles |
| `log_date` | date | YYYY-MM-DD |
| `values` | jsonb | `{ [metric_key: string]: boolean \| number \| string }` |
| `energy_level` | int \| null | 1–5, shown on its own row |
| `mood_tag` | text \| null | e.g. `"grounded"`, `"scattered"` |
| `notes` | text \| null | free-text daily note |
| `lunar_phase` | text \| null | denormalized from ephemeris on write |
| `lunar_sign` | text \| null | denormalized from ephemeris on write |
| `cycle_phase` | text \| null | computed from cycle_entries on write |
| `updated_at` | timestamptz | |

**When writing a daily log**, the API route should also populate `lunar_phase`, `lunar_sign` from `ephemeris_cache` for that date, and `cycle_phase` computed from the most recent `cycle_entries` row.

#### 2. API routes

**`app/api/tracker/metrics/route.ts`**

- `GET` — returns all active metrics for the current user, ordered by `sort_order`, with category name joined
- `POST` — creates a new metric (body: `{ label, data_type, category_id?, config?, key? }`)
  - Auto-generate `key` from label if not supplied: lowercase + underscores
  - Set `sort_order` = MAX(sort_order) + 1 within category

**`app/api/tracker/logs/route.ts`**

- `GET ?date=YYYY-MM-DD` — returns the `daily_logs` row for that date (or null if no log yet)
- `GET ?from=YYYY-MM-DD&to=YYYY-MM-DD` — returns all logs in range (for heatmap + charts)
- `POST` — upsert the log for a date (body: `{ log_date, values, energy_level?, mood_tag?, notes? }`)
  - Denormalize `lunar_phase` + `lunar_sign` from `ephemeris_cache.data` on write — look up the `days` array by `log_date`
  - Compute `cycle_phase` from the most recent `cycle_entries.period_start` if `cycle_enabled = true` on `user_profiles`

Both routes use `createServerSupabase()` — RLS handles user scoping automatically.

#### 3. Components

```
app/(app)/tracker/page.tsx          ← Server Component; fetches metrics + today's log
components/tracker/
  TrackerView.tsx                   ← Client Component ('use client'); owns today-form state
  DailyLogForm.tsx                  ← renders the metric inputs for a single day
  MetricInput.tsx                   ← renders one metric field (boolean toggle / number / scale / text)
  ConsistencyGrid.tsx               ← GitHub-style heatmap; receives logs[]
  CategoryCard.tsx                  ← per-category summary card with mini trend line
```

**`app/(app)/tracker/page.tsx`** — async Server Component:
- Fetches `tracker_metrics` (active, with category names)
- Fetches today's `daily_logs` row
- Fetches last 90 days of logs for the consistency grid
- Passes all three as props to `<TrackerView>`

**`TrackerView.tsx`** — Client Component:
- Receives `metrics`, `todayLog`, `recentLogs` as props (no direct Supabase)
- Owns form state: the user's in-progress values for today
- On save, POSTs to `/api/tracker/logs` — optimistic update the local state
- Shows: top energy + mood row, grouped metric inputs, consistency grid below

**`DailyLogForm.tsx`**:
- Groups metrics by `category_id` using the category name as a heading
- Renders a `<MetricInput>` for each metric
- Renders energy_level (star row 1–5) and mood_tag (pill selector) at the top

**`MetricInput.tsx`**:
- `data_type === 'boolean'` → shadcn `Switch`
- `data_type === 'number'` → `<input type="number">` with config min/max/step
- `data_type === 'scale'` → segmented button row 1–5 (or config.min–config.max)
- `data_type === 'text'` → `<textarea>` single line

**`ConsistencyGrid.tsx`**:
- 13-week rolling grid (91 days), Mon-first
- Each cell is coloured by how many metrics were logged that day: 0 = muted, partial = accent/30, full = accent
- Tooltip on hover: date + count logged
- No recharts needed — pure CSS grid with `title` attribute for tooltips

**`CategoryCard.tsx`**:
- Shows category name + icon
- Last 14 days as a simple inline sparkline (just coloured dots or bars — no recharts yet; recharts is Phase 7)
- "X / Y days logged" this month

#### 4. Tracker page URL

`/tracker` — the sidebar already links to `/tracker?category=<id>` for per-category filtering. Wire that up: if `?category=<id>` is in the URL, scroll to that category section or filter the metric form to show only that category.

---

### Part B — Oracle

**What it does:** A streaming chat UI where the user can ask questions grounded in their natal chart, current transits, and blueprint. Claude responds as a knowledgeable but warm guide — not a fortune teller.

#### 1. AI route

**`app/api/oracle/chat/route.ts`**

```typescript
import { streamText } from 'ai'
import { createGateway } from '@ai-sdk/gateway'
import { createServerSupabase } from '@/lib/supabase/server'
import { buildOracleSystemPrompt } from '@/lib/ai/oracle-system-prompt'

export const maxDuration = 60

export async function POST(req: Request) {
  const { messages } = await req.json()
  const supabase = await createServerSupabase()
  const today = new Date().toISOString().slice(0, 10)
  const currentYear = new Date().getFullYear()

  // Fetch all grounding data in parallel
  const [profileRes, ephemerisRes, blueprintRes] = await Promise.all([
    supabase.from('user_profiles').select('*').maybeSingle(),
    supabase.from('ephemeris_cache').select('data').eq('year', currentYear).maybeSingle(),
    supabase
      .from('blueprints')
      .select('year_theme, quarters, weeks')
      .eq('plan_year', currentYear)
      .eq('status', 'complete')
      .order('version', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ])

  const systemPrompt = buildOracleSystemPrompt({
    profile: profileRes.data,
    ephemeris: ephemerisRes.data?.data ?? null,
    blueprint: blueprintRes.data,
    today,
  })

  // Use AI Gateway in prod, direct key in dev (same pattern as blueprint-generator.ts)
  const provider = process.env.AI_GATEWAY_URL
    ? createGateway({ baseURL: process.env.AI_GATEWAY_URL })
    : (await import('@ai-sdk/anthropic')).createAnthropic()

  const result = streamText({
    model: provider('anthropic/claude-sonnet-4.6'),
    system: systemPrompt,
    messages,
    maxTokens: 1024,
  })

  return result.toUIMessageStreamResponse()
}
```

Look at `lib/ai/blueprint-generator.ts` for the exact gateway/fallback pattern — replicate it exactly.

#### 2. System prompt builder

**`lib/ai/oracle-system-prompt.ts`**

Assembles a 4-layer prompt. Each layer is a separate string concatenated with `\n\n---\n\n`:

**Layer 1 — Identity + voice**
```
You are the Oracle of Kiaros — a guide who speaks from the intersection of
real astronomical data and the user's lived experience. You are warm, grounded,
and direct. You never give generic astrology. You never use hustle language.
You name specific placements and specific transits when they're relevant.
Rest is strategy; reflection is data.
```

**Layer 2 — Natal chart**
Pull `profile.natal_chart as NatalChart`. Format each placement:
```
Sun: 14° Scorpio, House 8
Moon: 2° Pisces, House 12
Rising: Aries
...
```
If `birth_time_unknown`, note it: "Birth time unknown — house placements are approximate."

**Layer 3 — Current cosmic context**
Pull today's `EphemerisDay` from `ephemeris.days` (match by `today`). Format:
```
Today is {today}.
Sun: 23° Aries · Moon: 11° Cancer (Waxing Gibbous, 72% illuminated)
Active transits: Saturn □ natal Venus (applying, 0.4° orb), Jupiter △ natal Sun (separating)
Retrograde planets: none
```
Also pull the next upcoming moon phase event from `ephemeris.moonPhases` (first one after today):
```
Next: Full Moon in Libra on 2026-04-23
```

**Layer 4 — Goals + blueprint**
Pull goal categories from `profile` (or pass categories as a param). Pull the current week blueprint. Format:
```
Year theme: "{blueprint.year_theme}"
Current week (Week N): "{week.theme}"
This week's intentions:
  · ...
  · ...
Focus areas this week: Health, Creative Work

The user's goal categories: Health ("feel strong"), Creative Work ("finish the album"), Relationships
Year vision: "{profile.year_vision}"
Word of year: "{profile.word_of_year}"
```

**Function signature:**
```typescript
interface OraclePromptContext {
  profile: Tables<'user_profiles'> | null
  ephemeris: YearEphemeris | null  // cast from ephemeris_cache.data
  blueprint: { year_theme: string | null; quarters: Json | null; weeks: Json | null } | null
  today: string
}

export function buildOracleSystemPrompt(ctx: OraclePromptContext): string
```

Return early with a minimal prompt if `profile` or `ephemeris` is null — the Oracle still works, just less grounded.

#### 3. Components

```
app/(app)/oracle/page.tsx        ← Server Component; passes initial data to OracleChat
components/oracle/
  OracleChat.tsx                 ← 'use client'; uses useChat from @ai-sdk/react
  OracleMessage.tsx              ← renders one message (user vs assistant, prose formatting)
  OracleInput.tsx                ← textarea + submit button
```

**`app/(app)/oracle/page.tsx`** — async Server Component:
- No Supabase fetch needed here — the `/api/oracle/chat` route fetches everything per request
- Just renders `<OracleChat />` with a welcome message and today's date for the empty state

**`OracleChat.tsx`** — Client Component:
```typescript
'use client'
import { useChat } from '@ai-sdk/react'

export function OracleChat() {
  const { messages, input, handleInputChange, sendMessage, status } = useChat({
    api: '/api/oracle/chat',
  })
  const isLoading = status === 'streaming' || status === 'submitted'
  // submit: sendMessage({ text: input })
  // ...
}
```

`useChat` is already in the project from Phase 3 (`@ai-sdk/react`). No new packages needed.

**`OracleMessage.tsx`**:
- User messages: right-aligned, simple pill
- Assistant messages: left-aligned, use AI Elements (`<AssistantMessage>` from `@ai-sdk/react`) for streaming-aware, safe prose rendering — it handles partial tokens correctly and is the v6-recommended approach. Do not wire up a separate renderer by hand.
- Show a subtle pulsing dot while `isLoading` and the last message is from the user

**`OracleInput.tsx`**:
- `<textarea>` that auto-grows (rows 1 → 4 max)
- Enter submits, Shift+Enter inserts newline
- Disabled + spinner while `isLoading`
- Character limit hint at 500+

**Suggested prompts** for the empty state (hardcoded, shown as chips):
- "What should I focus on this week?"
- "What does this full moon mean for me?"
- "Where is my energy best spent right now?"

---

## What does NOT exist yet (don't assume)

- No `app/(app)/tracker/` directory
- No `app/(app)/oracle/` directory
- No `lib/ai/oracle-system-prompt.ts`
- No `components/tracker/` or `components/oracle/` directories
- No `/api/tracker/logs` or `/api/tracker/metrics` routes
- No `/api/oracle/chat` route

---

## Common mistakes to avoid in Phase 5

- **Don't read Supabase from Client Components.** TrackerView and OracleChat receive props from the Server Component parent or fetch via API routes only.
- **Don't re-fetch ephemeris in the Oracle route from the client.** The route already has it server-side. `useChat` only sends `messages[]` — grounding data stays on the server.
- **Don't compute cycle_phase client-side.** The API route on log write does the computation from `cycle_entries` and stores it denormalized on `daily_logs`.
- **Don't hardcode metrics.** The schema supports user-defined metrics. The tracker UI must be driven entirely by `tracker_metrics` rows — no hardcoded metric keys in the UI.
- **The `values` field in `daily_logs` is `{ [key: string]: boolean | number | string }`.** The key matches `tracker_metrics.key`. Use the metric's `key` field, not `id`.
- **`streamText` returns a stream — don't `await` the whole thing server-side.** Call `result.toUIMessageStreamResponse()` and return it directly. The `useChat` hook on the client handles assembly.
- **Oracle rate limiting is an open decision** (architecture §10, item 5). Don't implement rate limiting in Phase 5 — note it as a Phase 8 task.

---

## Definition of Done — Phase 5

**Tracker:**
1. A logged-in user can open `/tracker`, see their metric inputs grouped by category, fill them in, and save. On reload, the saved values are pre-populated.
2. The consistency grid shows the last 90 days with correct shading.
3. Saving a log correctly denormalizes `lunar_phase` and `lunar_sign`.
4. RLS holds — a second user cannot read or write the first user's logs.

**Oracle:**
1. A logged-in user can open `/oracle`, see the empty state with suggested prompts, type a message, and receive a streaming response.
2. The response references at least one piece of real data from the system prompt (a specific transit, their natal Sun sign, or their year theme).
3. Conversation history persists within the page session (handled by `useChat` state — no DB persistence needed for v1).
4. No Anthropic key or birth data is exposed in the client bundle or network responses.

---

**Last updated:** 2026-04-13

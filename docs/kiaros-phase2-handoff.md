---
status: SUPERSEDED
superseded_by: docs/architecture-v2.md, PRODUCT_BIBLE.md
superseded_on: 2026-04-12
type: handoff
subject: kiaros
phase: 2
created: 2026-04-12
status: ready
---

# Kiaros — Phase 2 Handoff

**Continue from this document at the start of the next chat.**
**Phase 1 (skeleton) is complete. Phase 2 is Onboarding Implementation.**

---

## What Was Built in Phase 1

A full Next.js 15 + TypeScript project skeleton at `g:\Projects\Kiaros`.

### Dev server
```bash
cd g:/Projects/Kiaros
npm install
npm run dev
# runs on http://localhost:3699
```

### Routes created
| Route | Status | Notes |
|-------|--------|-------|
| `/sign-in` | Shell | Clerk SignIn component wired |
| `/sign-up` | Shell | Clerk SignUp component wired |
| `/` | Shell | Redirects to `/dashboard` (TODO: check onboarding status) |
| `/onboarding` | Shell | Step 1 — Birth Info |
| `/onboarding/location` | Shell | Step 2 — Birth Location |
| `/onboarding/goals` | Shell | Step 3 — Goals & Categories |
| `/onboarding/vision` | Shell | Step 4 — Vision & Season |
| `/onboarding/reflection` | Shell | Step 5 — Recent Reflection |
| `/onboarding/generating` | Shell | Loading screen, redirects to `/blueprint` after 3s |
| `/dashboard` | Shell | Placeholder content |
| `/blueprint` | Shell | Placeholder section structure |
| `POST /api/onboarding` | Stub | Returns 501 |
| `GET /api/blueprint` | Stub | Returns 501 |
| `POST /api/blueprint` | Stub | Returns 501 |
| `POST /api/feedback` | Stub | Returns 501 |

### Key files to understand
- [lib/types.ts](../lib/types.ts) — All TypeScript types (UserProfile, OnboardingData, Blueprint, etc.)
- [lib/constants.ts](../lib/constants.ts) — Life categories, onboarding steps, routes
- [lib/supabase.ts](../lib/supabase.ts) — Full database schema documented in comments
- [lib/services/blueprint.ts](../lib/services/blueprint.ts) — Blueprint service stubs
- [lib/services/onboarding.ts](../lib/services/onboarding.ts) — Onboarding service stubs
- [lib/services/user.ts](../lib/services/user.ts) — User service stubs
- [CLAUDE.md](../CLAUDE.md) — Architecture decisions and conventions guide

---

## Phase 2 Goal

**Make onboarding functional end-to-end.**

By the end of Phase 2, a user should be able to:
1. Sign up with Clerk
2. Complete all 5 onboarding steps
3. Have their data saved to Supabase
4. Arrive at the generating screen
5. (Blueprint generation can still be mocked — that's Phase 3)

---

## Phase 2 Task List

### Task 1 — Set up Supabase

**What to do:**
1. Create a Supabase project at supabase.com
2. Run the migration SQL below to create all required tables
3. Add Supabase credentials to `.env.local` (copy from `.env.local.example`)
4. Initialize the Supabase client in `lib/supabase.ts`

**Migration SQL to run in Supabase dashboard:**
```sql
-- Users table (linked to Clerk)
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clerk_id TEXT UNIQUE NOT NULL,
  email TEXT NOT NULL,
  name TEXT,
  onboarding_completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Onboarding data table
CREATE TABLE onboarding_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  birth_name TEXT,
  birth_date DATE,
  birth_time TEXT,
  birth_city TEXT,
  birth_country TEXT,
  timezone TEXT,
  life_categories JSONB DEFAULT '[]',
  primary_goal TEXT,
  goals_by_category JSONB DEFAULT '{}',
  current_season_description TEXT,
  next_90_days_focus TEXT,
  recent_life_events TEXT,
  easy_vs_hard_reflection TEXT,
  energy_level TEXT CHECK (energy_level IN ('low', 'medium', 'high')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Blueprints table
CREATE TABLE blueprints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  version INTEGER DEFAULT 1,
  season_theme TEXT,
  season_summary TEXT,
  what_matters_now TEXT,
  energy_framing TEXT,
  what_to_lean_into TEXT,
  what_not_to_force TEXT,
  next_90_days_outlook TEXT,
  category_guidance JSONB DEFAULT '{}',
  supported_areas JSONB DEFAULT '[]',
  caution_areas JSONB DEFAULT '[]',
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  generated_with TEXT,
  is_published BOOLEAN DEFAULT FALSE
);

-- Feedback table
CREATE TABLE feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  type TEXT CHECK (type IN ('blueprint', 'dashboard', 'onboarding', 'general')),
  message TEXT NOT NULL,
  rating INTEGER CHECK (rating BETWEEN 1 AND 5),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE onboarding_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE blueprints ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;

-- RLS policies (users can only access their own data)
CREATE POLICY "Users can read own profile" ON users
  FOR SELECT USING (clerk_id = current_setting('app.clerk_user_id'));

CREATE POLICY "Users can read own onboarding" ON onboarding_data
  FOR ALL USING (
    user_id = (SELECT id FROM users WHERE clerk_id = current_setting('app.clerk_user_id'))
  );

CREATE POLICY "Users can read own blueprints" ON blueprints
  FOR ALL USING (
    user_id = (SELECT id FROM users WHERE clerk_id = current_setting('app.clerk_user_id'))
  );

CREATE POLICY "Users can submit feedback" ON feedback
  FOR INSERT WITH CHECK (
    user_id = (SELECT id FROM users WHERE clerk_id = current_setting('app.clerk_user_id'))
  );
```

**Supabase client initialization (replace placeholder in `lib/supabase.ts`):**
```typescript
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
```

**Add to package.json dependencies:**
```bash
npm install @supabase/supabase-js
```

---

### Task 2 — Implement user profile creation

**File**: `lib/services/user.ts`

When a user signs in for the first time, create their Supabase profile.

The pattern is **lazy creation** — on first access to the app, check if a user row exists. If not, create it.

**Where to hook this in:** `app/(app)/page.tsx` (the entry redirect page) or `app/(app)/layout.tsx`.

---

### Task 3 — Implement onboarding form validation and data persistence

**Files to update:**
- `app/(app)/onboarding/page.tsx` — Step 1 form
- `app/(app)/onboarding/location/page.tsx` — Step 2 form
- `app/(app)/onboarding/goals/page.tsx` — Step 3 form
- `app/(app)/onboarding/vision/page.tsx` — Step 4 form
- `app/(app)/onboarding/reflection/page.tsx` — Step 5 form
- `app/api/onboarding/route.ts` — API endpoint
- `lib/services/onboarding.ts` — Service logic

**Approach:**
1. Add Zod schema to each step
2. Use react-hook-form with zodResolver
3. On submit, call `POST /api/onboarding` with step data
4. API saves to Supabase `onboarding_data` table (upsert)
5. Redirect to next step

**Example Zod schema for step 1:**
```typescript
import { z } from "zod";

const step1Schema = z.object({
  birthName: z.string().min(1, "Name is required"),
  dateOfBirth: z.string().min(1, "Date of birth is required"),
  timeOfBirth: z.string().optional(),
});
```

---

### Task 4 — Add onboarding progress indicator

**File**: `app/(app)/onboarding/layout.tsx`

Replace the hardcoded `w-1/5` progress bar with dynamic step tracking.

The current step can be derived from `usePathname()` compared against `ONBOARDING_STEPS` in `lib/constants.ts`.

---

### Task 5 — Wire entry point to check onboarding status

**File**: `app/(app)/page.tsx`

Replace the temporary redirect to dashboard with a real check:
```typescript
// 1. Get clerk userId
// 2. Check if user profile exists in Supabase (lazy create if not)
// 3. If onboarding_completed === false → redirect to /onboarding
// 4. If onboarding_completed === true → redirect to /dashboard
```

---

### Task 6 — Connect generating screen to API

**File**: `app/(app)/onboarding/generating/page.tsx`

Replace the fake 3-second timeout with:
1. Call `POST /api/blueprint` to trigger generation (can be mocked for now)
2. Poll for completion or wait for response
3. Mark `onboarding_completed = true` in Supabase
4. Redirect to `/blueprint`

For Phase 2, it's fine to mock the blueprint (a static placeholder object). The real generation comes in Phase 3.

---

## Critical Decisions Resolved (From Phase 1)

| Decision | Choice | Reason |
|----------|--------|--------|
| Blueprint format | Fixed 6-section | Simpler for MVP, easier to render |
| Generation approach | Template + AI fills | Faster, more consistent, cheaper |
| Generation timing | Synchronous for MVP | Simplest path, async can be added later |
| User profile creation | Lazy (first app visit) | Saves webhook complexity for MVP |
| Auth | Clerk | Already integrated in skeleton |
| Database | Supabase | Already documented in codebase |

---

## What to Keep Out of Phase 2

Do NOT add:
- Blueprint generation AI logic (Phase 3)
- Dashboard data population (Phase 4)
- Feedback form (Phase 5)
- Tracker, journaling, quarterly reviews, Year Unwrapped
- Advanced settings or customization

If it's not onboarding + data capture, it belongs in a later phase.

---

## Product Constraints (Carry Forward)

Kiaros MVP must preserve this core flow:
```
Onboarding → Blueprint Generation → Dashboard with Current Guidance
```

- **No feature scope creep** — if it doesn't support the first user transformation, it waits
- **Rolling entry matters** — users can join any time of year, not just January
- **Feel personal** — output must feel specific, not generic
- **Simple implementations** — prefer readable code over cleverness
- **Test manually** — browser test before declaring something done

---

## Environment Variables Needed

Create `g:\Projects\Kiaros\.env.local` (copy `.env.local.example` and fill in):

```bash
# Clerk (from clerk.com dashboard)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...

# Supabase (from supabase.com project settings)
NEXT_PUBLIC_SUPABASE_URL=https://...supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...

# Not needed until Phase 3
# OPENAI_API_KEY=sk-...

NEXT_PUBLIC_APP_URL=http://localhost:3699
```

---

## Clerk Configuration Required

In the Clerk dashboard, set:
- **Sign-in redirect URL**: `http://localhost:3699/`
- **Sign-up redirect URL**: `http://localhost:3699/`
- **Allowed redirect URLs**: `http://localhost:3699/*`

---

## Phase 2 Success Criteria

Phase 2 is done when a user can:
- [ ] Sign up and land in the app
- [ ] Navigate through all 5 onboarding steps without errors
- [ ] See a progress indicator showing which step they're on
- [ ] Have their data saved to Supabase (verify in Supabase dashboard)
- [ ] Reach the generating screen after step 5
- [ ] Be redirected to the blueprint page (even if mocked)
- [ ] On second sign-in, skip onboarding and go straight to dashboard

---

## Phase 3 Preview (Don't Build Yet)

After Phase 2 is working and tested, Phase 3 will:
1. Define the exact blueprint data shape (all 6 sections)
2. Implement blueprint generation (template + GPT-4)
3. Store generated blueprint in Supabase
4. Render blueprint sections on `/blueprint`

The decision to make early: start with a mocked blueprint to test rendering, then add real generation.

---

## Project Location

**Root**: `g:\Projects\Kiaros`
**Docs**: `g:\Projects\Kiaros\docs\`
**Dev server**: `http://localhost:3699`

---

## Reading Order for Next Session

1. This document (you're reading it)
2. [CLAUDE.md](../CLAUDE.md) — Conventions & architecture guide
3. [lib/types.ts](../lib/types.ts) — Data shapes
4. [lib/supabase.ts](../lib/supabase.ts) — Database schema in comments
5. Current skeleton files for whichever task you're starting

---

**Handoff written**: April 12, 2026
**Phase 1 complete**: Yes
**Phase 2 status**: Ready to begin

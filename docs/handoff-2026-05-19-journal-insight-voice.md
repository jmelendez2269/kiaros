# Journal Insight Voice — Handoff (2026-05-19)

Third session of 2026-05-19. Follow-on to the QR polish stack documented
in `docs/handoff-2026-05-19-quarterly-reviews-polish.md`. This one is
unrelated to the QR work — it's the **Journal Intelligence UI** task
that CLAUDE.md still flags as HIGH priority. Turns out the page already
existed; the gap was the synthesis (or lack of it) and the voice control.

**Read this first**, then drop back into the prior handoffs only for
the branch / PR state.

---

## 1. TL;DR

Everything here is **uncommitted** on `feature/warm-almanac-year`. Six
new files, two modified, `npx tsc --noEmit` clean (`EXIT=0`).

- **Root cause uncovered.** `user_pattern_insights.summary` is a
  deterministic SQL `format()` template (0012, lines 273–280): every
  card on `/journal/insights` reads "X has appeared across Y journal
  entries from … to …". Same shape, only counts vary. No synthesis,
  no observation. That's why the user couldn't tell if the page was
  "any good" — there was nothing to be good or bad about.
- **AI synthesis layer added** without disturbing the SQL template
  (kept as fallback). Each pattern row gains `ai_summary`,
  `ai_summary_voice_label`, `ai_synthesizing_at`. The page renders
  `ai_summary` when present, the SQL template when not, and a
  "synthesising…" line while a regen is in flight.
- **Voice control surface.** New `user_settings` table per user. The
  voice panel on `/journal/insights` offers three presets (Grounded
  observer, Mystic-but-practical, Clinical / data) plus a custom
  textarea. Live preview button runs synthesis on the user's biggest
  pattern *before* saving. Save & apply queues a bulk regen of every
  pattern row.
- **Bulk regen via Next 15 `after()`.** The POST returns 202 with
  `{ queued: N }` immediately; the actual work runs after the
  response, concurrency 5, ~3s per Haiku call. For a heavy user with
  ~50 patterns this finishes in ~30s. `maxDuration = 300`.
- **Page polls /status every 3s while in-flight** and `router.refresh()`es
  to pick up freshly-synthesised cards as they land. Stops automatically
  when the server reports zero in-flight rows.
- **"What does the week consist of"** — each evidence entry under a
  pattern card now shows a 160-char body excerpt under the title, so
  the user can audit what Claude was reading.
- **Repalette work was dropped.** Initial diagnosis was wrong: the
  `:root` Tailwind tokens (`leather-*`, `bone-*`, `stone-*`) already
  resolve to the Obsidian palette via CSS vars in
  `app/globals.css:8-42`. The page was never off-brand. Same hex
  values as the `K.*` constants in `components/almanac/tokens.ts`.

---

## 2. State of branches and PRs

- `main` — unchanged.
- `feature/warm-almanac` — **PR #1** open against `main`. Untouched
  this session. Mergeable, all checks SUCCESS, parked.
- `feature/warm-almanac-year` — **PR #2** open against
  `feature/warm-almanac`. This session's work is **uncommitted on top
  of the QR polish handoff commit (6acef20)**. Nothing pushed yet.
  PR #2 itself is mergeable / clean as of session start; CodeRabbit
  skipped (auto-reviews disabled on non-default base + free-tier author).

Stacked-PR rationale unchanged from prior handoff §2.

---

## 3. Decisions locked this session

1. **AI synthesis lives on a new column, not replacing the SQL one.**
   `user_pattern_insights.summary` stays as the deterministic
   fallback. `ai_summary` is the layer on top. Means a user without
   a voice set still sees something; means the synthesis can fail per
   row without breaking the card.
2. **Voice on `user_settings`, not `user_profiles`.** New tiny table
   keyed by `user_id`, RLS on own row. Future-proof for other
   personalisation knobs (theme, display density, etc.) without
   widening `user_profiles`.
3. **Three presets + custom textarea.** Presets:
   `grounded` (default — Kiaros house voice), `mystic` (slightly
   more poetic), `clinical` (no astrology framing). Custom is a
   free-form 800-char prompt; `voice_label` is forced to "Custom".
4. **Preview before save is two API calls.** `POST /preview` runs
   synthesis without persisting, against the user's biggest pattern.
   No DB write, no usage cap concerns at preview time (still hits
   `recordUsage` since the Claude call happened).
5. **Bulk regen is fire-and-forget via Next 15 `after()`.** The
   route handler returns 202 with the queued count *before* the
   work starts. The page polls `/status` every 3s and triggers
   `router.refresh()` to pick up new cards. Tried alternatives —
   streaming with progress bar was more code for the same visible
   outcome; lazy regen on next visit was bad UX (user saves voice,
   gets empty cards). `after()` is stable in Next 15.1+ and we're
   on 15.5.15.
6. **Concurrency 5 in batches.** For a heavy user (~100 patterns)
   that's ~60s instead of ~300s sequential. Fluid Compute reuses the
   instance so the parallelism is free.
7. **Haiku 4.5, not Sonnet.** This is summarisation of short text,
   not high-stakes reasoning. Haiku is fast (~2–3s per call), cheap,
   and quality is fine for the task. Slug is `claude-haiku-4-5`
   (hyphenated, per CLAUDE.md house rule). The `posttooluse-validate`
   hook flags this asking for dots — ignore, same as `claude-sonnet-4-6`.
8. **Repalette dropped after verifying tokens.** `app/globals.css:8-42`
   defines `:root` as the Obsidian palette: `--leather-500: 256 60% 56%`
   is electric violet, same as `K.brickHi` (`#704bd2`). The "leather-"
   naming is a holdover from the Warm Almanac era; the values are
   Obsidian. Save half a day.
9. **5-min stuck-row guard in /status.** If a row has been marked
   `ai_synthesizing_at` for over 5 minutes without resolving, treat
   it as failed so the polling loop can stop. Only fires when the
   function itself dies mid-regen (the worker writes back synchronously
   on both success and failure paths).
10. **Don't bundle JournalComposer link promotion or sidebar entry
    here.** Both are small follow-ups but not scope for the
    "make insights actually good" slice.

---

## 4. New / modified file inventory

```
NEW:
  supabase/migrations/
    0019_journal_insight_voice.sql      user_settings table (RLS on
                                        own row, trg_updated_at
                                        trigger). Three new columns
                                        on user_pattern_insights:
                                        ai_summary, ai_summary_voice_label,
                                        ai_synthesizing_at.

  lib/ai/
    journal-insight-synthesis.ts        synthesizeInsight() — one
                                        Haiku call per pattern.
                                        synthesizePreview() — biggest
                                        pattern, no writes.
                                        regenerateAllForUser() —
                                        bulk, concurrency 5,
                                        marks in-flight up-front,
                                        clears flag on success or
                                        failure. Exports VOICE_PRESETS
                                        + DEFAULT_VOICE_KEY +
                                        resolveVoicePrompt + patternLabel.

  app/api/journal/insights/
    preview/route.ts                    POST — body { voiceKey | voicePrompt }.
                                        Returns { text, patternLabel,
                                        sampleSize } or 404 if no
                                        patterns. maxDuration=60.
    settings/route.ts                   GET — returns saved voice +
                                        label + updatedAt.
                                        PUT — body { voiceKey } or
                                        { voicePrompt, voiceLabel }.
                                        Upserts into user_settings.
                                        Caps voicePrompt at 800 chars.
    regenerate/route.ts                 POST — no body, reads settings.
                                        Returns 202 + { queued, voiceLabel }.
                                        Kicks regenerateAllForUser via
                                        after(). maxDuration=300.
    status/route.ts                     GET — { total, complete, inFlight }.
                                        Stuck-row guard at 5 minutes.

  components/journal/
    VoicePanel.tsx                      Client. Preset picker (3 + Custom),
                                        textarea for custom (800-char cap),
                                        Preview button, Save & apply
                                        button. On save: PUT /settings,
                                        POST /regenerate, router.refresh().
                                        Preview lands inline as a
                                        copper-bordered card.
    InsightsPollingShell.tsx            Client wrapper. Polls /status
                                        every 3s while inFlight > 0,
                                        triggers router.refresh() each
                                        tick. Renders a "Synthesising
                                        your patterns in the new voice…
                                        X of Y ready." banner. Hard
                                        ceiling at 8 minutes.

MODIFIED:
  app/(app)/journal/insights/page.tsx   + Loads user_settings + the
                                          three new ai_* columns on
                                          user_pattern_insights via
                                          a boundary `as any` cast
                                          (supabase gen types isn't
                                          regenned yet — see §5.HIGH).
                                        + Renders ai_summary when
                                          present, in-flight indicator
                                          when ai_synthesizing_at is
                                          set, SQL template summary
                                          otherwise.
                                        + Voice label badge under
                                          each AI-summarised card.
                                        + Body excerpt (160 chars)
                                          under each evidence entry —
                                          batch-loads bodies in one
                                          .in() query.
                                        + Wraps the whole page in
                                          InsightsPollingShell.
                                        + Embeds VoicePanel at top.
  lib/ai/usage.ts                       + 'journal_insight' added to
                                          the AIFeature union so
                                          recordUsage() from the
                                          synthesis lib type-checks.

UNCOMMITTED but worth knowing:
  Kairos-handoff/                       Untracked directory containing
                                        a design-canvas mockup drop
                                        (HTML + JSX preview files).
                                        Not ours; left alone. Consider
                                        adding to .gitignore if it's
                                        a recurring drop point.
```

---

## 5. Open / pending — priority order

### HIGH

1. **Apply migration 0019** — `supabase db push` (or however you've
   been pushing migrations this branch). Until this runs, the page
   crashes on the `user_settings` query and the regen endpoint can't
   write `ai_summary`.
2. **Regenerate types** — `supabase gen types`. The page currently
   uses a `// eslint-disable-next-line @typescript-eslint/no-explicit-any`
   + `const sb = supabase as any` boundary cast at
   [app/(app)/journal/insights/page.tsx:188-189](app/(app)/journal/insights/page.tsx#L188-L189)
   because the generated types don't know about the new columns or
   the new table yet. After the regen the `as any` cast still works;
   the `PatternRow` overlay (lines 13-29) becomes a no-op. Worth
   removing the cast at that point for cleanliness, but not required.
3. **Browser walkthrough on `/journal/insights`.** Untested in
   browser this session:
   - Page renders without error after migration + types regen
   - Voice panel shows three preset cards + Custom card
   - Selecting a preset changes the highlight; selecting Custom
     reveals the textarea
   - Preview button on a user with patterns lands a 2–3 sentence
     synthesis in ~3s, rendered in the copper-bordered preview card
   - Preview button on a user with zero patterns shows the helper
     text ("write a few journal entries…")
   - Save & apply triggers the polling banner; cards fill in
     visibly as Haiku finishes them
   - In-flight cards show the "Synthesising in your voice…" line
   - Body excerpts render under each evidence entry
   - Multi-tab: save voice in tab 1, switch to tab 2 — tab 2
     picks up the in-flight state on next render

### MEDIUM

4. **Commit and push this slice.** Suggested commit shape:
   - `Migration 0019: user_settings + ai_summary on user_pattern_insights`
   - `Journal insights: AI synthesis layer + voice control`
   - `Journal insights: bulk regen via Next 15 after() + page polling`
   These could collapse into one commit; the work is one feature.
   Whether to push as PR #3 stacked on top of PR #2, or wait until
   PR #2 merges and target main directly, is your call. PR #2's
   QR work is unrelated; mixing them in one branch only matters for
   reviewer cognitive load.
5. **Update CLAUDE.md.** It still says "Journal Intelligence UI"
   is the next priority "user_pattern_insights is populated but
   never shown to users (HIGH — current task)". After this slice
   ships that line needs to either move to "shipped" or be replaced
   with the next priority (probably Areas detail pages or the
   CosmicCalendar chrome decision).
6. **Promote the inline insights link in JournalComposer.** Today
   it's a tertiary text link at
   [components/journal/JournalComposer.tsx:370-375](components/journal/JournalComposer.tsx#L370-L375).
   Easy to miss. Worth a bigger CTA tied to the value prop now that
   the destination is actually good.
7. **Sidebar entry for `/journal/insights`.** AlmanacSidebar only
   has one "Journal" entry → `/journal`. Either add insights as a
   sub-entry or as a second top-level entry.

### LOW

8. **Usage gate on bulk regen.** Today every save fires up to ~100
   Haiku calls. Cheap (fractions of a cent each), but worth a
   `getMonthlyUsage('journal_insight')` check + a cap once we have a
   few real regens of telemetry. Today: unlimited.
9. **`user_settings` is general-purpose** — future personalisation
   knobs (theme override, display density, default oracle preseed
   style) can go here without another migration. Don't pile JSON
   onto `user_profiles` for these.
10. **Tab-ify `/journal`.** Bigger restructure (Compose | History |
    Patterns) like `/year` uses. Out of scope for this slice but
    worth considering for a future polish session.

---

## 6. Quick smoke-tests

### Preview endpoint (in browser console, signed-in, on any page)

```js
const r = await fetch('/api/journal/insights/preview', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ voiceKey: 'grounded' }),
})
console.log(await r.json())
// Expected: { text: "...", patternLabel: "Moon in ...", sampleSize: N }
// 404 if no patterns yet.
```

### Bulk regen + status polling

```js
// Kick the regen
const r1 = await fetch('/api/journal/insights/regenerate', { method: 'POST' })
console.log(r1.status, await r1.json())
// Expected: 202 { queued: N, voiceLabel: "..." }

// Watch progress
for (let i = 0; i < 30; i++) {
  await new Promise(r => setTimeout(r, 3000))
  const s = await fetch('/api/journal/insights/status').then(r => r.json())
  console.log(s)
  if (s.inFlight === 0) break
}
// Expected: inFlight drops to 0; complete climbs to total.
```

---

## 7. House rules (from CLAUDE.md, unchanged)

- **Hyphenated model slug `claude-haiku-4-5` is canonical.** The
  Vercel plugin's `posttooluse-validate` hook flags it asking for
  dots — ignore (documented in both prior handoffs).
- **Production deploys on push to main.** This branch is the stacked
  PR #2 branch; pushing here is safe (Vercel preview only). Don't
  push to main without a deliberate decision.
- **No service-role Supabase client outside webhooks / system jobs.**
  All four new routes follow the existing pattern: Clerk `auth()` +
  `getUserProfileId()` first, then `createAdminSupabase()` inside
  the lib for the actual work. Same as the QR streaming endpoint and
  the month-brief generator.
- **No invented copy.** Voice presets are written; not invented
  Sabian-style content. The Claude prompt system message hard-bars
  fortune-cookie astrology, prescriptive language, and unsourced
  claims.
- **No new migrations without user approval.** User approved 0019
  this session.

---

## 8. Quick links

- Open PRs:
  - PR #1: https://github.com/jmelendez2269/kiaros/pull/1
    (`feature/warm-almanac` → `main`, unmerged)
  - PR #2: https://github.com/jmelendez2269/kiaros/pull/2
    (`feature/warm-almanac-year` → `feature/warm-almanac`, this stack)
- This session's work: uncommitted on `feature/warm-almanac-year`
- Prior session handoffs:
  - `docs/handoff-2026-05-19-quarterly-reviews-polish.md` (QR polish + PR #2)
  - `docs/handoff-2026-05-19-quarterly-reviews.md` (the QR UI ship)
  - `docs/handoff-2026-05-19-sabian-360.md` (Sabian + month edit)
  - `docs/handoff-2026-05-16-phase2-month-data.md` (Phase 2 / month)
- Files added this session:
  - [supabase/migrations/0019_journal_insight_voice.sql](supabase/migrations/0019_journal_insight_voice.sql)
  - [lib/ai/journal-insight-synthesis.ts](lib/ai/journal-insight-synthesis.ts)
  - [app/api/journal/insights/preview/route.ts](app/api/journal/insights/preview/route.ts)
  - [app/api/journal/insights/settings/route.ts](app/api/journal/insights/settings/route.ts)
  - [app/api/journal/insights/regenerate/route.ts](app/api/journal/insights/regenerate/route.ts)
  - [app/api/journal/insights/status/route.ts](app/api/journal/insights/status/route.ts)
  - [components/journal/VoicePanel.tsx](components/journal/VoicePanel.tsx)
  - [components/journal/InsightsPollingShell.tsx](components/journal/InsightsPollingShell.tsx)
- Files modified this session:
  - [app/(app)/journal/insights/page.tsx](app/(app)/journal/insights/page.tsx)
  - [lib/ai/usage.ts](lib/ai/usage.ts)

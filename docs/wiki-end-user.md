# Kiaros — End User Wiki

> Internal source document for user-facing help content, Etsy listing material, and homepage copy.
> Written from a full read-through of the live code as of 2026-07-01. Anywhere the code disagrees with
> `PRODUCT_BIBLE.md` or public marketing copy, this doc follows the code and flags the conflict.
>
> Public product name is **Kairos** (per `PRODUCT_BIBLE.md` §2); the repo/internal name is **Kiaros**.
> The public site currently mixes both — see "Naming" in the Known Gaps section at the end.

---

## 1. What Kiaros Is

A personalized yearly planning system built on your real natal chart, your own goals, and the actual
astronomical weather of your year. Everything in the product — the plan, the calendar, the journal, the
daily check-ins, the chat companion — reads from the *same* underlying chart and the *same* plan year, so
nothing feels generic or repeated across features.

---

## 2. Getting Started: Onboarding

A 6-step flow, then an async "building your blueprint" screen.

1. **Birth Data** — name, birth date, birth time (optional — you can say "I don't know my birth time" and
   still get a chart, just without house-level precision), and birth city. The city is geocoded automatically
   to get exact coordinates and timezone. This is the single most important input: without it, nothing else
   can be personalized.
2. **Interpretive Tradition** — choose the astrological "lens" your readings are written through: Evolutionary,
   Karmic, Psychological, Traditional/Hellenistic, or Synthesis. Each tradition has a default *house system*
   (see box below), or you can pick a house system directly if you already have a preference.
3. **Study Focus** *(optional)* — what you're reading, studying, or learning this year. Feeds the Curriculum
   nudge later and colors the blueprint's language.
4. **Year Focus** — your vision for the year, an optional single word for the year, and what you want to
   release. You'll also see an auto-suggested "word of the year" based on your chart.
5. **Cycle Tracking** *(optional)* — if you track a menstrual/reproductive cycle, you can enable it here
   (average cycle length, period length, last period start date).
6. **Aesthetic Theme** — pick your visual theme (e.g. "Obsidian," a dark palette). Applies instantly.

Then: a polling screen builds your **Blueprint** (usually a few minutes, up to 10). Once ready, if you
named a study focus in step 3, you'll be offered an AI-generated Curriculum plan before landing on your
dashboard, plus a short first-time product tour.

> **What is a "house system" and why does it matter?**
> Houses divide your chart into 12 areas of life (career, relationships, home, etc.). Different systems
> divide the sky differently, which changes which house a given planet lands in — and therefore what your
> blueprint says about where energy shows up in your life. Kiaros supports three: **Whole Sign** (oldest,
> simplest — one zodiac sign per house), **Porphyry** (splits the arcs between your chart's four angles
> evenly), and **Placidus** (a time-based division, the most common modern default). You don't need to know
> the difference to use Kiaros — pick a tradition and it's handled for you.

**Getting access without signing up first:** you can also arrive via an **Etsy purchase** or a **direct
website purchase** — see §11 Commerce below. Either path ends at the same onboarding flow.

---

## 3. Blueprint — Your Year, Structured

The Blueprint is the core deliverable: an AI-generated yearly plan broken into **4 quarters, 12 months, and
52 weeks**, plus flagged "push" periods (favorable stretches for action) and "rest" periods — built from:

- your natal chart (planets, houses, aspects)
- the real astronomical weather for your specific year (retrogrades, major transits, moon phases)
- your stated goals, journal patterns, and things you've told the Oracle chat

You can view the full 52-week blueprint on the **Blueprint page**, and slices of it show up inside the
Cosmic Calendar's month/week/quarter views, the Today dashboard, and Area pages.

**Regenerating:** if your circumstances change, you can regenerate your blueprint. This does not overwrite
your old one — it creates a new, incrementing version, so your history is preserved and the latest version
is what's shown everywhere.

**Year rollover:** when a new calendar year begins, Kiaros automatically detects you're due for a new
blueprint and takes you to a short "Renewing" screen (visually similar to the onboarding generation screen)
that builds next year's blueprint while carrying your history forward.

---

## 4. Stelloquy — the Oracle

Your reflective chat companion, reachable from the Oracle page or "Ask Oracle about this" links elsewhere
in the app. Five tabs — Evolutionary, Karmic, Psychological, Traditional, Synthesis — each a separately
remembered conversation lens on the same chart, matching the traditions from onboarding.

Replies stream in word-by-word as they're generated (not a canned typing effect). Stelloquy always grounds
emotionally-loaded answers in something real: a current transit or moon phase, a specific natal placement,
and — when you have a Human Design chart — a Human Design framing. It's built to avoid generic "your sign
says…" language.

**Captures.** You can highlight any part of a reply (or your own message), save a full question+answer, or
save a whole thread. Each save lets you choose where it goes: just saved, into Insights, into future
Planning context, or both.

---

## 5. Insights — Your Capture Map

A living map (`/insights/map`) of recurring topics across everything you've saved from Oracle
conversations — a force-directed graph of colored dots (themes, natal aspects, transit aspects, Human
Design elements, moods), sized by how often each has come up, connected when they appeared together in the
same saved capture. You can toggle categories on/off and click a dot to see how often it's shown up. It's a
map of *topics*, not a timeline of individual messages.

---

## 6. Cosmic Calendar

One page, four tabs, all sharing the same header/switcher:

- **Year** — the full-year shell plus your Blueprint's quarter/week overview.
- **Month** — a month grid with moon-phase markers on each day, the month's theme, a quarter-context strip,
  your intentions, key transits for the month, a symbolic "Sabian symbol" card, any Curriculum sessions
  scheduled that month, and the **Month Brief** panel (see below).
- **Week** — a focused single-week view with per-day sky detail and scheduled Curriculum sessions.
- **Review** — your Quarterly Review screen (see §8).

**Month Briefs** are a short AI-written narrative for each calendar month, generated once and then cached —
you can edit the text directly, regenerate it (unless you've pinned it), or pin it so it won't be
regenerated by mistake.

---

## 7. Today Dashboard

Your landing page after sign-in (`/today`). Top to bottom: today's date with your Sun/Moon position and
this week's theme; a daily-intention box; a 7-day strip; a "shape of today" moon-phase card; **Active
Transits**, split into fast-moving "current" transits (Moon through Jupiter, change week to week) and slow
"lifetime" transits (Saturn through Pluto, multi-year waves); a **Sky Now** panel showing live aspects to
your chart; a quick one-line journal entry with a streak counter; today's **Curriculum** session if you have
one scheduled; a roughly year-long "Jupiter Season" read; a compact year-at-a-glance grid; and a multi-year
"Life Arc" read (the slow outer-planet eras of your life).

---

## 8. Quarterly Reviews

At the end of each quarter, you fill in free-text **Wins**, **Challenges**, **Pivots**, and **Next Quarter
Intentions**. On submit, Kiaros first saves what you wrote, then streams back a short (2-3 paragraph) AI
reflection that quotes your actual words, ties them to one real placement or transit from the quarter, and
— if you have a prior quarter on record — gently acknowledges continuity without inventing a throughline
that isn't there. Alongside it, an activity panel shows counts (daily logs, journal entries, Oracle saves,
Curriculum sessions completed) each with an up/down arrow versus the prior quarter.

---

## 9. Daily Tracker

A per-day check-in (`/tracker`) against metrics *you* define per goal category — yes/no toggles, numbers, a
1–5 scale, or free text (e.g. "meditated," "workout minutes," "focus level") — plus an energy level, a mood
tag, and notes. The headline visual is a **90-day consistency grid**: a GitHub-style heatmap, one cell per
day, colored by how much of that day's metrics you logged (empty → partial → full). Each category also gets
its own 14-day streak bar and a running monthly count. Every log is silently stamped with that day's moon
phase and sign (and cycle phase, if you enabled cycle tracking) for later cross-referencing — this isn't
shown prominently on the tracker page itself, but it feeds pattern-matching elsewhere.

---

## 10. Journal

A free-text entry composer — title, date, reflection, an optional "ritual" flag, and a checkbox to feed the
entry into Oracle's memory. Every entry is **transit-stamped**: the exact sky for that day (sun/moon
position, moon phase, active transits, any retrogrades) is attached automatically — visible as a small
"[Phase] Moon in [Sign]" tag on each entry.

**Pattern Insights** (`/journal/insights`) groups your past entries by recurring lunar phase, lunar sign,
transit, or retrograde, and shows a confidence level, a date range, and a short written observation (e.g.
"you tend to write during Waning Moons") with links back to the entries behind it.

**Voice.** You can choose the tone for how those observations are written — Grounded, Mystic-but-practical,
Clinical, or your own custom instruction — preview it on your strongest pattern, then apply it to all of
them at once (this runs in the background with a progress banner).

---

## 11. Areas + Goals

An **Area** is one of Kiaros's fixed life domains (Relationships, Financial, Work & Career, etc.). Each
area's page shows the natal houses that rule it, the planets sitting in those houses for you specifically,
a year-long narrative synthesized from your blueprint, and a list of **timing windows** — specific weeks
from your 52-week blueprint where the astrological weather especially favors that area. In plain terms: a
timing window is a nudge that says "this week is a good moment to act on this," not a deadline.

You can add **Goals** under an area — a title, a "why this matters" note, a target date, and optionally a
link to a timing window so the goal resurfaces when that week arrives. Goals move through active → paused →
completed → archived, which you control yourself.

---

## 12. Curriculum

Describe, in your own words, what you want to learn or work through this year. Claude builds a multi-week
study plan — weeks with themes and goals, each containing individual "sessions." Opening a session for the
first time generates its content on demand (instructional text, exercises, a reflection prompt), which is
then cached for next time. Marking a session done updates your progress and, if the plan is scheduled into
your planner, shows up as complete on Today and in the Calendar.

---

## 13. Human Design

Your personal energy-type profile (`/human-design`), presented explicitly as **one input among many, not a
verdict** — the page says so directly. You get:

- **Type** — Manifestor, Generator, Manifesting Generator, Projector, or Reflector: how you're wired to
  initiate or respond to life.
- **Strategy** — a one-line behavioral guideline paired to your Type (e.g. Generator → "Wait to respond").
- **Authority** — your decision-making center.
- **Profile** — two numbers (like "5/1") with a friendly paired name (e.g. "Heretic / Investigator").

Below that: a Signature/Not-self panel (what it feels like when your design is honored vs. forced), a
Centers panel (9 energy centers, split into Defined vs. Undefined), a Channels panel, and a **Gene Keys
"Prime Gifts"** panel with four spheres — Life's Work, Evolution, Radiance, Purpose — each shown as a
Shadow → Gift → Siddhi spectrum.

If your birth *time* is unknown, this feature is hidden entirely with an explanation, rather than guessing.
If a placement sits close to a boundary line, the page tells you plainly and links out to a well-known
third-party chart tool to cross-check — it never claims false precision.

**Currently partial:** only 4 of the 11 Gene Keys "spheres" are built (Life's Work, Evolution, Radiance,
Purpose). The rest (Attraction, IQ, EQ, SQ, Core, Culture, Vocation) aren't implemented yet.

---

## 14. Blueprint Page

The full 52-week read view of your current blueprint — the complete year, laid out for browsing rather than
the day-by-day Today view or the tabbed Calendar.

---

## 15. Settings

- **Appearance** — visual theme, applies instantly.
- **Year Direction** — plan year, year vision, release theme, study focus.
- **Interpretive Lens** — tradition and house system (same choices as onboarding, changeable any time).
- **Identity** — display name.
- **Birth Data** — date, time, city, timezone. Changing your birth *location* requires re-running onboarding
  (the chart math depends on it).
- **Stelloquy Usage** — how many Oracle messages you've used this month, your limit, and how much of your
  usage benefited from prompt caching (a cost-saving mechanic explained on the page).
- **Actions** — manage your billing (opens a Stripe customer portal), links back into Blueprint/Journal/
  Curriculum setup, restart the product tour, save changes.

---

## 16. Commerce & Access

Kiaros is available two ways, and both lead to the same product:

**Direct purchase (website / Stripe).** Choose Planner or Planner + Oracle, monthly or annual. Monthly is a
recurring subscription; annual is a one-time purchase good for a full plan year. Checkout redirects to
Stripe, then back to a success page that unlocks access.

**Etsy purchase.** After buying on Etsy, you verify your purchase at `/activate` using your Etsy order
number and the email you used to buy. If you're not signed in yet, you'll be prompted to create an account
or sign in, then finish activation — this unlocks the same product as a direct purchase. Etsy buyers get
full access, not a lesser version.

**What determines what you can do:**
- **Active** — full read/write access: create blueprints, journal, tracker logs, curricula; Oracle access
  if you bought the Oracle tier. Monthly renews automatically until canceled; annual runs for a full plan
  year.
- **Read-only** — an annual purchase's plan year has ended: you keep permanent access to everything you
  already created, but can't add new content until you renew.
- **Expired** — a monthly subscription lapsed or was canceled: no access until you resubscribe.
- **Revoked** — an admin-applied state (refund/abuse); access fully blocked.

**Common things you might see:**
| Situation | What you'll see |
|---|---|
| Etsy order number doesn't match anything | "We couldn't find an Etsy purchase that matches that order number." |
| Email doesn't match the Etsy purchase | "That email does not match the Etsy purchase on file for this order." |
| Order already activated on another account | "This Etsy purchase has already been activated on a Kiaros account." |
| Activation link older than 7 days | "This activation claim has expired. Please verify your Etsy purchase again." |
| Blueprint taking a while | A generation screen, up to ~10 minutes, with a retry option if it times out |
| Trying to create content without active access | A message that an active planner subscription is required |

Annual purchasers (both direct and Etsy) also get a **loyalty reward** reserved for next year's renewal.

---

## 17. How It All Connects

Everything in Kiaros is built from one shared foundation:

```
Your birth data
      │
      ▼
 Natal Chart  ──────────────┬─────────────────┐
      │                     │                 │
      ▼                     ▼                 ▼
 Blueprint            Human Design      Today's live sky
 (52 wks/12 mo/4 qtr)  (bodygraph)      (Sky Now, moon phase)
      │                     │                 │
      ├─────────────┬───────┴──────┬──────────┤
      ▼             ▼              ▼          ▼
  Cosmic       Areas + Goals   Oracle chat   Today
  Calendar     (timing         (grounds      Dashboard
 (Year/Month/  windows from    replies in
  Week/Review) blueprint)      your chart)
      │                              │
      ▼                              ▼
 Quarterly Reviews            Captures → Insights map
 (pulls activity stats
  from Tracker, Journal,
  Oracle, Curriculum)

 Journal ──stamped with──> today's sky/transits ──feeds──> Pattern Insights
 Daily Tracker ──stamped with──> moon phase/cycle phase
 Curriculum ──scheduled into──> Calendar + Today
```

In short: your chart feeds the Blueprint and Human Design once; the Blueprint then feeds the Calendar, Areas,
and Quarterly Reviews; the live daily sky feeds Today, Journal, and Tracker; and your own activity across
Journal/Tracker/Oracle/Curriculum feeds back into Quarterly Reviews and Oracle's own memory of you.

---

## 18. Known Gaps (internal awareness — not for publishing)

- **Year Unwrapped** (a Q4 year-end retrospective) is not built at all — no page, no stub.
- **Gene Keys** is only 4 of 11 spheres.
- Cycle-tracking data is *collected* at onboarding/settings but its downstream use elsewhere in the product
  needs confirming with the founder — flagged as an open question in the technical wiki.
- **Naming inconsistency**: public pages mix "Kairos" (body copy) and "Kiaros" (page `<title>` tags and the
  `kairosplanner.xyz` support email domain). Per the Product Bible, "Kairos" is the intended public name.
  Needs a founder decision on which name goes everywhere before more marketing assets are built.
- **Homepage/pricing under-sell several shipped features**: Human Design, Daily Tracker, Curriculum,
  Quarterly Reviews, Month Briefs, and the Insights capture map are not mentioned anywhere in current
  homepage or pricing copy. Worth deciding whether/how to add them before more Etsy or homepage assets go out.
- **Etsy pricing in `docs/etsy-listing-prep.md`** ($96/$144 direct) does not match the live
  `lib/commerce/config.ts` pricing ($14/mo–$140/yr Planner, $22/mo–$220/yr Planner+Oracle). Needs
  reconciling before publishing new Etsy material.
- **Privacy and Terms pages are stubs** — just a contact email, no actual policy text. Given the product
  handles birth data, journal content, and payments, this is worth addressing regardless of the wiki project.

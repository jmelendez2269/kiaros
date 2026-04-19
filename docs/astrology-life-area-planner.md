# Astrology-Native Life Area Planner

## Vision

Kiaros should stop feeling like a generic productivity app with astrology layered on top.

Instead, the planner should feel like a living interpretation of the user's natal chart and current-year transits, organized through the life areas that matter most right now.

The strongest initial life areas are:

- Work & Career
- Relationships
- Financial

Each area should answer:

- Why is this area important for me this year?
- Which house(s) does it belong to in my chart?
- Which natal planets are involved?
- Which transits and lunations are activating it?
- What kind of actions are supported right now?
- What goals am I actively shaping in this area?
- When should those goals be scheduled in the planner?

## Product Shift

## What to remove or demote

The current product has two layers that feel too generic:

- `Tracker`
- `Curriculum`

Those are useful mechanics, but they should no longer be primary destinations.

### Tracker should evolve into:

- `Area Practice`
- `Alignment Check-In`
- `Transit Reflection`

Instead of logging generic metrics, the user should check in against the active astrological storyline of a life area.

### Curriculum should evolve into:

- `Area Roadmap`
- `Transit Timeline`
- `Guided Action Plan`

Instead of an AI study plan, Kiaros should generate a year map for each chosen life area with milestones, windows, advice, and scheduled actions.

## Core Experience

## 1. Life Area Profiles

Each selected area becomes its own astrology-specific workspace.

For example:

### Work & Career

- Primary houses: 10th, 6th, 2nd
- Themes: vocation, visibility, daily work, income, mastery
- Active story this year:
  - Saturn transiting the 10th may ask for discipline and long-term restructuring
  - Jupiter activating the 2nd may support income growth and confidence
  - Eclipses hitting the 6th/12th axis may shift work-life balance

### Relationships

- Primary houses: 7th, 5th, 8th
- Themes: partnership, romance, intimacy, reciprocity
- Active story this year:
  - Venus or Jupiter transits can open connection windows
  - Saturn may test commitment and boundaries
  - Pluto or eclipses may transform relational patterns

### Financial

- Primary houses: 2nd, 8th, 11th
- Themes: personal income, shared resources, debts, long-term gain
- Active story this year:
  - 2nd house activation supports earning and value clarity
  - 8th house activation can expose entanglements, taxes, debt, trust
  - 11th house activation can support gains through networks and future goals

## 2. Yearly Area Narrative

Each area should have a yearly interpretation generated from:

- natal chart placements in relevant houses
- ruler(s) of those houses
- natal planets inside those houses
- major transits to those rulers and natal planets
- eclipses, retrogrades, and lunations touching the area

The output should feel like a strategic narrative, not a horoscope paragraph.

Suggested structure:

- `Year theme`
- `What is changing`
- `What is being asked of you`
- `Best uses of this energy`
- `Common pitfalls`
- `What success looks like by year-end`

## 3. Timeline of Activation

Each area should have a timeline with the most important windows for the year.

Each timeline item should include:

- date range
- transit or event
- affected house
- affected natal planet or house ruler
- interpretation
- guidance
- recommended action style

Recommended action styles:

- initiate
- commit
- review
- repair
- reconnect
- negotiate
- save
- invest
- rest
- observe

Example:

- `May 8 - June 2`
- `Jupiter trine natal Venus`
- `Affects 7th house ruler`
- `Relationships are more open, generous, and future-facing`
- `Good for reaching out, repairing, dating, or deepening mutual plans`

## 4. Goals Inside Each Area

Each life area should allow the user to create specific goals that belong to that area.

Examples:

### Work & Career goals

- Ask for a promotion
- Update portfolio
- Launch consulting offer
- Build a steadier weekly work rhythm

### Relationships goals

- Have one honest conversation each week
- Clarify partnership standards
- Rebuild trust after conflict
- Be more intentional in dating

### Financial goals

- Build a 3-month emergency fund
- Pay off a credit card
- Raise rates
- Create a monthly money review ritual

Each goal should be linked to:

- one life area
- optional house focus
- optional transit window
- a desired outcome
- preferred action cadence
- planner events or rituals

## 5. Planner Integration

The calendar should become the place where astrology becomes actionable.

Instead of mainly showing generic week guidance plus curriculum sessions, it should show:

- major area activations
- best timing windows
- suggested rituals
- user goals
- recommended action moments
- review and reflection prompts

### Calendar event types

- `transit_window`
- `moon_window`
- `goal_action`
- `goal_review`
- `ritual`
- `integration`

### Examples

- `Career push window opens`
- `Financial review under Virgo full moon`
- `Relationship conversation day`
- `Do not force: Mercury retrograde review week`

## 6. Reflection Instead of Generic Tracking

The replacement for the tracker should be qualitative and astrologically framed.

For each area, users can answer short prompts such as:

- How did I work with this energy this week?
- What happened in this area during this transit?
- What felt aligned?
- What resistance showed up?
- What needs to be adjusted before the next activation?

Optional light structured inputs can remain, but they should be tied to the area:

- confidence
- clarity
- momentum
- emotional steadiness
- trust
- discipline
- financial stability

These should not be presented as a generic habit tracker.

## Astrology Logic Model

## Area to house mapping

Kiaros should support both default mappings and chart-specific nuance.

### Default mappings

#### Work & Career

- 10th house
- 6th house
- 2nd house

#### Relationships

- 7th house
- 5th house
- 8th house

#### Financial

- 2nd house
- 8th house
- 11th house

### Personalization layer

For each area, calculate:

- relevant houses
- sign on each house cusp
- house ruler planet
- natal planets located in those houses
- whether the ruler is especially emphasized natally
- current-year transits to that ruler or planets in that house

This is what makes the guidance feel truly chart-specific.

## What counts as an activation

An area is considered activated when one or more of the following happen:

- a slow-moving transit aspects a natal planet in one of the area's houses
- a slow-moving transit aspects the ruler of a relevant house
- an eclipse lands in a relevant sign/house axis
- a lunation occurs in a relevant house
- a retrograde occurs over a relevant house or ruler
- a monthly transit cluster strongly emphasizes that area

## Scoring idea

Each area can receive a rolling activation score for a given week.

Possible weighted scoring:

- outer planet exact hit to house ruler: 5
- Jupiter/Saturn exact hit to natal planet in area house: 4
- eclipse in area house: 5
- new/full moon in area house: 3
- Venus/Mars/Mercury transit to ruler: 2
- retrograde through area house: 2

This score can drive:

- weekly focus chips
- planner emphasis
- recommendation priority
- whether the UI says `push`, `reflect`, `repair`, or `observe`

## Proposed Information Architecture

## Current

- Dashboard
- Cosmic Plan
- Blueprint
- Curriculum
- Tracker
- Oracle

## Proposed

- Dashboard
- Cosmic Plan
- Blueprint
- Areas
- Oracle

Inside `Areas`:

- Work & Career
- Relationships
- Financial

Each area page has:

- yearly overview
- transit timeline
- active goals
- timing windows
- reflections
- planner events

The current `Tracker` and `Curriculum` pages can be retired or absorbed into this experience.

## Data Model Direction

The current schema already gives us:

- `goal_categories`
- `blueprints`
- `ephemeris_cache`
- `daily_logs`
- `curriculum_plans`
- `curriculum_sessions`

To support the new vision, the generic curriculum tables should be replaced or superseded by astrology-native planning tables.

## Recommended new tables

### `life_areas`

One row per user-selected area.

Suggested fields:

- `id`
- `user_id`
- `slug` (`work-career`, `relationships`, `financial`)
- `name`
- `description`
- `sort_order`
- `is_active`
- `created_at`

### `life_area_profiles`

Stores the astrology interpretation for that area for a given plan year.

Suggested fields:

- `id`
- `life_area_id`
- `user_id`
- `plan_year`
- `primary_houses` JSONB
- `secondary_houses` JSONB
- `house_rulers` JSONB
- `natal_planets` JSONB
- `year_theme`
- `year_story`
- `growth_edge`
- `support_strategy`
- `timing_summary`
- `generated_from_blueprint_version`
- `created_at`
- `updated_at`

### `life_area_timelines`

Stores the major activation windows for that area.

Suggested fields:

- `id`
- `life_area_id`
- `user_id`
- `plan_year`
- `start_date`
- `end_date`
- `activation_type`
- `title`
- `summary`
- `astrology_context` JSONB
- `affected_houses` JSONB
- `affected_planets` JSONB
- `energy_mode`
- `guidance`
- `priority_score`
- `created_at`

### `life_area_goals`

Stores goals created inside a life area.

Suggested fields:

- `id`
- `life_area_id`
- `user_id`
- `title`
- `description`
- `status`
- `desired_outcome`
- `house_focus`
- `linked_timeline_id`
- `target_date`
- `cadence`
- `best_timing_notes`
- `created_at`
- `updated_at`

### `life_area_goal_events`

Planner-level scheduled actions tied to a goal.

Suggested fields:

- `id`
- `goal_id`
- `life_area_id`
- `user_id`
- `event_type`
- `title`
- `notes`
- `scheduled_for`
- `timing_source`
- `status`
- `created_at`

### `life_area_reflections`

Astrology-native check-ins instead of tracker logs.

Suggested fields:

- `id`
- `life_area_id`
- `user_id`
- `reflection_date`
- `linked_timeline_id`
- `prompt_set` JSONB
- `responses` JSONB
- `alignment_score`
- `created_at`

## Migration strategy

### Phase 1

- keep `goal_categories`
- introduce `life_areas` and map seeded categories into them
- keep `blueprints` and `ephemeris_cache` as sources
- keep calendar page but begin overlaying area timelines

### Phase 2

- stop creating new `curriculum_plans`
- stop surfacing `tracker_metrics` in navigation
- add `life_area_goals`, `life_area_timelines`, and `life_area_goal_events`
- render astrology-native planner blocks in calendar

### Phase 3

- deprecate `curriculum_sessions` and `tracker_metrics` UI
- replace `Tracker` page with `Areas` or `Area Reflections`
- rename navigation and language across app

## UX Recommendations

## New onboarding language

Current onboarding asks for categories in a useful but generic way.

It should be reframed as:

- Which life areas do you want Kiaros to interpret and support this year?
- What does success in this area look like by year-end?
- What are you trying to build, heal, stabilize, or invite here?

## Area page modules

### Header

- area title
- yearly theme
- houses involved
- current activation level

### This Year

- narrative overview
- what this area is teaching
- best strategy

### Timing Windows

- timeline view
- strongest windows highlighted
- caution or review periods called out

### Goals

- add goal
- link to timing windows
- create planner actions

### Reflection

- current transit prompt
- weekly or monthly alignment review

## Concrete Build Recommendation

The best build order from the current codebase is:

1. Replace the conceptual role of `goal_categories` with `life areas`, while keeping the current data temporarily for compatibility.
2. Add a new astrology-native area profile generator that reads from natal chart, ephemeris, and blueprint data.
3. Generate `life_area_timelines` for Work & Career, Relationships, and Financial first.
4. Add `life_area_goals` and push those into the calendar as date-based actions.
5. Replace `Tracker` with `Reflections`.
6. Retire `Curriculum` or repurpose it into `Area Roadmaps`.

## Recommendation for the first milestone

If we want the fastest high-value version, the first milestone should be:

- create a new `Areas` page
- generate three astrology-native area profiles
- generate timeline windows for those three areas
- allow users to add goals inside each area
- surface those goals and windows inside the calendar

That would already make Kiaros feel much closer to your real vision.

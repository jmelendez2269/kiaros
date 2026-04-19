# Admin Console / Curation Studio

The Admin Console is an internal tool for curating trusted astrology knowledge into structured "cards" that power Kiaros's personalized planner outputs.

## Workflow

1. **Sources** — Register trusted astrology content (YouTube videos, podcasts, newsletters, etc.)
2. **Imports** — Fetch content from sources and extract raw transcripts
3. **Draft Cards** — AI generates structured interpretation cards from transcripts
4. **Published Cards** — Human-reviewed and approved cards ready for use
5. **Planner Mapping** — Map cards to planner layers and use cases

## Setup

### 1. Enable Admin Access

Admin access is controlled by a `publicMetadata.isAdmin` flag in Clerk. To grant admin access:

1. Open the [Clerk dashboard](https://dashboard.clerk.com)
2. Navigate to **Users** and select your user
3. In the **Metadata** section, add:
   ```json
   {
     "isAdmin": true
   }
   ```
4. Save and refresh your browser

### 2. Run the Database Migration

```bash
supabase db push
```

This creates 4 new tables: `admin_sources`, `admin_imports`, `admin_cards`, `admin_planner_mappings`.

### 3. (Optional) Seed Sample Data

To load sample sources, imports, and draft cards for testing:

```bash
psql $DATABASE_URL < supabase/seeds/admin_seed.sql
```

## Pages

### `/admin/sources`
Register and manage trusted content sources. Add source_name, astrologer_name, source_type, URL, description, and trust_level.

**Source types:** youtube_video, youtube_channel, podcast, website, book, newsletter, other

**Trust levels:** low, medium, high, verified

### `/admin/imports`
Create import jobs. Select a source, paste a URL or content, and the system auto-fetches the transcript using a mock ingestion service.

**Import types:** youtube_transcript, podcast_transcript, manual_paste, url_scrape

**Status flow:** pending → fetched → processed (or failed)

### `/admin/drafts`
Review AI-generated draft cards one at a time. Each draft shows:
- Title, summary, usable copy
- Source quotes
- Structured data (JSON)
- Confidence score
- Tags

**Actions:** Approve (publish) or Reject (discard).

### `/admin/published`
View all approved cards as a grid. Cards show title, category, summary, confidence, and tags.

### `/admin/mapping`
Map approved cards to planner layers (year, month, week, day) and use cases. Set priority weights and eligibility flags.

## API Endpoints

All endpoints require admin authentication (403 Forbidden if not admin).

### Sources
- `GET /api/admin/sources` — List sources (filters: ?active=true, ?source_type=youtube_video)
- `POST /api/admin/sources` — Create source
- `GET /api/admin/sources/[id]` — Get source
- `PATCH /api/admin/sources/[id]` — Update source
- `DELETE /api/admin/sources/[id]` — Delete source

### Imports
- `GET /api/admin/imports` — List imports (filters: ?status=fetched, ?source_id=xxx)
- `POST /api/admin/imports` — Create import (auto-fetches transcript in background)
- `GET /api/admin/imports/[id]` — Get import
- `PATCH /api/admin/imports/[id]` — Update import
- `DELETE /api/admin/imports/[id]` — Delete import
- `POST /api/admin/imports/[id]/generate` — Trigger AI card generation (background job, returns 201)

### Cards
- `GET /api/admin/cards` — List cards (filters: ?status=draft, ?category=planet, ?import_id=xxx)
- `POST /api/admin/cards` — Create card
- `GET /api/admin/cards/[id]` — Get card
- `PATCH /api/admin/cards/[id]` — Update card
- `DELETE /api/admin/cards/[id]` — Delete card
- `POST /api/admin/cards/[id]/approve` — Approve (set status=approved)
- `POST /api/admin/cards/[id]/reject` — Reject (set status=rejected)

### Mappings
- `GET /api/admin/mapping` — List mappings (filters: ?card_id=xxx, ?planner_layer=week)
- `POST /api/admin/mapping` — Create mapping
- `GET /api/admin/mapping/[id]` — Get mapping
- `PATCH /api/admin/mapping/[id]` — Update mapping
- `DELETE /api/admin/mapping/[id]` — Delete mapping

## Card Categories

When creating or generating cards, use one of these categories:

- **rising_sign** — Rising sign interpretations
- **house** — House system placements
- **planet** — Planet function and expression
- **transit_timing** — Transit patterns and timing
- **planner_translation** — How to apply astrological insight to planner behavior
- **general_framework** — General astrology frameworks and principles

## Structured Data

Each card stores `structured_data` as JSON. Examples:

**Rising sign card:**
```json
{
  "sign": "Aries",
  "core_orientation": "...",
  "natural_pace": "...",
  "planning_style": "..."
}
```

**House card:**
```json
{
  "house": 10,
  "life_domain": "...",
  "growth_edge": "..."
}
```

**Planet card:**
```json
{
  "planet": "Saturn",
  "function": "...",
  "healthy_expression": "...",
  "distorted_expression": "..."
}
```

**Transit/timing card:**
```json
{
  "transit_pattern": "...",
  "themes": ["..."],
  "favors": ["..."],
  "avoid": ["..."],
  "intensity": "medium"
}
```

**Planner translation card:**
```json
{
  "trigger_conditions": ["..."],
  "suggested_actions": ["..."],
  "guidance_style": "spacious"
}
```

## Transcript Ingestion

The system uses a mock transcript fetcher in development. To swap in a real YouTube API:

1. Update `lib/admin/transcript-ingestion.ts`
2. Implement `YouTubeTranscriptFetcher` with real API calls
3. Set `USE_REAL_TRANSCRIPT_FETCHER=true` in your environment

## AI Card Generation

When you click "Generate Draft Cards" on an import, the system:

1. Fetches source metadata (name, astrologer, trust level)
2. Passes the cleaned transcript to Claude via the Vercel AI Gateway
3. Extracts 3–10 structured interpretation cards
4. Creates draft cards in the database with status=draft
5. Marks the import as processed

The AI prompt emphasizes:
- Actionable interpretation patterns (not summaries)
- Specificity (not generic astrology clichés)
- Direct sourcing (not fabrication)
- Structured output (valid JSON, no markdown)

## Notes

- All admin tables use Postgres RLS with deny-all policies for JWT. The service-role client bypasses RLS, ensuring only backend code can access admin data.
- Transcript fetching and AI generation use Next.js `after()` (background jobs with 300s timeout).
- All service functions return `AdminApiResponse<T>` = `{ success: true, data: T } | { success: false, error: string }`.
- No API endpoints expose the service-role key to the browser. All admin queries happen server-side.

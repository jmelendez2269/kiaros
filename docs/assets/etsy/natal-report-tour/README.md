# Kairos natal-report product-tour screenshots

These local assets are privacy-safe browser captures of the public fictional **Alex** demo on the Kairos pricing page. They contain no buyer information and were captured from the local app at a 1440×1000 desktop viewport on 2026-08-24.

## Final embedded screenshots

- `01-today-overview.jpg` — Today summary plus the three planning lanes.
- `02-week-timing.jpg` — seven-day Week Pulse.
- `03-quarter-view.jpg` — quarter theme, highlights, activation windows, and rest period.
- `04-goals-life-areas.jpg` — timed goals/life areas and their journal prompts.
- `05-journal.jpg` — contextual journal explanation and sample prompts.
- `06-oracle.jpg` — optional Planner + Oracle context and fictional conversation.

The JPEG files were cropped reproducibly from `pricing-full.png` by `scripts/crop-kairos-report-tour.mjs`. The full capture and diagnostic PNGs are retained as source evidence. The report template embeds only the six optimized JPEGs.

To refresh them, start Kairos locally, open `/pricing` with a 1440×1000 browser viewport, capture the full page to `pricing-full.png`, confirm that the fictional demo layout has not moved, update crop coordinates if necessary, and run:

```powershell
node scripts/crop-kairos-report-tour.mjs
```

Always inspect every regenerated crop before producing candidate PDFs. Never substitute authenticated account screenshots or production buyer data.

# Etsy natal report + Anchor Print image sources

This directory contains the local source material for the eight-image natal report + Anchor Print Etsy carousel. Nothing here has been uploaded or published.

## Sources

- `fixture-v2-known-report-letter-cover.png` is the fictional known-time 26-page report and product-tour cover for **Avery**.
- `fixture-v2-known-anchor-letter.png` is Avery's separate one-page Anchor Print.
- `fixture-v2-known-report-a4-cover.png` is the same fictional report cover rendered at A4.
- `fixture-v2-unknown-report-letter-chart.png` is the unknown-time report's chart-reference page and contains no buyer data.
- The earlier `fixture-known-*` and `fixture-unknown-*` files are preserved as superseded v1 source history and are not read by the v2 compositor.
- `cover-celestial-brand-v2.png` is the primary starfield, violet-horizon, and orbital-cartography cover scene.
- `celestial-atlas-brand-v2.png` is the framed celestial-navigation background used by information and process slides.
- `lunar-map-brand-v2.png` is the moon-phase, constellation, and natal-wheel background used by personalization and boundary slides.
- The three backgrounds were generated from the existing Kairos Etsy artwork as style references. They contain no product copy; real fixture pages and exact listing text are composed separately by the local generator.

## Current background prompts

The rejected minimal tabletop direction is no longer used. The current prompts deliberately preserve the established Kairos language: midnight space, luminous violet and cyan, copper-gold celestial geometry, stars, moon phases, and astronomical instruments.

### Cover

> Use case: ads-marketing. Asset type: master 4:3 Etsy listing cover background for the Kairos natal report + Anchor Print. Images 1 and 2 are the existing Kairos Etsy listings and are style references only. Carry forward their deep midnight-blue space, luminous violet-to-cyan horizon, fine copper-gold orbital geometry, tiny stars, elegant celestial cartography, and premium mystical-scientific atmosphere without copying their laptop, wording, or exact composition. Create a fresh cosmic stage for a substantial personalized astrology report and separate keepsake: an expansive indigo starfield above a radiant violet horizon, graceful concentric orbit arcs, fine astrolabe lines, subtle constellation connections, bright eight-point starbursts, and faint zodiac-wheel geometry. Keep atmospheric room in the left-middle for the exact headline and a dimensional center-right stage for the real product pages. No generated words, fake product pages, laptop, or watermark.

### Celestial atlas

> Use case: ads-marketing. Asset type: flexible 4:3 information-slide background for a Kairos Etsy carousel. Match the existing listings' premium cosmic visual language without copying their laptop, wording, or arrangement. Create an elegant celestial-navigation atlas with a deep navy star map, fine copper-gold longitude arcs, constellation threads, radial calibration marks, luminous starbursts, faint circular chart wheels, restrained electric-violet and cyan blooms, ornate border architecture, a darker central reading field, and a subtle luminous lower horizon. No generated words, fake pages, laptop, or watermark.

### Lunar map

> Use case: ads-marketing. Asset type: lunar and constellation 4:3 background for a Kairos Etsy carousel. Preserve the existing listings' midnight space, luminous violet, cyan accents, copper-gold astronomy lines, and polished luxury. Focus on birth time, lunar uncertainty, and personal sky mapping: a graceful sequence of moon phases, a translucent natal-wheel or astrolabe halo, constellation threads and bright star nodes, violet-cyan nebula ribbons, fine golden calibration lines, scattered radiant starbursts, and a luminous lower aurora. No generated words, fake page content, laptop, or watermark.

## Regeneration

From the repository root:

```powershell
node scripts/generate-etsy-anchor-listing-images.mjs
```

The command writes eight 3000×2250 PNG files to `public/marketing/etsy/anchor-print/`.

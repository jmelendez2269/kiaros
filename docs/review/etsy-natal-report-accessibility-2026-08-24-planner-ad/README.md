# Natal Report + Anchor Print Independent Accessibility Review — Kairos Planner Advertisement

> Superseded by `docs/review/etsy-natal-report-accessibility-2026-08-24-planner-tour/`, which extends the report to 26 pages with six founder-approved real-interface product screenshots.

This frozen revision contains fictional data only. It supersedes the earlier full-report bundles because page 20 is now a dedicated Kairos Planner advertisement with a visible and clickable `https://kairosplanner.xyz` link. Review the PDFs themselves—not the PNG screenshots or source HTML—as the candidate buyer experience.

The report generator completed 980 automated structural assertions across eight PDFs. Those checks establish structural readiness only. They do not make this an independent review and do not establish PDF/UA or WCAG conformance.

## Candidate files

| Scenario | Document | Size | Pages | SHA-256 |
|---|---|---:|---:|---|
| Known time | `art_fixture_known_001_natal-report_letter.pdf` | Letter | 20 | `14f5199db52848dfba5e3189a971c377f8944a4b63e4ea11336d126ab5e3b5ba` |
| Known time | `art_fixture_known_001_natal-report_a4.pdf` | A4 | 20 | `0c3ac82a58dbdcd4049b63d4c735a447c41d6d6632b5b2b85969f945edad8aa9` |
| Known time | `art_fixture_known_001_anchor-print_letter.pdf` | Letter | 1 | `1e60992da8bd546d78a9cd6eb943d6c69d4fa091c549d4e2d8169a1d804b2b5f` |
| Known time | `art_fixture_known_001_anchor-print_a4.pdf` | A4 | 1 | `c6b640ef8a2c86fe9d6529ddb1bbcd57a43234c49224f16d9f38949094d67576` |
| Unknown time | `art_fixture_unknown_001_natal-report_letter.pdf` | Letter | 20 | `8f83a59ff6594bc42fdd426bddd6b1c9f35bf7b099e0d3ccf57a82d58357b59f` |
| Unknown time | `art_fixture_unknown_001_natal-report_a4.pdf` | A4 | 20 | `5bc05bc73d0b057ac1e116baf131c4226b828ee6b19ec9893ff33996d6c17f5d` |
| Unknown time | `art_fixture_unknown_001_anchor-print_letter.pdf` | Letter | 1 | `1baa207121359952e9ca32d733015efd63b4c31665c27aa20a0a38aa17a3bef3` |
| Unknown time | `art_fixture_unknown_001_anchor-print_a4.pdf` | A4 | 1 | `642a7849b2ac01a5f357c3e4fc7579e12c1d3bcc74ca688259c4a2a9023ac3fc` |

## Reviewer environment

- Reviewer:
- Review date:
- Operating system and version:
- PDF reader and version:
- Screen reader and version:
- PDF accessibility checker and version:
- Other assistive technology:

## Required review

- [ ] Confirm the document language and generic title metadata are correct.
- [ ] Inspect the complete tag tree and heading hierarchy.
- [ ] Confirm the report has exactly 20 pages and the Anchor Print has exactly one.
- [ ] Confirm the natal chart is exposed as a figure with a meaningful text equivalent.
- [ ] Confirm placement-table column headers and row headers are announced correctly.
- [ ] Read the chart/reference page in the intended order: title, chart description, placements, aspects, uncertainty note, method.
- [ ] Read several interpretation chapters, including the first and last, and confirm each title, summary, two prose paragraphs, three practical anchors, fact sources, and footer are announced logically.
- [ ] Confirm the two-column reflection grid reads in the intended numbered order from 01 through 08.
- [ ] Confirm page 20 is the Kairos Planner advertisement and contains no remnants of the former method page.
- [ ] Confirm the ad heading, four feature cards, CTA, standalone-product boundary, human-review/reflective-use footer, and visible website address are selectable and announced in the intended order.
- [ ] Confirm the report contains exactly one link, it appears only on page 20, and it opens `https://kairosplanner.xyz`; confirm the Anchor Print contains no links.
- [ ] Confirm the six Anchor Print cards read in numbered order from 01 through 06.
- [ ] Confirm unknown-time files clearly omit houses and angles and announce the Moon/time uncertainty without suggesting false precision.
- [ ] Test keyboard reading/navigation, link activation, text selection and copying, zoom, magnification, and reflow where supported.
- [ ] Confirm meaning does not depend only on violet, cyan, copper, chart geometry, or divider lines.
- [ ] Assess the smaller redundant labels, chart abbreviations, source notes, advertisement footer, and page footers; require changes if any unique meaning is unavailable at a readable size.
- [ ] Confirm no artifact ID, local file path, or display name appears in PDF metadata.
- [ ] Record every failure with document, page, reading order/location, expected behavior, actual behavior, severity, and suggested correction.

## Findings

| ID | File/page | Severity | Expected | Actual | Recommended correction | Retest |
|---|---|---|---|---|---|---|
| | | | | | | |

## Decision

- [ ] Pass for the tested assistive-technology combinations.
- [ ] Pass with documented limitations.
- [ ] Changes required before launch.
- [ ] Unable to assess; specialist review required.

Approved public wording, if any:

> 

Reviewer name/signature:

Date:

Return this completed worksheet together with the accessibility-checker output and a short note identifying every tested screen-reader/PDF-reader combination. Link the returned evidence from `docs/etsy-anchor-print-launch-approval-packet.md`. Do not upgrade the public accessibility claim based only on the automated `verification-report.json`.

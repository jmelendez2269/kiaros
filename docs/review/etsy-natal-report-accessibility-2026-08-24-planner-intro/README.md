# Natal Report + Anchor Print Independent Accessibility Review — Kairos Planner Introduction

> Superseded by `docs/review/etsy-natal-report-accessibility-2026-08-24-planner-ad/`, which replaces the gentle Planner introduction with the founder-approved full-page advertisement and website link.

This frozen revision contains fictional data only. It supersedes the earlier full-report bundle in `docs/review/etsy-natal-report-accessibility-2026-08-24/` because page 20 now identifies the report as a Kairos product, explains the Kairos Planner, and invites the reader to find it in the same Etsy shop. Review the PDFs themselves—not the PNG screenshots or source HTML—as the candidate buyer experience.

The report generator completed 972 automated structural assertions across eight PDFs. Those checks establish structural readiness only. They do not make this an independent review and do not establish PDF/UA or WCAG conformance.

## Candidate files

| Scenario | Document | Size | Pages | SHA-256 |
|---|---|---:|---:|---|
| Known time | `art_fixture_known_001_natal-report_letter.pdf` | Letter | 20 | `04604413c699991a035e278637f6753d705f0bab9dbade7b333e4c5a5c519e96` |
| Known time | `art_fixture_known_001_natal-report_a4.pdf` | A4 | 20 | `ad34c079e5ace71547a0f664c0278925b290a18b45569ccce73caf63e2a7610b` |
| Known time | `art_fixture_known_001_anchor-print_letter.pdf` | Letter | 1 | `7add8d5d131c4510e76e7ab1706142bfce68888862bf7db101607053e028fe6e` |
| Known time | `art_fixture_known_001_anchor-print_a4.pdf` | A4 | 1 | `70c0f114315b563d8eaada5e40fb1bc49813baa86e03a32766f883cd31debadd` |
| Unknown time | `art_fixture_unknown_001_natal-report_letter.pdf` | Letter | 20 | `c906e35a85ec634df273fcd4c678929c0d9d0922fae12fe474aec7916bf4551a` |
| Unknown time | `art_fixture_unknown_001_natal-report_a4.pdf` | A4 | 20 | `1aff06086c8d886d349049c2bbc9a3a7d221f5f5b6d531ab3faaf2ecac44ff05` |
| Unknown time | `art_fixture_unknown_001_anchor-print_letter.pdf` | Letter | 1 | `778610dcba33652cca49f561a7c69956674939780deb97e24cd40fbb6d5300af` |
| Unknown time | `art_fixture_unknown_001_anchor-print_a4.pdf` | A4 | 1 | `2c5ba43b7cbf5de563a206e57e01f4e67dd5c38ea4762174e6ba018c9a3126be` |

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
- [ ] Confirm the method/scope disclosure and closing Kairos Planner introduction on page 20 are complete, selectable, and announced in the intended order.
- [ ] Confirm the page-20 invitation says the report is complete on its own and points only to the same Etsy shop, with no external link or QR code.
- [ ] Confirm the six Anchor Print cards read in numbered order from 01 through 06.
- [ ] Confirm unknown-time files clearly omit houses and angles and announce the Moon/time uncertainty without suggesting false precision.
- [ ] Test keyboard reading/navigation, text selection and copying, zoom, magnification, and reflow where supported.
- [ ] Confirm meaning does not depend only on violet, cyan, copper, patterned bars, chart geometry, or divider lines.
- [ ] Assess the smaller redundant labels, chart abbreviations, source notes, and page footers; require changes if any unique meaning is unavailable at 11pt or larger.
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

# Natal Report + Anchor Print Independent Accessibility Review — Kairos Product Tour

This frozen revision contains fictional data only. It supersedes the earlier full-report bundles because the report now contains 26 pages: the personalized natal report experience, the full-page Kairos Planner advertisement on page 20, and six real-interface/fictional-data product-tour pages from page 21 through page 26.

The report generator completed 1,132 automated structural assertions across eight PDFs. Those checks establish structural readiness only. They do not make this an independent review and do not establish PDF/UA or WCAG conformance.

## Candidate files

| Scenario | Document | Size | Pages | Bytes | SHA-256 |
|---|---|---:|---:|---:|---|
| Known time | `art_fixture_known_001_natal-report_letter.pdf` | Letter | 26 | 1,004,361 | `32235f225725137ef06bb3adb589bc396bc6b2a7796c4efd82b5310368bbfe36` |
| Known time | `art_fixture_known_001_natal-report_a4.pdf` | A4 | 26 | 996,670 | `8f8421abaced611bd851e882040bec17d46d27ae8812f2ca33e252d4ec088319` |
| Known time | `art_fixture_known_001_anchor-print_letter.pdf` | Letter | 1 | 78,501 | `701652b9d9f431ad1e6672b01681280140cd8ed83cfcab9994212925ceb128a0` |
| Known time | `art_fixture_known_001_anchor-print_a4.pdf` | A4 | 1 | 78,451 | `e350818016a0f63830b47f1d6ac3bf3c1ba5b58ea8037848513f84b19548e9ad` |
| Unknown time | `art_fixture_unknown_001_natal-report_letter.pdf` | Letter | 26 | 1,001,791 | `77b747f255e12556301f0de43fd94d510cff0c9a81af1be2a56549ab0fb5f498` |
| Unknown time | `art_fixture_unknown_001_natal-report_a4.pdf` | A4 | 26 | 994,065 | `e773d81fdd8112f76618af295f8f6e5fb6987da22198726b629a841923912f52` |
| Unknown time | `art_fixture_unknown_001_anchor-print_letter.pdf` | Letter | 1 | 81,442 | `518cd8a4fc6688f23f8fa0184ccb2b896d719373a67a66d7b9e22c5556cedac5` |
| Unknown time | `art_fixture_unknown_001_anchor-print_a4.pdf` | A4 | 1 | 81,404 | `be27082956900e7ba5bf7c1d7279453ed1b4031287f7914cad5738b9d95f35fa` |

## Reviewer environment

- Reviewer:
- Review date:
- Operating system and version:
- PDF reader and version:
- Screen reader and version:
- PDF accessibility checker and version:
- Other assistive technology:

## Required review

- [ ] Confirm the document language, generic title metadata, exact 26-page report count, and exact one-page Anchor Print count.
- [ ] Inspect the complete tag tree and heading hierarchy.
- [ ] Confirm the natal chart is exposed as a figure with a meaningful text equivalent and the placement table announces headers correctly.
- [ ] Read several interpretation chapters, including the first and last, and confirm each summary, two prose paragraphs, three practical anchors, sources, and footer are announced logically.
- [ ] Confirm the reflection grid reads in numbered order from 01 through 08.
- [ ] Confirm page 20 is the Kairos Planner advertisement and contains the report's only link, targeting `https://kairosplanner.xyz`.
- [ ] Review pages 21–26 in order: Today, week timing, quarter view, goals/life areas, journal, optional Planner + Oracle.
- [ ] Confirm each product-tour screenshot is tagged as meaningful content or accompanied by an equivalent accessible description, title, summary, and caption.
- [ ] Confirm every tour page announces `fictional demo data` and no personal or buyer information appears.
- [ ] Confirm the Today screenshot is legible at ordinary zoom and remains understandable from its surrounding text when the screenshot text itself is magnified or unavailable.
- [ ] Confirm the optional Oracle page does not imply Stelloquy is included with the core Planner.
- [ ] Confirm the six Anchor Print cards read in numbered order from 01 through 06.
- [ ] Confirm unknown-time files omit houses and angles and preserve the Moon/time uncertainty boundary.
- [ ] Test keyboard reading/navigation, link activation, text selection/copying, zoom, magnification, and reflow where supported.
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

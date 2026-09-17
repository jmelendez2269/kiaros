# Natal Report + Anchor Print Independent Accessibility Review

This frozen bundle contains fictional data only. Review the PDFs themselves—not the PNG screenshots or source HTML—as the candidate buyer experience.

The report generator completed 964 automated structural assertions across eight PDFs. Those checks establish structural readiness only. They do not make this an independent review and do not establish PDF/UA or WCAG conformance.

## Candidate files

| Scenario | Document | Size | Pages | SHA-256 |
|---|---|---:|---:|---|
| Known time | `art_fixture_known_001_natal-report_letter.pdf` | Letter | 20 | `4ad0087db5092c2843fe9bea53d84301abe50faeda25f4542a90d64f7f9d6449` |
| Known time | `art_fixture_known_001_natal-report_a4.pdf` | A4 | 20 | `bedcfeb3dbe46d2ebf0c4a4d1fb254bed00e5ce71ec5a4c0794a8d92d17c4472` |
| Known time | `art_fixture_known_001_anchor-print_letter.pdf` | Letter | 1 | `2fc718bda814c7847bf336e75828f86c9ee1d9381ce54808ddbf155f46f4eab7` |
| Known time | `art_fixture_known_001_anchor-print_a4.pdf` | A4 | 1 | `dd55735e5bde3ef234fa018aa0869da0ac5ef25a9da5a464fdb3fdba7f4f8140` |
| Unknown time | `art_fixture_unknown_001_natal-report_letter.pdf` | Letter | 20 | `43dbfc5afd5556d7cccbb8f29c0c94dd0efd0985e44e52e73c7b289d59cb4440` |
| Unknown time | `art_fixture_unknown_001_natal-report_a4.pdf` | A4 | 20 | `0006ac04914798656cc9b6c9590107e7803d75770e5fcea55a72c1913c0503e2` |
| Unknown time | `art_fixture_unknown_001_anchor-print_letter.pdf` | Letter | 1 | `29d81afd55671a487a04692340fc8f3ecf1d4966c1dbd3248411bc37d4bfb383` |
| Unknown time | `art_fixture_unknown_001_anchor-print_a4.pdf` | A4 | 1 | `b72c01258c1d313c0a03eccf91cdb6da4ddc0fae238a329053b64cd0e0ceb408` |

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
- [ ] Confirm the method/scope page and AI-assistance disclosure are complete and understandable.
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

# Anchor Print Independent Accessibility Review Bundle

Prepared: 2026-08-24

This bundle contains fictional data only. It is intended for an independent reviewer and is not a public conformance claim.

## Review these four PDF files

1. `art_fixture_known_001_anchor-print_letter.pdf`
   - SHA-256: `9d06e6f226abf96782e36004f491c1a839762a714f216b03670b5f31ea1881c0`
2. `art_fixture_known_001_anchor-print_a4.pdf`
   - SHA-256: `198d363fec813902f4bfd5669bc76685a121a2ae9e87f09c299df8843f2f24d9`
3. `art_fixture_unknown_001_anchor-print_letter.pdf`
   - SHA-256: `a4118bc9bed9e1562d107212e4dcda91886603f8e82bfbdb8c5bbb8c35acc3a1`
4. `art_fixture_unknown_001_anchor-print_a4.pdf`
   - SHA-256: `a50ea5f330dde90ad069c0a5ed6031d5af3fc6e6715902af06b49de4cd0ffcf4`

The PNG files are visual references only. The HTML files are generation evidence only. Accessibility findings must be based on the PDF files themselves.

## Existing automated evidence

`verification-report.json` records 206 passing structural/file assertions across the four PDFs, including exact page dimensions, selectable complete text, embedded fonts, tagged structure, document/heading/paragraph/table/figure roles, logical extraction order, generic metadata, and absence of links or internal buyer identifiers.

That report establishes structural readiness only. It does not establish PDF/UA or WCAG conformance and does not replace manual assistive-technology review.

## Reviewer environment

- Reviewer: ______________________________
- Review date: ___________________________
- Operating system and version: ___________________________
- PDF reader and version: _________________________________
- Screen reader and version: ______________________________
- Accessibility checker and version: ______________________

## Required review

- [ ] Confirm the PDF document title and `en` language metadata are exposed correctly.
- [ ] Inspect the tag tree: one document root, logical H1/H2 hierarchy, paragraphs, lists, tables, and figures.
- [ ] Confirm each placement table exposes column/row headers and reads cell relationships intelligibly.
- [ ] Confirm the natal chart has an accessible name/description and its meaningful data is repeated in text.
- [ ] Read each page from beginning to end with a screen reader and confirm the order matches the visual order.
- [ ] Pay special attention to the page-one chart/table columns and page-two three-column reflection prompts.
- [ ] Confirm unknown-time limitations are announced and no omitted angle/house claim is implied.
- [ ] Test keyboard navigation, text selection/copy, zoom/magnification, and reflow where the chosen reader supports them.
- [ ] Confirm meaning does not depend only on color, chart geometry, thin lines, or page position.
- [ ] Review the smaller chart/provenance labels and confirm every meaningful fact is repeated at 11pt or larger; otherwise identify the exact missing fact.
- [ ] Confirm there are no unexpected file paths, buyer identifiers, links, attachments, or unsafe metadata.

## Findings

| Severity | File/page | Finding | Recommended correction |
|---|---|---|---|
| | | | |
| | | | |
| | | | |

## Decision

- [ ] Pass for the limited public wording: `Designed with accessibility features; independent PDF/UA conformance is not claimed.`
- [ ] Pass with corrections listed above.
- [ ] Do not launch until corrected and retested.
- [ ] A stronger PDF/UA or WCAG conformance statement is supported by the attached evidence.

Reviewer signature/name: __________________________  Date: __________

## Return evidence

Return this completed worksheet plus the accessibility-checker report and a short note identifying the tested screen-reader/PDF-reader combination. Link those files from `docs/etsy-anchor-print-launch-approval-packet.md`; do not alter the public claim based only on the existing automated report.

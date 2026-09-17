# Natal Report + Anchor Print Launch Approval Packet

> Local approval packet - no deployment, flag activation, Etsy publication, buyer contact, order intake, upload, or delivery is authorized by this document.

Prepared: 2026-08-23

## Bottom line

The original two-page Anchor Print was not substantial enough to stand as a paid astrology report. It has been redesigned locally as a 26-page Personal Natal Astrology Report and Kairos Planner product tour plus a separate one-page Anchor Print, each delivered in US Letter and A4. The depth-enforced content contract, deterministic renderer, four-file workflow, private storage boundary, and fictional review package are ready for review. Launch is not ready until the revised offer is approved, migration `0046` is separately authorized and applied, legal wording is reviewed, and an independent accessibility reviewer tests the final PDFs with assistive technology.

No additional paid cloud resource is needed for this review. At initial low volume, retention operations can remain a documented manual operator procedure; automation should be added only when order volume justifies it.

## Approval board

| Gate | State | What closes it |
|---|---|---|
| Founder offer approval | Pending after redesign | Approve the revised `$34` offer, title, 26-page scope, six-screen product tour, separate Anchor Print, four-file delivery, description, images, personalization prompt, FAQ, and support promises in `docs/etsy-anchor-print-listing-package.md`. |
| Legal operator identity | Substantively complete | Jeanine Melendez is confirmed as the individual operator with no separate business entity in North Carolina, United States. A legal reviewer must still confirm whether a public or service mailing address is required. |
| Legal review | Pending external reviewer | Confirm consumer, privacy, marketplace, limitation-of-liability, governing-law, dispute, tax, and jurisdiction-specific language. |
| Independent accessibility review | Pending external reviewer | Test the final report and Anchor Print in Letter and A4 with accessibility inspection tools and at least one real screen-reader workflow; record the tested versions and limitations. |
| Retention operation | Schema ready | Corrected 2026-09-17: `0045` and `0046_natal_report_package.sql` are both already applied to production (confirmed directly: `artifact_files.document_kind` exists). This gate is closed; earlier text saying `0046` "exists only in local source" was stale. A paid scheduler is not required for the first orders. |
| Deployment and flags | Separately approval-gated | Deploy the reviewed code and enable only the internal admin/persistence flags for named operators. Real buyer intake and Etsy delivery remain off until another approval. |
| Etsy publication | Separately approval-gated | Recheck the live category/attributes and publish only the exact founder-approved listing after every prior gate is closed. |

## Founder details required for legal review

Do not guess these values or publish placeholders.

- [x] Exact legal name of the Etsy seller and privacy data controller: Jeanine Melendez.
- [x] Business/entity type: individual operator; no separate business entity.
- [x] Primary operating jurisdiction: North Carolina, United States.
- [ ] Public business or service mailing address, if required by the selling jurisdictions or counsel.
- [ ] Intended sales territory: the founder is willing to begin US-only if Etsy provides a practical control, but does not require a US-only product restriction. Counsel should confirm the supported launch markets; do not publish an unenforceable territory promise.
- [x] Draft governing law and venue: North Carolina, United States, subject to mandatory consumer protections and legal review.
- [x] `privacy@kairosplanner.xyz`, `legal@kairosplanner.xyz`, and `support@kairosplanner.xyz` are confirmed monitored and suitable for publication.
- [ ] Any tax, registration, accessibility, or consumer-disclosure obligations already identified by an accountant or lawyer.

## Legal reviewer brief

This is a review checklist, not legal advice. Review the current local drafts in `app/privacy/page.tsx` and `app/terms/page.tsx` together with the final Etsy listing and the seller's actual location and sales territories.

- Identify the seller/privacy controller with legally sufficient contact details.
- Confirm the stated lawful bases, buyer rights, identity verification, deletion exceptions, international transfers, and processor categories.
- Confirm the retention schedule is lawful and consistent across the listing, Privacy Policy, Terms, and operating procedure.
- Confirm the personalized-digital-product cancellation, correction, refund, delivery, and mandatory consumer-rights wording for every intended sales territory.
- Confirm the astrology/AI reflective-use disclaimer, human-review statement, and absence of medical, financial, legal, therapeutic, predictive, or guaranteed-outcome claims.
- Confirm the personal-use license, limitation of liability, governing law, dispute venue, and survival language.
- Confirm Etsy remains the transaction, communication, delivery, refund, and case-resolution surface and that buyer data is not used for marketing without consent.
- Confirm whether a business address, registration number, tax identifier, accessibility statement, or other seller disclosure must be public.

## Accessibility evidence already available

- The original two-page bundle at `docs/review/etsy-anchor-print-accessibility-2026-08-24/` is superseded and must not be reviewed as the launch product.
- The current fictional review bundle is `docs/review/etsy-natal-report-accessibility-2026-08-24-planner-tour/`. It contains eight PDFs, source HTML, page images, SHA-256 evidence, and the structural verification report. Earlier method-page, gentle-introduction, and ad-only bundles are preserved as superseded history.
- Eight fictional outputs cover known/unknown birth time, report/Anchor Print, and US Letter/A4.
- Automated verification completed 1,132 assertions: exact 26-page report and one-page keepsake counts, selectable complete chapter prose and prompts, full-page Kairos Planner advertisement, six embedded real-interface/fictional-data product screenshots, selectable product-tour titles and captions, exactly one report link targeting `https://kairosplanner.xyz` on page 20 only, no links in the tour or Anchor Print, embedded fonts, tagged structure, headings, paragraphs, table and figure roles where applicable, logical extraction order, generic metadata, and no internal paths or buyer identifiers in metadata.
- The chart has an accessible name/description, and its key placements/aspects are repeated as text rather than conveyed only by geometry or color.
- Meaningful body copy, table content, interpretations, practical anchors, prompts, captions, uncertainty notes, and disclosures use 11pt or larger type. Some redundant labels, provenance notes, chart labels, and page footers use smaller type and must be explicitly assessed by the independent reviewer.
- Measured text/background contrast ratios are: ink 15.66:1, muted ink 7.70:1, violet 7.76:1, steel 6.11:1, amber 6.95:1, white on amber 7.75:1, and ink on violet-soft 13.65:1. The pale line color is 1.88:1 and must remain decorative/redundant rather than the sole carrier of information.
- Existing evidence supports structural readiness only. It does not establish PDF/UA or WCAG conformance.

## Independent accessibility review protocol

Review the exact final PDF bytes intended for delivery, not screenshots or HTML alone.

- [ ] Run a PDF accessibility checker and inspect the tag tree manually.
- [ ] Confirm document title and language, heading hierarchy, table headers, figure alternative/text equivalent, artifacts, and logical reading order.
- [ ] Read the full 26-page report/product tour and the one-page Anchor Print with a screen reader in a named PDF reader/operating-system combination; record product versions and any limitations.
- [ ] Confirm the chart/table page, every chapter, two-column reflection grid, full-page Kairos Planner advertisement, website link, six screenshot-tour pages, and six-card Anchor Print are announced in the intended sequence.
- [ ] Test keyboard navigation, text selection/copy, zoom, magnification, and reflow where supported.
- [ ] Confirm no meaning depends only on color, thin divider lines, chart position, or the small provenance labels.
- [ ] Review the 5-9pt chart/metadata labels and confirm every meaningful fact is repeated accessibly at 11pt or larger; otherwise require a template correction.
- [ ] Confirm the public claim that may be used. Until this review passes, use only: `Designed with accessibility features; independent PDF/UA conformance is not claimed.`

## Current Etsy policy alignment rechecked 2026-08-23

- Etsy's Creativity Standards allow a seller's original design as a digital download and require AI-use disclosure when AI contributes. Personalized/custom first images must show a finished customized item, not a blank template.
- Etsy's Services Policy allows custom writing/design or divination-related work when a real digital/text deliverable is provided. It prohibits software memberships and metaphysical outcome promises.
- Etsy's Seller Policy makes the seller responsible for protecting buyer data, maintaining an accessible privacy policy when required, and not using buyer information for unsolicited marketing or unauthorized transactions.
- Etsy's current Off-Platform Transactions policy prohibits offers to transact outside Etsy and QR codes that direct buyers off-platform. At the founder's explicit direction, page 20 now advertises the separate Kairos Planner and links to `https://kairosplanner.xyz`. The ad does not alter or complete the report purchase, but this external promotional route may still conflict with Etsy's interpretation of that policy and remains a conscious launch-risk decision rather than a cleared compliance claim.
- The report remains a finished standalone PDF with seller design, human QA, AI disclosure, and no outcome promise. The website advertisement must receive final founder/policy approval before Etsy publication.
- Etsy states that it collects and remits many digital-item sales taxes for international buyers, but it also tells sellers to understand the laws of their buyers' countries. No official native country restriction for this made-to-order digital workflow was identified in this review, so launch territory remains a legal/operational decision rather than a listing promise.

Official references:

- https://www.etsy.com/legal/creativity/
- https://www.etsy.com/legal/policy/services/242665313101
- https://www.etsy.com/legal/sellers/
- https://www.w3.org/WAI/standards-guidelines/wcag/docs/
- https://www.w3.org/WAI/WCAG21/Techniques/pdf/PDF3

## Sign-off record

- [ ] Founder offer approved by: ____________________  Date: __________
- [ ] Legal wording approved by: ____________________  Date: __________
- [ ] Accessibility review report attached/referenced: ____________________
- [ ] Public accessibility wording approved: ____________________
- [ ] Controlled internal deployment/flag activation separately approved: ____________________
- [ ] Etsy publication separately approved: ____________________

## Next approval after this packet

Once the founder, legal, and accessibility gates above are closed, the next bounded authorization should be:

> Approve a controlled production deployment with the Etsy admin and persistence flags enabled only for named internal operators. Keep real buyer intake, Etsy publication, uploads, messages, and delivery disabled.

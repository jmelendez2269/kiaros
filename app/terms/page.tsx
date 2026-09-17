import type { Metadata } from "next";

import { LegalDocument, type LegalNavigationItem } from "@/components/legal/LegalDocument";

const LEGAL_EMAIL = "legal@kairosplanner.xyz";
const SUPPORT_EMAIL = "support@kairosplanner.xyz";
const EFFECTIVE_DATE = "August 24, 2026";

export const metadata: Metadata = {
  title: "Terms of Use | Kiaros",
  description:
    "Terms for Kiaros accounts, personalized planning, reflective AI features, direct purchases, subscriptions, and standalone digital artifacts.",
};

const navigation = [
  { href: "#agreement", label: "Agreement and eligibility" },
  { href: "#accounts", label: "Accounts" },
  { href: "#service", label: "What Kiaros provides" },
  { href: "#advice", label: "Reflective use and AI" },
  { href: "#content", label: "Your content" },
  { href: "#payments", label: "Payments and subscriptions" },
  { href: "#artifacts", label: "Standalone artifacts" },
  { href: "#license", label: "License and acceptable use" },
  { href: "#availability", label: "Availability and third parties" },
  { href: "#disclaimers", label: "Disclaimers and liability" },
  { href: "#termination", label: "Termination and changes" },
  { href: "#contact", label: "Contact and disputes" },
] as const satisfies readonly LegalNavigationItem[];

export default function TermsPage() {
  return (
    <LegalDocument
      effectiveDate={EFFECTIVE_DATE}
      eyebrow="Terms"
      navigation={navigation}
      summary="These terms cover the Kiaros planner, reflective AI features, direct purchases and subscriptions, and complete standalone digital artifacts sold through a marketplace."
      title="Terms of use"
    >
      <section aria-labelledby="agreement-heading" id="agreement">
        <h2 id="agreement-heading">Agreement and eligibility</h2>
        <p className="mt-4">
          Kiaros is a Project Parallax product operated by Jeanine Melendez as an individual in North Carolina, United
          States, not through a separate business entity. By creating an account, purchasing directly, or using
          Kiaros, you agree to these Terms and the Privacy Policy. If you purchase a standalone Kiaros artifact through
          Etsy or another marketplace, that marketplace&apos;s terms also apply to the transaction.
        </p>
        <p className="mt-4">
          You must be at least 18 and legally able to enter a contract. If you do not agree, do not use the service.
        </p>
      </section>

      <section aria-labelledby="accounts-heading" id="accounts">
        <h2 id="accounts-heading">Accounts</h2>
        <p className="mt-4">
          Provide accurate information, keep credentials secure, and notify us of suspected unauthorized access. You
          are responsible for activity under your account. We may require identity or purchase verification before
          changing access or disclosing account information.
        </p>
        <p className="mt-4">
          A standalone artifact purchase does not include or require a Kiaros account, subscription, software
          entitlement, loyalty credit, Blueprint, journal, or Oracle access.
        </p>
      </section>

      <section aria-labelledby="service-heading" id="service">
        <h2 id="service-heading">What Kiaros provides</h2>
        <p className="mt-4">
          Kiaros provides personalized planning and reflection tools built from information you supply, versioned
          astronomical calculations, software rules, and AI-assisted drafting. Features can include a Blueprint,
          calendar, journal, trackers, reviews, curriculum, and Oracle conversations depending on your product and
          active access.
        </p>
        <p className="mt-4">
          Personalization depends on the completeness and accuracy of your inputs. Unknown birth time can limit or
          remove angle-, house-, and timing-dependent material.
        </p>
      </section>

      <section aria-labelledby="advice-heading" id="advice">
        <h2 id="advice-heading">Reflective use, astrology, and AI</h2>
        <p className="mt-4">
          Kiaros is for planning, creativity, and personal reflection. Astrology is presented as an interpretive
          framework, not a prediction, guarantee, diagnosis, or statement of fact about future outcomes. Kiaros does
          not provide medical, mental-health, legal, financial, employment, relationship, or other professional advice.
        </p>
        <p className="mt-4">
          AI-generated material may be incomplete, inaccurate, or unsuitable. Review important information yourself
          and consult a qualified professional for decisions requiring professional judgment. You remain responsible
          for decisions and actions taken after using Kiaros.
        </p>
      </section>

      <section aria-labelledby="content-heading" id="content">
        <h2 id="content-heading">Your content and instructions</h2>
        <p className="mt-4">
          You retain ownership of content you submit. You give Kiaros a limited, non-exclusive license to host,
          process, reproduce, and transform that content only as reasonably needed to provide, secure, support, and
          improve the features you request. You represent that you have the right to provide the content and that it
          does not violate law or another person&apos;s rights.
        </p>
        <p className="mt-4">
          Do not submit another person&apos;s birth data, private writing, or other personal information without their
          informed permission. Gifting a personalized artifact is not supported unless recipient-consent handling is
          expressly offered for that product.
        </p>
      </section>

      <section aria-labelledby="payments-heading" id="payments">
        <h2 id="payments-heading">Payments, subscriptions, and cancellation</h2>
        <p className="mt-4">
          Direct prices, billing periods, included access, and taxes are shown before checkout. Stripe processes direct
          payments. A subscription renews for the displayed period until canceled. Cancellation stops future renewal;
          access ordinarily continues through the paid period unless the checkout terms state otherwise.
        </p>
        <p className="mt-4">
          Except where required by law or expressly stated at checkout, completed subscription periods and consumed
          digital services are not prorated. Duplicate charges, failed fulfillment, or Kairos-caused defects should be
          reported promptly to <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>. Marketplace payments and
          refunds are handled through the marketplace&apos;s payment and case systems.
        </p>
      </section>

      <section aria-labelledby="artifacts-heading" id="artifacts">
        <h2 id="artifacts-heading">Standalone personalized artifacts</h2>
        <p className="mt-4">
          A listing for an Anchor Print or another standalone artifact includes only the files and specifications named
          in that listing. It is a complete digital product, not access to Kiaros software. Delivery and order
          communication remain on the marketplace where the transaction began.
        </p>
        <ul className="mt-4 list-disc">
          <li>Delivery is targeted within three business days after complete, unambiguous inputs; clarification pauses that clock.</li>
          <li>Cancellation, refund, or buyer-input correction is available before generation begins.</li>
          <li>Kairos-caused calculation, spelling, or file defects reported within 14 days will be corrected within two business days.</li>
          <li>Changed birth data or creative preferences after generation begins are new personalization, not a correction.</li>
          <li>A materially harmful Kairos-caused missed deadline is eligible for replacement or full refund.</li>
        </ul>
        <p className="mt-4">
          Buyer-provided details must be accurate. The listing controls whether unknown-time fulfillment is available
          and explains the resulting limits. Marketplace purchase protection and mandatory consumer rights remain
          unaffected.
        </p>
      </section>

      <section aria-labelledby="license-heading" id="license">
        <h2 id="license-heading">License, ownership, and acceptable use</h2>
        <p className="mt-4">
          Kiaros software, templates, calculations, visual systems, prompts, generated product structure, branding, and
          documentation are owned by Kiaros or its licensors. Subject to payment and these Terms, you receive a limited,
          personal, non-exclusive, non-transferable license to use the purchased service or artifact for personal use.
        </p>
        <p className="mt-4">You may not:</p>
        <ul className="mt-4 list-disc">
          <li>resell, sublicense, publish, scrape, or commercially exploit Kiaros output or source material;</li>
          <li>circumvent access, rate, payment, privacy, or security controls;</li>
          <li>reverse engineer the service except where law expressly permits it;</li>
          <li>use Kiaros to harm, impersonate, harass, defraud, or violate another person&apos;s rights; or</li>
          <li>upload malicious code or use automated access that disrupts the service.</li>
        </ul>
      </section>

      <section aria-labelledby="availability-heading" id="availability">
        <h2 id="availability-heading">Availability and third-party services</h2>
        <p className="mt-4">
          Features may change, pause, or be retired for maintenance, security, legal, provider, or product reasons. We
          do not promise uninterrupted availability or that every feature will remain unchanged. Authentication,
          hosting, payment, AI, email, database, and marketplace functions depend on third-party services and their
          terms.
        </p>
      </section>

      <section aria-labelledby="disclaimers-heading" id="disclaimers">
        <h2 id="disclaimers-heading">Disclaimers and limitation of liability</h2>
        <p className="mt-4">
          To the fullest extent permitted by law, Kiaros is provided &quot;as is&quot; and &quot;as available&quot; without warranties
          of uninterrupted operation, fitness for a particular purpose, or guaranteed outcomes. Nothing in these Terms
          excludes rights or liabilities that cannot legally be excluded.
        </p>
        <p className="mt-4">
          To the fullest extent permitted by law, Kiaros and Project Parallax will not be liable for indirect,
          incidental, special, consequential, or punitive damages, lost profits, or losses caused by decisions made in
          reliance on reflective or AI-generated content. For a paid claim that cannot legally be excluded, aggregate
          liability will not exceed the amount you paid Kiaros for the affected product during the 12 months before the
          event giving rise to the claim.
        </p>
      </section>

      <section aria-labelledby="termination-heading" id="termination">
        <h2 id="termination-heading">Termination and changes</h2>
        <p className="mt-4">
          You may stop using Kiaros at any time and cancel recurring billing through the available account or billing
          controls. We may suspend or terminate access for fraud, abuse, security risk, nonpayment, or material breach,
          using proportionate measures where practical. Provisions that by nature should survive—such as ownership,
          payment obligations, disclaimers, and liability limits—continue after termination.
        </p>
        <p className="mt-4">
          We may update these Terms. The effective date will change, and material updates will be communicated when
          required. Continued use after an update takes effect constitutes acceptance where permitted by law.
        </p>
      </section>

      <section aria-labelledby="contact-heading" id="contact">
        <h2 id="contact-heading">Contact and disputes</h2>
        <p className="mt-4">
          Contact <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a> first for product, billing, correction, or
          delivery issues. Send formal notices to <a href={`mailto:${LEGAL_EMAIL}`}>{LEGAL_EMAIL}</a>. We will try to
          resolve disputes informally and in good faith. These Terms do not override mandatory consumer protections or
          rights provided by the marketplace where you purchased.
        </p>
        <p className="mt-4">
          Unless mandatory consumer law requires otherwise, these Terms are governed by the laws of North Carolina,
          United States, without regard to conflict-of-law rules. Subject to those mandatory rights, disputes that
          cannot be resolved informally will be brought in an appropriate state or federal court in North Carolina.
        </p>
      </section>
    </LegalDocument>
  );
}

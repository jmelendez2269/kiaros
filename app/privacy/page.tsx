import type { Metadata } from "next";

import { LegalDocument, type LegalNavigationItem } from "@/components/legal/LegalDocument";

const PRIVACY_EMAIL = "privacy@kairosplanner.xyz";
const SUPPORT_EMAIL = "support@kairosplanner.xyz";
const EFFECTIVE_DATE = "August 24, 2026";

export const metadata: Metadata = {
  title: "Privacy Policy | Kiaros",
  description:
    "How Kiaros collects, uses, shares, retains, and protects account, birth, planning, journal, purchase, and artifact information.",
};

const navigation = [
  { href: "#scope", label: "Scope and contact" },
  { href: "#information", label: "Information we collect" },
  { href: "#uses", label: "How we use information" },
  { href: "#ai", label: "AI-assisted features" },
  { href: "#sharing", label: "Service providers and sharing" },
  { href: "#retention", label: "Retention" },
  { href: "#choices", label: "Your choices and rights" },
  { href: "#security", label: "Security and transfers" },
  { href: "#children", label: "Children" },
  { href: "#changes", label: "Changes and contact" },
] as const satisfies readonly LegalNavigationItem[];

export default function PrivacyPage() {
  return (
    <LegalDocument
      effectiveDate={EFFECTIVE_DATE}
      eyebrow="Privacy"
      navigation={navigation}
      summary="This policy explains what Kiaros handles when you use the planner, reflective AI features, direct checkout, support, or a standalone personalized artifact."
      title="Privacy, in plain language"
    >
      <section aria-labelledby="scope-heading" id="scope">
        <h2 id="scope-heading">Scope and contact</h2>
        <p className="mt-4">
          Kiaros is a Project Parallax product operated by Jeanine Melendez as an individual in North Carolina, United
          States, not through a separate business entity. For the processing described in this policy, Jeanine
          Melendez is the Kiaros data controller except where a service provider acts as a separate controller. This
          policy applies to the Kiaros website, account-based planner,
          direct purchases, support, and standalone personalized artifacts fulfilled by Kiaros. An order placed on a
          marketplace such as Etsy is also governed by that marketplace&apos;s privacy policy for the information it
          controls.
        </p>
        <p className="mt-4">
          Questions and privacy requests can be sent to <a href={`mailto:${PRIVACY_EMAIL}`}>{PRIVACY_EMAIL}</a>.
          Account, purchase, or delivery support can be sent to <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>.
        </p>
      </section>

      <section aria-labelledby="information-heading" id="information">
        <h2 id="information-heading">Information we collect</h2>
        <ul className="mt-4 list-disc">
          <li><strong className="text-bone">Account and contact data:</strong> name, email address, authentication identifiers, preferences, and support communications.</li>
          <li><strong className="text-bone">Birth and personalization data:</strong> birth date, birth time or unknown-time status, birth place, timezone provenance, chart calculations, goals, and optional display name.</li>
          <li><strong className="text-bone">Planner and reflective content:</strong> onboarding answers, life areas, goals, intentions, journal entries, reviews, prompts, Oracle conversations, and generated planning material.</li>
          <li><strong className="text-bone">Purchase and entitlement data:</strong> product, plan, price, transaction identifiers, subscription status, marketplace order references, fulfillment state, and refund or support history. Payment providers process full payment credentials; Kiaros does not store full card numbers.</li>
          <li><strong className="text-bone">Technical and usage data:</strong> device/browser information, timestamps, feature interactions, security signals, and limited analytics events. We design analytics events to exclude journal text, birth details, prompts, and generated content.</li>
        </ul>
      </section>

      <section aria-labelledby="uses-heading" id="uses">
        <h2 id="uses-heading">How we use information</h2>
        <p className="mt-4">We use information to:</p>
        <ul className="mt-4 list-disc">
          <li>create and secure accounts, provide purchased access, and operate the planner;</li>
          <li>calculate charts and generate requested plans, reflections, artifacts, and support corrections;</li>
          <li>process checkout, subscriptions, refunds, delivery, and marketplace order support;</li>
          <li>respond to requests, prevent abuse, debug failures, and maintain service reliability;</li>
          <li>measure product performance using limited event data; and</li>
          <li>comply with legal, tax, accounting, and marketplace obligations.</li>
        </ul>
        <p className="mt-4">
          Depending on where you live, these activities rely on performing a contract, your consent, legitimate
          interests in operating and securing the service, or compliance with law. We do not sell personal
          information or use it for cross-context behavioral advertising.
        </p>
      </section>

      <section aria-labelledby="ai-heading" id="ai">
        <h2 id="ai-heading">AI-assisted features</h2>
        <p className="mt-4">
          Kiaros uses automated calculations and AI-assisted drafting to create personalized planning and reflective
          material. When you request an AI feature, the information reasonably needed for that request may be sent to
          an AI service provider. This can include chart facts, goals, selected planner context, your prompt, and—only
          when the product&apos;s controls make it eligible—journal or reflective content.
        </p>
        <p className="mt-4">
          AI output can be incomplete or wrong. Do not enter information you do not want processed for the feature,
          and do not rely on Kiaros output as medical, mental-health, legal, financial, or other professional advice.
          Standalone artifacts may use AI-assisted drafting, but each order is structured and reviewed by Kiaros.
        </p>
      </section>

      <section aria-labelledby="sharing-heading" id="sharing">
        <h2 id="sharing-heading">Service providers and sharing</h2>
        <p className="mt-4">
          We share information only as needed to operate Kiaros, complete a transaction you requested, protect the
          service, or comply with law. Current categories include:
        </p>
        <ul className="mt-4 list-disc">
          <li><strong className="text-bone">Authentication:</strong> Clerk;</li>
          <li><strong className="text-bone">Database and private storage:</strong> Supabase;</li>
          <li><strong className="text-bone">Hosting and limited product analytics:</strong> Vercel;</li>
          <li><strong className="text-bone">Direct payment processing:</strong> Stripe;</li>
          <li><strong className="text-bone">AI processing:</strong> Anthropic and, where configured for an internal feature, Vercel AI infrastructure;</li>
          <li><strong className="text-bone">Transactional or support email:</strong> Resend and the applicable email provider; and</li>
          <li><strong className="text-bone">Marketplace orders:</strong> Etsy or another marketplace used by you.</li>
        </ul>
        <p className="mt-4">
          We may also disclose information during a business reorganization or when reasonably necessary to protect
          rights, safety, and legal compliance. We do not create a Kiaros account or marketing subscription from a
          standalone Etsy artifact order.
        </p>
      </section>

      <section aria-labelledby="retention-heading" id="retention">
        <h2 id="retention-heading">Retention</h2>
        <p className="mt-4">
          Account and planner information is retained while your account is active and afterward only as reasonably
          needed for service continuity, security, disputes, backups, and legal obligations. A deletion request does
          not require us to remove information that must be retained by law or that has been irreversibly de-identified.
        </p>
        <p className="mt-4">For a standalone personalized artifact, our operating schedule is:</p>
        <ul className="mt-4 list-disc">
          <li>raw personalization: delete within 30 days after delivery or case closure;</li>
          <li>normalized calculation data and generated file revisions: retain up to 180 days;</li>
          <li>support and correction correspondence: retain up to 12 months; and</li>
          <li>a birth-data-free minimal order ledger: retain for seven years or the legally required period.</li>
        </ul>
        <p className="mt-4">Legal holds, fraud prevention, open disputes, or tax requirements can pause deletion of the affected record.</p>
      </section>

      <section aria-labelledby="choices-heading" id="choices">
        <h2 id="choices-heading">Your choices and rights</h2>
        <p className="mt-4">
          You may ask to access, correct, export, or delete your information. Depending on your location, you may also
          have rights to restrict processing, object, withdraw consent, or appeal a decision. Send requests to <a href={`mailto:${PRIVACY_EMAIL}`}>{PRIVACY_EMAIL}</a>.
          We may verify your identity before acting and will respond within the period required by applicable law.
        </p>
        <p className="mt-4">
          You can manage account and journal controls in the product where available, unsubscribe from marketing using
          the message link, and control browser cookies through browser settings. Transactional and security messages
          may still be sent when necessary to provide the service.
        </p>
      </section>

      <section aria-labelledby="security-heading" id="security">
        <h2 id="security-heading">Security and international transfers</h2>
        <p className="mt-4">
          We use access controls, private storage, encryption provided by our infrastructure, and data-minimization
          practices appropriate to the service. No online system is perfectly secure, so we cannot guarantee absolute
          security. Providers may process information in countries other than your own and use lawful transfer
          safeguards where required.
        </p>
      </section>

      <section aria-labelledby="children-heading" id="children">
        <h2 id="children-heading">Children</h2>
        <p className="mt-4">
          Kiaros is intended for adults and is not directed to children under 18. Do not submit a child&apos;s birth or
          personal information. If you believe a child has provided information, contact us so we can investigate and
          remove it where appropriate.
        </p>
      </section>

      <section aria-labelledby="changes-heading" id="changes">
        <h2 id="changes-heading">Changes and contact</h2>
        <p className="mt-4">
          We may update this policy as Kiaros changes. The effective date will be revised, and material changes will be
          communicated when required. Contact <a href={`mailto:${PRIVACY_EMAIL}`}>{PRIVACY_EMAIL}</a> for privacy
          matters or <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a> for service support.
        </p>
      </section>
    </LegalDocument>
  );
}

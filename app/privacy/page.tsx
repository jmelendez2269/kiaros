import Link from "next/link";

const PRIVACY_EMAIL = "privacy@kairosplanner.xyz";
const SUPPORT_EMAIL = "support@kairosplanner.xyz";

export const metadata = {
  title: "Privacy | Kiaros",
  description: "Kiaros privacy contact and data request information.",
};

export default function PrivacyPage() {
  return (
    <div className="page-wrapper">
      <div className="container py-12 md:py-16">
        <section className="shell-panel-hero p-8 md:p-10">
          <p className="shell-kicker mb-4">Privacy</p>
          <h1 className="shell-hero-title max-w-3xl">Privacy questions and data requests</h1>
          <p className="shell-prose-lead mt-4 max-w-3xl">
            For privacy questions, account data requests, or concerns about how your information is
            handled in Kiaros, email{" "}
            <a className="text-bone transition-colors hover:text-leather-300" href={`mailto:${PRIVACY_EMAIL}`}>
              {PRIVACY_EMAIL}
            </a>
            .
          </p>
          <p className="mt-5 max-w-3xl text-sm leading-7 text-bone-muted">
            For account access, checkout, or activation support, use{" "}
            <a className="text-bone transition-colors hover:text-leather-300" href={`mailto:${SUPPORT_EMAIL}`}>
              {SUPPORT_EMAIL}
            </a>
            .
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/contact"
              className="inline-flex w-fit items-center rounded-full bg-leather-300 px-5 py-3 text-sm font-semibold text-stone-950 transition-opacity hover:opacity-90"
            >
              Contact Kiaros
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}

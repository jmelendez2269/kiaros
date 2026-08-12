import { Mail } from "lucide-react";

const CONTACT_EMAILS = [
  {
    label: "Support",
    email: "support@kairosplanner.xyz",
    body: "Account, checkout, planner access, and legacy marketplace-order help.",
  },
  {
    label: "Privacy",
    email: "privacy@kairosplanner.xyz",
    body: "Privacy questions, data requests, and account data concerns.",
  },
  {
    label: "Legal",
    email: "legal@kairosplanner.xyz",
    body: "Terms, policy, and other formal notices.",
  },
] as const;

export const metadata = {
  title: "Contact | Kairos",
  description: "Reach Kairos support for account, planner, checkout, or legacy marketplace-order help.",
};

export default function ContactPage() {
  return (
    <div className="page-wrapper">
      <div className="container py-12 md:py-16">
        <section className="shell-panel-hero p-8 md:p-10">
          <p className="shell-kicker mb-4">Contact</p>
          <h1 className="shell-hero-title max-w-3xl">Need help with Kairos?</h1>
          <p className="shell-prose-lead mt-4 max-w-3xl">
            For account questions, checkout issues, legacy marketplace-order help, or anything
            that feels stuck, send a note and we&apos;ll help you get settled.
          </p>

          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {CONTACT_EMAILS.map((item) => (
              <a
                key={item.email}
                href={`mailto:${item.email}`}
                className="shell-panel-soft block p-5 transition-colors hover:border-leather-300/45"
              >
                <span className="flex items-center gap-2 text-sm font-semibold text-bone">
                  <Mail className="h-4 w-4 text-leather-300" aria-hidden />
                  {item.label}
                </span>
                <span className="mt-3 block text-sm text-leather-200">{item.email}</span>
                <span className="mt-2 block text-sm leading-6 text-bone-muted">{item.body}</span>
              </a>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

import { OnboardingProgressBar } from "./_components/progress-bar";
import { BRAND } from "@/lib/brand";

export default async function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="page-wrapper flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-3xl">
        <div className="mb-10 text-center">
          <p className="shell-kicker mb-3">Setting up {BRAND.product}</p>
          <h1 className="font-serif text-4xl text-bone md:text-5xl">Build your timing system.</h1>
          <p className="mx-auto mt-3 max-w-2xl text-base leading-7 text-bone-muted">
            This planner is meant to be personal. These next steps help {BRAND.product} learn your
            timing, your focus, and what this season of life is asking of you.
          </p>
          <OnboardingProgressBar />
        </div>

        <div className="shell-panel px-6 py-8 md:px-8">{children}</div>

        <div className="mt-6 text-center text-sm text-bone-muted">
          <p>You can refine these layers later as the system evolves with you.</p>
        </div>
      </div>
    </div>
  );
}

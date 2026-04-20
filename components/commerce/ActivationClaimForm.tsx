"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useMemo, useState } from "react";

type ClaimResponse = {
  success: true;
  claimToken: string;
  signUpUrl: string;
  signInUrl: string;
  entitlementPreview: {
    plannerYear: number;
    productTier: string;
    oracleEnabled: boolean;
  };
} | {
  success: false;
  error: string;
};

type CompleteResponse = {
  success: true;
  entitlement: {
    plannerYear: number;
    productTier: string;
    oracleEnabled: boolean;
  };
} | {
  success: false;
  error: string;
};

type EntitlementPreview = {
  plannerYear: number;
  productTier: string;
  oracleEnabled: boolean;
};

interface Props {
  initialClaimToken?: string;
  isSignedIn: boolean;
}

export function ActivationClaimForm({ initialClaimToken, isSignedIn }: Props) {
  const router = useRouter();
  const [orderNumber, setOrderNumber] = useState("");
  const [email, setEmail] = useState("");
  const [claimToken, setClaimToken] = useState(initialClaimToken ?? "");
  const [preview, setPreview] = useState<EntitlementPreview | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [completionMessage, setCompletionMessage] = useState<string | null>(null);

  const claimReady = useMemo(() => claimToken.length > 0, [claimToken]);

  async function handleVerifyPurchase(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setCompletionMessage(null);
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/activate/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderNumber, email }),
      });

      const payload = (await response.json()) as ClaimResponse;
      if (!response.ok || !payload.success) {
        setError(payload.success ? "Unable to verify this purchase yet." : payload.error);
        return;
      }

      setClaimToken(payload.claimToken);
      setPreview(payload.entitlementPreview);
      router.replace(`/activate?claim=${payload.claimToken}`);
    } catch {
      setError("Something went wrong while verifying your purchase. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleFinishActivation() {
    if (!claimToken) return;

    setError(null);
    setCompletionMessage(null);
    setIsCompleting(true);

    try {
      const response = await fetch("/api/activate/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ claimToken }),
      });

      const payload = (await response.json()) as CompleteResponse;
      if (!response.ok || !payload.success) {
        setError(payload.success ? "Unable to finish activation yet." : payload.error);
        return;
      }

      setPreview(payload.entitlement);
      setCompletionMessage("Your Kiaros access is now live. You can move into onboarding whenever you're ready.");
      router.replace("/onboarding");
    } catch {
      setError("Something went wrong while finishing activation. Please try again.");
    } finally {
      setIsCompleting(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
      <section className="shell-panel-hero p-8 md:p-10">
        <p className="shell-kicker mb-4">Etsy Activation</p>
        <h1 className="shell-hero-title max-w-2xl">Unlock your Kiaros planner</h1>
        <p className="shell-prose-lead mt-4">
          Your Etsy purchase includes full access to Kiaros. Verify your order below, then create your
          account to begin with a planner experience that starts from where you are now.
        </p>

        {!claimReady ? (
          <form className="mt-8 grid gap-4 max-w-xl" onSubmit={handleVerifyPurchase}>
            <label className="grid gap-2 text-sm text-bone-muted">
              <span className="font-medium text-bone">Etsy order number</span>
              <input
                className="rounded-2xl border border-border/80 bg-stone-950/70 px-4 py-3 text-bone outline-none ring-0 placeholder:text-bone-muted/45"
                placeholder="Example: 1234567890"
                value={orderNumber}
                onChange={(event) => setOrderNumber(event.target.value)}
              />
            </label>
            <label className="grid gap-2 text-sm text-bone-muted">
              <span className="font-medium text-bone">Email used for purchase</span>
              <input
                className="rounded-2xl border border-border/80 bg-stone-950/70 px-4 py-3 text-bone outline-none ring-0 placeholder:text-bone-muted/45"
                placeholder="you@example.com"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </label>
            <button
              className="inline-flex w-fit items-center rounded-full bg-leather-300 px-5 py-3 text-sm font-semibold text-stone-950 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={isSubmitting}
              type="submit"
            >
              {isSubmitting ? "Verifying..." : "Verify purchase"}
            </button>
          </form>
        ) : (
          <div className="mt-8 space-y-5">
            <div className="shell-panel-soft p-5">
              <p className="shell-eyebrow">Purchase verified</p>
              <h2 className="shell-subsection-title mt-2">Your Etsy purchase has been confirmed.</h2>
              <p className="mt-3 text-sm leading-7 text-bone-muted">
                Next, create your Kiaros account to activate your planner and begin onboarding.
              </p>
            </div>

            {!isSignedIn ? (
              <div className="flex flex-wrap gap-3">
                <Link
                  href="/sign-up"
                  className="inline-flex items-center rounded-full bg-leather-300 px-5 py-3 text-sm font-semibold text-stone-950"
                >
                  Create account
                </Link>
                <Link
                  href="/sign-in"
                  className="inline-flex items-center rounded-full border border-border/80 px-5 py-3 text-sm font-semibold text-bone"
                >
                  Sign in
                </Link>
              </div>
            ) : (
              <button
                className="inline-flex items-center rounded-full bg-leather-300 px-5 py-3 text-sm font-semibold text-stone-950 disabled:cursor-not-allowed disabled:opacity-50"
                disabled={isCompleting}
                onClick={handleFinishActivation}
                type="button"
              >
                {isCompleting ? "Finishing..." : "Finish activation"}
              </button>
            )}
          </div>
        )}

        {error ? (
          <p className="mt-5 rounded-2xl border border-red-500/30 bg-red-950/20 px-4 py-3 text-sm text-red-200">
            {error}
          </p>
        ) : null}

        {completionMessage ? (
          <p className="mt-5 rounded-2xl border border-moss-500/30 bg-moss-500/10 px-4 py-3 text-sm text-moss-200">
            {completionMessage}
          </p>
        ) : null}
      </section>

      <aside className="grid gap-5">
        <section className="shell-panel p-6">
          <p className="shell-eyebrow">What is included</p>
          <ul className="mt-4 space-y-3 text-sm leading-7 text-bone-muted">
            <li>Full access is included with your Etsy purchase.</li>
            <li>Your planner begins from your current season in the year.</li>
            <li>Your wider annual context remains available as you move through the rest of the year.</li>
          </ul>
        </section>

        <section className="shell-panel p-6">
          <p className="shell-eyebrow">Loyalty reward</p>
          <p className="mt-4 text-sm leading-7 text-bone-muted">
            After activation, we will link a loyalty reward for next year&apos;s planner to your Kiaros
            account email. This will be delivered through checkout when that planner becomes available.
          </p>
        </section>

        {preview ? (
          <section className="shell-panel p-6">
            <p className="shell-eyebrow">Access preview</p>
            <div className="mt-4 space-y-2 text-sm leading-7 text-bone-muted">
              <p>
                Planner year: <span className="text-bone">{preview.plannerYear}</span>
              </p>
              <p>
                Tier: <span className="text-bone">{preview.productTier}</span>
              </p>
              <p>
                Oracle included: <span className="text-bone">{preview.oracleEnabled ? "Yes" : "No"}</span>
              </p>
            </div>
          </section>
        ) : null}
      </aside>
    </div>
  );
}

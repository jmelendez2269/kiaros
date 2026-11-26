"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";

import { BRAND } from "@/lib/brand";

interface Props {
  code: string | null;
  isSignedIn: boolean;
  /** The gift can still be redeemed. False shows the code form instead. */
  redeemable: boolean;
}

type RedeemData = {
  tierName: string;
  oracleEnabled: boolean;
  startsAt: string;
  endsAt: string;
  startsLater: boolean;
  isReturningMember: boolean;
  profileSetupComplete: boolean;
};

type RedeemResponse = { success: true; data: RedeemData } | { success: false; error: string };

function formatDate(iso: string) {
  return new Date(`${iso}T12:00:00Z`).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function GiftRedeemPanel({ code, isSignedIn, redeemable }: Props) {
  const [typedCode, setTypedCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);
  const [result, setResult] = useState<RedeemData | null>(null);

  async function redeem() {
    if (!code) return;
    setError(null);
    setIsPending(true);
    try {
      const response = await fetch("/api/gift/redeem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const payload = (await response.json().catch(() => null)) as RedeemResponse | null;
      if (!response.ok || !payload?.success) {
        setError(payload && !payload.success ? payload.error : "We couldn't add your gift yet. Please try again.");
        return;
      }
      setResult(payload.data);
    } catch {
      setError("We couldn't add your gift yet. Please try again.");
    } finally {
      setIsPending(false);
    }
  }

  function openTypedCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = typedCode.trim();
    if (!value) return;
    window.location.assign(`/gift/redeem?code=${encodeURIComponent(value)}`);
  }

  if (result) {
    const next = result.isReturningMember
      ? { href: "/today", label: "Go to today" }
      : result.profileSetupComplete
        ? { href: "/onboarding/tradition", label: "Add my Life Areas and Goals" }
        : { href: "/onboarding", label: "Begin with my chart" };
    return (
      <div className="grid gap-4">
        <div className="rounded-[1.1rem] border border-moss-500/30 bg-moss-500/10 px-5 py-4 text-sm leading-7 text-moss-200">
          {result.startsLater
            ? `Your gift year of ${result.tierName} is saved. It starts on ${formatDate(result.startsAt)}, right after your current year, and runs through ${formatDate(result.endsAt)}.`
            : `Your year of ${result.tierName} has begun. It runs through ${formatDate(result.endsAt)}.`}
        </div>
        <Link
          href={next.href}
          className="inline-flex w-fit items-center rounded-full bg-leather-300 px-5 py-3 text-sm font-semibold text-stone-950"
        >
          {next.label}
        </Link>
      </div>
    );
  }

  if (!code || !redeemable) {
    return (
      <form className="grid max-w-xl gap-3" onSubmit={openTypedCode}>
        <label className="grid gap-2 text-sm text-bone-muted">
          <span className="font-medium text-bone">Gift code</span>
          <input
            className="rounded-2xl border border-border/80 bg-stone-950/70 px-4 py-3 font-mono uppercase tracking-[0.1em] text-bone outline-none placeholder:normal-case placeholder:tracking-normal placeholder:text-bone-muted/45"
            placeholder="KAIROS-XXXX-XXXX-XXXX"
            value={typedCode}
            onChange={(event) => setTypedCode(event.target.value)}
            autoComplete="off"
          />
        </label>
        <button
          type="submit"
          className="inline-flex w-fit items-center rounded-full bg-leather-300 px-5 py-3 text-sm font-semibold text-stone-950"
        >
          Open my gift
        </button>
      </form>
    );
  }

  const returnTo = `/gift/redeem?code=${encodeURIComponent(code)}`;

  return (
    <div className="grid gap-4">
      {isSignedIn ? (
        <button
          type="button"
          onClick={redeem}
          disabled={isPending}
          className="inline-flex w-fit items-center rounded-full bg-leather-300 px-5 py-3 text-sm font-semibold text-stone-950 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isPending ? "Adding your gift..." : "Add this gift to my account"}
        </button>
      ) : (
        <>
          <p className="text-sm leading-7 text-bone-muted">
            Make a free {BRAND.product} account to open it. You&apos;ll come right back here.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link
              href={`/sign-up?redirect_url=${encodeURIComponent(returnTo)}`}
              className="inline-flex items-center rounded-full bg-leather-300 px-5 py-3 text-sm font-semibold text-stone-950"
            >
              Create my account
            </Link>
            <Link
              href={`/sign-in?redirect_url=${encodeURIComponent(returnTo)}`}
              className="inline-flex items-center rounded-full border border-border/80 px-5 py-3 text-sm font-semibold text-bone"
            >
              I already have one
            </Link>
          </div>
        </>
      )}
      {error ? (
        <p className="rounded-2xl border border-red-500/30 bg-red-950/20 px-4 py-3 text-sm text-red-200">{error}</p>
      ) : null}
    </div>
  );
}

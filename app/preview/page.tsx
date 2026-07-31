import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import Link from "next/link";

import { createAdminSupabase } from "@/lib/supabase/admin";
import { CheckoutButton } from "@/components/commerce/CheckoutButton";
import { COMMERCE_TIERS, formatUsd } from "@/lib/commerce/config";
import type { WeekPreviewContent } from "@/types/preview";

export const dynamic = "force-dynamic";

const ENERGY_LABELS = {
  push: "An opening",
  rest: "Room to soften",
  reflect: "A reflective current",
  initiate: "A beginning",
} as const;

export default async function PreviewPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const admin = createAdminSupabase();
  const { data: profile } = await admin
    .from("user_profiles")
    .select("id, display_name")
    .eq("clerk_user_id", userId)
    .maybeSingle();

  if (!profile?.id) redirect("/onboarding");

  const [{ data: preview }, { data: previewAccess }] = await Promise.all([
    admin
      .from("week_previews")
      .select("status, content, start_date, end_date")
      .eq("user_id", profile.id)
      .maybeSingle(),
    admin
      .from("preview_access")
      .select("expires_at, status")
      .eq("user_id", profile.id)
      .maybeSingle(),
  ]);

  if (!preview || preview.status === "generating") redirect("/onboarding/generating-week");
  if (preview.status !== "ready" || !preview.content) redirect("/onboarding/generating-week");

  const content = preview.content as unknown as WeekPreviewContent;
  const expiresAt = previewAccess?.expires_at ? new Date(previewAccess.expires_at) : null;
  const remainingDays = expiresAt
    ? Math.max(0, Math.ceil((expiresAt.getTime() - Date.now()) / 86_400_000))
    : 0;

  return (
    <main className="min-h-screen bg-almanac-bg text-almanac-ink">
      <header className="border-b border-almanac-line">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-5 md:px-8">
          <Link href="/" className="font-almanac-display tracking-[0.08em] text-almanac-ink">
            KAIROS
          </Link>
          <div className="text-right">
            <p className="font-almanac-mono text-[0.62rem] uppercase tracking-[0.16em] text-almanac-ink-soft">
              Free personal week
            </p>
            <p className="mt-1 text-sm text-almanac-ink-dim">
              {remainingDays > 0 ? `${remainingDays} day${remainingDays === 1 ? "" : "s"} remaining` : "Preview complete"}
            </p>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-5 py-12 md:px-8 md:py-16">
        <section className="max-w-3xl">
          <p className="font-almanac-mono text-[0.7rem] uppercase tracking-[0.24em] text-almanac-copper-hi">
            {preview.start_date} — {preview.end_date}
          </p>
          <h1 className="mt-5 font-almanac-serif text-4xl italic leading-tight text-almanac-ink md:text-6xl">
            {content.weekTheme}
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-almanac-ink-dim">
            {content.weekSummary}
          </p>
        </section>

        <section className="mt-12 grid gap-3 md:grid-cols-7">
          {content.days.map((day) => (
            <article
              key={day.date}
              className="min-h-[230px] rounded-2xl border border-almanac-line-hi bg-almanac-bg2/70 p-4"
            >
              <p className="font-almanac-mono text-[0.62rem] uppercase tracking-[0.15em] text-almanac-copper-hi">
                {day.dayName}
              </p>
              <p className="mt-4 font-almanac-serif text-xl italic text-almanac-ink">{day.title}</p>
              <p className="mt-3 text-sm leading-6 text-almanac-ink-dim">{day.invitation}</p>
              <div className="mt-5 border-t border-almanac-line pt-4">
                <p className="font-almanac-mono text-[0.6rem] uppercase tracking-[0.12em] text-almanac-ink-soft">
                  {ENERGY_LABELS[day.energyType]}
                </p>
                <p className="mt-2 text-xs leading-5 text-almanac-ink-soft">{day.skyNote}</p>
              </div>
            </article>
          ))}
        </section>

        <section className="mt-8 grid gap-5 md:grid-cols-2">
          <article className="rounded-2xl border border-almanac-line-hi bg-almanac-bg2/50 p-6">
            <p className="font-almanac-mono text-[0.65rem] uppercase tracking-[0.16em] text-almanac-copper-hi">
              Invitations for the week
            </p>
            <ul className="mt-5 space-y-3">
              {content.intentions.map((intention) => (
                <li key={intention} className="flex gap-3 text-sm leading-6 text-almanac-ink-dim">
                  <span aria-hidden className="text-almanac-copper">✦</span>
                  {intention}
                </li>
              ))}
            </ul>
          </article>
          <article className="rounded-2xl border border-almanac-line-hi bg-[rgba(112,75,210,0.1)] p-6">
            <p className="font-almanac-mono text-[0.65rem] uppercase tracking-[0.16em] text-almanac-copper-hi">
              A question to carry
            </p>
            <p className="mt-5 font-almanac-serif text-2xl italic leading-9 text-almanac-ink">
              {content.reflectionPrompt}
            </p>
          </article>
        </section>

        <section className="mt-16 border-t border-almanac-line pt-12">
          <div className="max-w-3xl">
            <p className="font-almanac-mono text-[0.7rem] uppercase tracking-[0.24em] text-almanac-copper-hi">
              One week is a beginning
            </p>
            <h2 className="mt-4 font-almanac-serif text-4xl italic text-almanac-ink md:text-5xl">
              The full year reveals the larger pattern.
            </h2>
            <p className="mt-5 text-base leading-7 text-almanac-ink-dim">
              Unlock today to see all 52 weeks, twelve monthly arcs, four quarterly chapters,
              timing windows, the complete planner, and—if you choose Oracle—Stelloquy in conversation
              with the whole system.
            </p>
          </div>

          <div className="mt-9 grid gap-5 lg:grid-cols-2">
            {COMMERCE_TIERS.map((tier) => (
              <article
                key={tier.key}
                className={`rounded-2xl border p-6 ${
                  tier.oracleEnabled
                    ? "border-almanac-copper/50 bg-[rgba(112,75,210,0.12)]"
                    : "border-almanac-line-hi bg-almanac-bg2/60"
                }`}
              >
                <p className="font-almanac-mono text-[0.65rem] uppercase tracking-[0.14em] text-almanac-copper-hi">
                  {tier.oracleEnabled ? "Complete Kairos experience" : "The complete planner"}
                </p>
                <h3 className="mt-3 font-almanac-serif text-2xl text-almanac-ink">{tier.name}</h3>
                <p className="mt-3 text-sm leading-6 text-almanac-ink-dim">{tier.tagline}</p>
                <p className="mt-5 text-sm text-almanac-ink-soft">
                  <strong className="font-almanac-display text-3xl text-almanac-ink">
                    {formatUsd(tier.monthlyPriceCents)}
                  </strong>{" "}
                  /month · {formatUsd(tier.annualPriceCents)}/year
                </p>
                <div className="mt-6 flex flex-wrap gap-3">
                  <CheckoutButton
                    tierKey={tier.key}
                    accessPlan="yearly"
                    label={tier.oracleEnabled ? "Unlock my year + Stelloquy" : "Unlock my full year"}
                    className="min-h-11 rounded-full bg-almanac-kairos-hi px-5 text-sm font-semibold text-almanac-midnight disabled:opacity-60"
                  />
                  <CheckoutButton
                    tierKey={tier.key}
                    accessPlan="monthly"
                    label="Choose monthly"
                    className="min-h-11 rounded-full border border-almanac-line-hi px-5 text-sm font-semibold text-almanac-ink disabled:opacity-60"
                  />
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}

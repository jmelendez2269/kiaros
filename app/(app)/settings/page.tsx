"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useTransition } from "react";
import { CalendarDays, MessageCircle, Palette, Sparkles, UserRound } from "lucide-react";
import { ThemePicker } from "@/components/shared/ThemePicker";
import { THEMES, type ThemeId } from "@/lib/constants";
import { startTour } from "@/lib/tour/config";
import { TRADITION_HOUSE_DEFAULTS, type HouseSystem, type Tradition } from "@/types/blueprint";
import { BRAND } from "@/lib/brand";

const COOKIE_NAME = "kiaros-theme";

type SettingsProfile = {
  display_name: string | null;
  theme: ThemeId | null;
  birth_date: string | null;
  birth_time: string | null;
  birth_time_unknown: boolean | null;
  birth_city: string | null;
  birth_tz: string | null;
  planner_lat: number | null;
  planner_lng: number | null;
  planner_tz: string | null;
  plan_year: number | null;
  word_of_year: string | null;
  year_vision: string | null;
  what_to_release: string | null;
  study_focus: string | null;
  tradition: Tradition | null;
  house_system: HouseSystem | null;
};

type SettingsState = {
  display_name: string;
  theme: ThemeId;
  birth_date: string;
  birth_time: string;
  birth_time_unknown: boolean;
  birth_city: string;
  birth_tz: string;
  planner_lat: string;
  planner_lng: string;
  planner_tz: string;
  plan_year: string;
  year_vision: string;
  what_to_release: string;
  study_focus: string;
  tradition: Tradition | null;
  house_system: HouseSystem | null;
};

const TRADITION_LABELS: Record<Tradition, string> = {
  evolutionary: "Evolutionary",
  karmic: "Karmic",
  psychological: "Psychological",
  traditional: "Traditional / Hellenistic",
  synthesis: "Synthesis",
};

const TRADITION_DESCRIPTIONS: Record<Tradition, string> = {
  evolutionary: "Soul growth and evolutionary purpose through Pluto, the South Node, and lifelong themes.",
  karmic: "Karma, dharma, and the soul's contracts — Saturn, the nodes, and past-life patterns.",
  psychological: "Jungian archetypes, shadow work, and the inner landscape of your chart.",
  traditional: "Hellenistic roots — sect, essential dignities, time lords, and ancient timing methods.",
  synthesis: "A bit of everything — weaving all four lenses based on what each chart placement calls for.",
};

const HOUSE_SYSTEM_LABELS: Record<HouseSystem, string> = {
  whole_sign: "Whole Sign",
  porphyry: "Porphyry",
  placidus: "Placidus",
};

function applyTheme(theme: ThemeId) {
  document.documentElement.dataset.theme = theme;
  document.cookie = `${COOKIE_NAME}=${theme}; path=/; max-age=${60 * 60 * 24 * 365}; SameSite=Lax`;
}

function buildInitialState(profile?: SettingsProfile | null): SettingsState {
  return {
    display_name: profile?.display_name ?? "",
    theme: profile?.theme ?? "obsidian",
    birth_date: profile?.birth_date ?? "",
    birth_time: profile?.birth_time ?? "",
    birth_time_unknown: profile?.birth_time_unknown ?? false,
    birth_city: profile?.birth_city ?? "",
    birth_tz: profile?.birth_tz ?? "",
    planner_lat: profile?.planner_lat != null ? String(profile.planner_lat) : "",
    planner_lng: profile?.planner_lng != null ? String(profile.planner_lng) : "",
    planner_tz: profile?.planner_tz ?? "",
    plan_year: profile?.plan_year ? String(profile.plan_year) : String(new Date().getFullYear()),
    year_vision: profile?.year_vision ?? "",
    what_to_release: profile?.what_to_release ?? "",
    study_focus: profile?.study_focus ?? "",
    tradition: profile?.tradition ?? null,
    house_system: profile?.house_system ?? null,
  };
}

export default function SettingsPage() {
  const fallbackTheme = (() => {
    if (typeof document === "undefined") return "obsidian";
    return (document.documentElement.dataset.theme as ThemeId) ?? "obsidian";
  })();

  const [profile, setProfile] = useState<SettingsProfile | null>(null);
  const [form, setForm] = useState<SettingsState>(() => buildInitialState({ theme: fallbackTheme } as SettingsProfile));
  const [hydrated, setHydrated] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [billingError, setBillingError] = useState<string | null>(null);
  const [isBillingPending, setIsBillingPending] = useState(false);
  const [oracleUsage, setOracleUsage] = useState<{
    messageCount: number;
    limit: number;
    remaining: number;
    cacheHitRate: number;
  } | null>(null);

  useEffect(() => {
    let cancelled = false;

    const loadProfile = async () => {
      try {
        setLoadError(null);
        const res = await fetch("/api/profile", { cache: "no-store" });
        if (!res.ok) throw new Error("Unable to load settings.");

        const data = await res.json();
        if (cancelled) return;

        const nextProfile = (data.profile ?? null) as SettingsProfile | null;
        setProfile(nextProfile);
        setForm(buildInitialState(nextProfile ?? ({ theme: fallbackTheme } as SettingsProfile)));
        if (nextProfile?.theme) applyTheme(nextProfile.theme);
      } catch (error) {
        if (cancelled) return;
        setLoadError(error instanceof Error ? error.message : "Unable to load settings.");
        setForm(buildInitialState({ theme: fallbackTheme } as SettingsProfile));
      } finally {
        if (!cancelled) setHydrated(true);
      }
    };

    const loadUsage = async () => {
      try {
        const res = await fetch("/api/usage", { cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json();
        if (cancelled) return;
        if (data?.oracle) setOracleUsage(data.oracle);
      } catch {
        // Non-fatal; usage panel simply stays hidden.
      }
    };

    loadProfile();
    loadUsage();
    return () => {
      cancelled = true;
    };
  }, [fallbackTheme]);

  const selectedTheme = useMemo(
    () => THEMES.find((theme) => theme.id === form.theme) ?? THEMES[0],
    [form.theme]
  );

  const setField = <K extends keyof SettingsState>(key: K, value: SettingsState[K]) => {
    setSaved(false);
    setForm((current) => ({ ...current, [key]: value }));
  };

  const handleThemeChange = (theme: ThemeId) => {
    setField("theme", theme);
    applyTheme(theme);
  };

  const handleTraditionChange = (tradition: Tradition) => {
    setForm((current) => ({
      ...current,
      tradition,
      house_system: TRADITION_HOUSE_DEFAULTS[tradition],
    }));
    setSaved(false);
  };

  const handleSave = () => {
    startTransition(async () => {
      setSaved(false);

      const payload = {
        display_name: form.display_name.trim() || null,
        theme: form.theme,
        birth_date: form.birth_date || null,
        birth_time: form.birth_time_unknown ? null : form.birth_time || null,
        birth_time_unknown: form.birth_time_unknown,
        birth_city: form.birth_city.trim() || null,
        birth_tz: form.birth_tz.trim() || null,
        planner_lat: form.planner_lat ? Number.parseFloat(form.planner_lat) : null,
        planner_lng: form.planner_lng ? Number.parseFloat(form.planner_lng) : null,
        planner_tz: form.planner_tz.trim() || null,
        plan_year: Number.parseInt(form.plan_year, 10) || new Date().getFullYear(),
        year_vision: form.year_vision.trim() || null,
        what_to_release: form.what_to_release.trim() || null,
        study_focus: form.study_focus.trim() || null,
        tradition: form.tradition,
        house_system: form.house_system,
      };

      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setSaved(true);
        setProfile((current) => ({
          ...(current ?? {
            word_of_year: null,
          }),
          ...payload,
        }));
      }
    });
  };

  const handleBillingPortal = async () => {
    setBillingError(null);
    setIsBillingPending(true);

    try {
      const res = await fetch("/api/commerce/portal", { method: "POST" });
      const payload = (await res.json()) as { url?: string; error?: string };

      if (!res.ok || !payload.url) {
        setBillingError(payload.error ?? "Billing management is not available yet.");
        return;
      }

      window.location.assign(payload.url);
    } catch {
      setBillingError("Billing management is not available yet.");
    } finally {
      setIsBillingPending(false);
    }
  };

  const astrologicalWord = profile?.word_of_year;

  return (
    <div className="mx-auto max-w-5xl space-y-8 px-4 py-8 md:px-8">
      <section className="shell-panel px-6 py-6 md:px-8">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <p className="shell-kicker mb-3">Settings</p>
            <h1 className="shell-section-title text-[2rem] md:text-[2.25rem]">Personalize your planner</h1>
            <p className="mt-3 text-sm leading-7 text-bone-muted">
              Adjust the way {BRAND.product} looks, what it centers, and the birth details it uses to generate your timing layer.
            </p>
          </div>

          <div className="grid gap-2 sm:grid-cols-3">
            <div className="rounded-[1rem] border border-border/70 bg-stone-950/55 px-4 py-3">
              <p className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-bone-muted/70">Theme</p>
              <p className="mt-2 text-sm font-medium text-bone">{selectedTheme.name}</p>
            </div>
            <div className="rounded-[1rem] border border-border/70 bg-stone-950/55 px-4 py-3">
              <p className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-bone-muted/70">Plan year</p>
              <p className="mt-2 text-sm font-medium text-bone">{form.plan_year}</p>
            </div>
            <div className="rounded-[1rem] border border-border/70 bg-stone-950/55 px-4 py-3">
              <p className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-bone-muted/70">Word of year</p>
              <p className="mt-2 text-sm font-medium text-bone">{astrologicalWord || "Calculated from your chart"}</p>
            </div>
          </div>
        </div>
      </section>

      {loadError ? (
        <div className="rounded-[1rem] border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-bone">
          {loadError}
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <section className="shell-panel px-6 py-6 md:px-8">
          <div className="mb-5 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-leather-400/30 bg-leather-500/12 text-leather-200">
              <Palette size={18} />
            </div>
            <div>
              <p className="shell-kicker">Appearance</p>
              <h2 className="shell-subsection-title mt-1">Visual theme</h2>
            </div>
          </div>

          <ThemePicker value={form.theme} onChange={handleThemeChange} />

          <div className="mt-5 rounded-[1rem] border border-border/60 bg-stone-950/50 px-4 py-4">
            <p className="text-sm leading-7 text-bone-muted">
              <span className="font-medium text-bone">{selectedTheme.name} — </span>
              {selectedTheme.description}
            </p>
          </div>
        </section>

        <section className="shell-panel px-6 py-6 md:px-8">
          <div className="mb-5 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-plum-400/30 bg-plum-400/12 text-plum-300">
              <Sparkles size={18} />
            </div>
            <div>
              <p className="shell-kicker">Planner layer</p>
              <h2 className="shell-subsection-title mt-1">Year direction</h2>
            </div>
          </div>

          <div className="space-y-4">
            <label className="block space-y-2">
              <span className="text-sm font-medium text-bone">Plan year</span>
              <input
                type="number"
                min={2024}
                max={2100}
                value={form.plan_year}
                onChange={(event) => setField("plan_year", event.target.value)}
                className="w-full rounded-xl border border-border/80 bg-stone-950/70 px-4 py-3 text-bone focus:outline-none focus:ring-2 focus:ring-leather-400"
              />
            </label>

            <label className="block space-y-2">
              <span className="text-sm font-medium text-bone">Year vision</span>
              <textarea
                rows={4}
                value={form.year_vision}
                onChange={(event) => setField("year_vision", event.target.value)}
                placeholder="What are you building this year?"
                className="w-full rounded-xl border border-border/80 bg-stone-950/70 px-4 py-3 text-bone placeholder:text-bone-muted/45 focus:outline-none focus:ring-2 focus:ring-leather-400"
              />
            </label>

            <label className="block space-y-2">
              <span className="text-sm font-medium text-bone">Release theme</span>
              <textarea
                rows={3}
                value={form.what_to_release}
                onChange={(event) => setField("what_to_release", event.target.value)}
                placeholder="What are you intentionally leaving behind?"
                className="w-full rounded-xl border border-border/80 bg-stone-950/70 px-4 py-3 text-bone placeholder:text-bone-muted/45 focus:outline-none focus:ring-2 focus:ring-leather-400"
              />
            </label>

            <label className="block space-y-2">
              <span className="text-sm font-medium text-bone">Study focus</span>
              <textarea
                rows={3}
                value={form.study_focus}
                onChange={(event) => setField("study_focus", event.target.value)}
                placeholder={`Books, topics, skills, or tracks you want ${BRAND.product} to support`}
                className="w-full rounded-xl border border-border/80 bg-stone-950/70 px-4 py-3 text-bone placeholder:text-bone-muted/45 focus:outline-none focus:ring-2 focus:ring-leather-400"
              />
            </label>
          </div>
        </section>
      </div>

      <section className="shell-panel px-6 py-6 md:px-8">
        <div className="mb-5 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-plum-400/30 bg-plum-400/12 text-plum-300">
            <Sparkles size={18} />
          </div>
          <div>
            <p className="shell-kicker">Interpretive lens</p>
            <h2 className="shell-subsection-title mt-1">Astrological tradition</h2>
          </div>
        </div>

        <p className="mb-4 text-sm leading-7 text-bone-muted">
          Your tradition shapes how {BRAND.product} reads your chart — which techniques it emphasizes and which house system it uses as a default. You can override the house system below if you want to diverge from the tradition default.
        </p>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {(Object.keys(TRADITION_LABELS) as Tradition[]).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => handleTraditionChange(t)}
              className={`rounded-xl border px-4 py-3 text-left transition-colors ${
                form.tradition === t
                  ? "border-leather-400/60 bg-leather-500/20 text-bone"
                  : "border-border/60 bg-stone-950/50 text-bone-muted hover:border-border hover:text-bone"
              }`}
            >
              <p className="text-sm font-medium">{TRADITION_LABELS[t]}</p>
              <p className="mt-1 text-xs leading-5 text-bone-muted">{TRADITION_DESCRIPTIONS[t]}</p>
              <p className="mt-2 text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-bone-muted/60">
                Default: {HOUSE_SYSTEM_LABELS[TRADITION_HOUSE_DEFAULTS[t]]}
              </p>
            </button>
          ))}
        </div>

        <div className="mt-5">
          <p className="mb-2 text-sm font-medium text-bone">House system</p>
          <div className="flex flex-wrap gap-2">
            {(Object.keys(HOUSE_SYSTEM_LABELS) as HouseSystem[]).map((hs) => (
              <button
                key={hs}
                type="button"
                onClick={() => { setField("house_system", hs); setSaved(false); }}
                className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                  form.house_system === hs
                    ? "border-leather-400/60 bg-leather-500/20 text-bone"
                    : "border-border/60 bg-stone-950/50 text-bone-muted hover:text-bone"
                }`}
              >
                {HOUSE_SYSTEM_LABELS[hs]}
              </button>
            ))}
          </div>
          {form.tradition !== null && form.house_system !== null && form.house_system !== TRADITION_HOUSE_DEFAULTS[form.tradition] && (
            <p className="mt-2 text-xs text-leather-300/80">
              Overriding the {TRADITION_LABELS[form.tradition]} default ({HOUSE_SYSTEM_LABELS[TRADITION_HOUSE_DEFAULTS[form.tradition]]})
            </p>
          )}
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <section className="shell-panel px-6 py-6 md:px-8">
          <div className="mb-5 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-moss-400/30 bg-moss-400/10 text-moss-200">
              <UserRound size={18} />
            </div>
            <div>
              <p className="shell-kicker">Identity</p>
              <h2 className="shell-subsection-title mt-1">How the planner addresses you</h2>
            </div>
          </div>

          <div className="space-y-4">
            <label className="block space-y-2">
              <span className="text-sm font-medium text-bone">Display name</span>
              <input
                type="text"
                value={form.display_name}
                onChange={(event) => setField("display_name", event.target.value)}
                placeholder={`What should ${BRAND.product} call you?`}
                className="w-full rounded-xl border border-border/80 bg-stone-950/70 px-4 py-3 text-bone placeholder:text-bone-muted/45 focus:outline-none focus:ring-2 focus:ring-leather-400"
              />
            </label>
          </div>
        </section>

        <section className="shell-panel px-6 py-6 md:px-8">
          <div className="mb-5 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-leather-400/30 bg-leather-500/10 text-leather-200">
              <CalendarDays size={18} />
            </div>
            <div>
              <p className="shell-kicker">Timing foundation</p>
              <h2 className="shell-subsection-title mt-1">Birth data</h2>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="block space-y-2">
              <span className="text-sm font-medium text-bone">Birth date</span>
              <input
                type="date"
                value={form.birth_date}
                onChange={(event) => setField("birth_date", event.target.value)}
                className="w-full rounded-xl border border-border/80 bg-stone-950/70 px-4 py-3 text-bone focus:outline-none focus:ring-2 focus:ring-leather-400"
              />
            </label>

            <label className="block space-y-2">
              <span className="text-sm font-medium text-bone">Birth time</span>
              <input
                type="time"
                value={form.birth_time}
                onChange={(event) => setField("birth_time", event.target.value)}
                disabled={form.birth_time_unknown}
                className="w-full rounded-xl border border-border/80 bg-stone-950/70 px-4 py-3 text-bone focus:outline-none focus:ring-2 focus:ring-leather-400 disabled:opacity-45"
              />
            </label>

            <label className="block space-y-2 md:col-span-2">
              <span className="text-sm font-medium text-bone">Birth city</span>
              <input
                type="text"
                value={form.birth_city}
                onChange={(event) => setField("birth_city", event.target.value)}
                placeholder="City used for your chart timing"
                className="w-full rounded-xl border border-border/80 bg-stone-950/70 px-4 py-3 text-bone placeholder:text-bone-muted/45 focus:outline-none focus:ring-2 focus:ring-leather-400"
              />
            </label>

            <label className="block space-y-2 md:col-span-2">
              <span className="text-sm font-medium text-bone">Birth timezone</span>
              <input
                type="text"
                value={form.birth_tz}
                onChange={(event) => setField("birth_tz", event.target.value)}
                placeholder="e.g. America/New_York"
                className="w-full rounded-xl border border-border/80 bg-stone-950/70 px-4 py-3 text-bone placeholder:text-bone-muted/45 focus:outline-none focus:ring-2 focus:ring-leather-400"
              />
            </label>
          </div>

          <label className="mt-4 flex items-center gap-2 text-sm text-bone-muted">
            <input
              type="checkbox"
              checked={form.birth_time_unknown}
              onChange={(event) => setField("birth_time_unknown", event.target.checked)}
              className="rounded border-border/80 bg-stone-950/70"
            />
            I don&apos;t know my birth time
          </label>

          <p className="mt-3 text-xs leading-6 text-bone-muted/75">
            Need to fully change your birth location coordinates? Use onboarding again so {BRAND.product} can geocode the place and rebuild the chart cleanly.
          </p>
        </section>
      </div>

      <section className="shell-panel px-6 py-6 md:px-8">
        <div className="mb-5 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-moss-400/30 bg-moss-400/10 text-moss-200">
            <CalendarDays size={18} />
          </div>
          <div>
            <p className="shell-kicker">Planner location</p>
            <h2 className="shell-subsection-title mt-1">Current location (optional)</h2>
          </div>
        </div>

        <p className="mb-4 text-sm leading-7 text-bone-muted">
          If you live or work in a different timezone than your birthplace, set your current location here. Your planner's energy windows will use this location's sunrise/sunset times instead of your birth location's. Leave blank to use your birth timezone.
        </p>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="block space-y-2">
            <span className="text-sm font-medium text-bone">Latitude</span>
            <input
              type="number"
              step="0.0001"
              min="-90"
              max="90"
              value={form.planner_lat}
              onChange={(event) => setField("planner_lat", event.target.value)}
              placeholder="e.g. 34.0522"
              className="w-full rounded-xl border border-border/80 bg-stone-950/70 px-4 py-3 text-bone placeholder:text-bone-muted/45 focus:outline-none focus:ring-2 focus:ring-leather-400"
            />
          </label>

          <label className="block space-y-2">
            <span className="text-sm font-medium text-bone">Longitude</span>
            <input
              type="number"
              step="0.0001"
              min="-180"
              max="180"
              value={form.planner_lng}
              onChange={(event) => setField("planner_lng", event.target.value)}
              placeholder="e.g. -118.2437"
              className="w-full rounded-xl border border-border/80 bg-stone-950/70 px-4 py-3 text-bone placeholder:text-bone-muted/45 focus:outline-none focus:ring-2 focus:ring-leather-400"
            />
          </label>

          <label className="block space-y-2 md:col-span-2">
            <span className="text-sm font-medium text-bone">Planner timezone</span>
            <input
              type="text"
              value={form.planner_tz}
              onChange={(event) => setField("planner_tz", event.target.value)}
              placeholder="e.g. America/Los_Angeles"
              className="w-full rounded-xl border border-border/80 bg-stone-950/70 px-4 py-3 text-bone placeholder:text-bone-muted/45 focus:outline-none focus:ring-2 focus:ring-leather-400"
            />
          </label>
        </div>
      </section>

      {oracleUsage ? (
        <section className="shell-panel px-6 py-6 md:px-8">
          <div className="mb-5 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-plum-400/30 bg-plum-400/10 text-plum-300">
              <MessageCircle size={18} />
            </div>
            <div>
              <p className="shell-kicker">Stelloquy usage</p>
              <h2 className="shell-subsection-title mt-1">This month</h2>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-[1rem] border border-border/70 bg-stone-950/55 px-4 py-3">
              <p className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-bone-muted/70">Messages used</p>
              <p className="mt-2 text-lg font-medium text-bone">
                {oracleUsage.messageCount} <span className="text-bone-muted/70">/ {oracleUsage.limit}</span>
              </p>
            </div>
            <div className="rounded-[1rem] border border-border/70 bg-stone-950/55 px-4 py-3">
              <p className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-bone-muted/70">Remaining</p>
              <p className="mt-2 text-lg font-medium text-bone">{oracleUsage.remaining}</p>
            </div>
            <div className="rounded-[1rem] border border-border/70 bg-stone-950/55 px-4 py-3">
              <p className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-bone-muted/70">Cache hit rate</p>
              <p className="mt-2 text-lg font-medium text-bone">{Math.round(oracleUsage.cacheHitRate * 100)}%</p>
            </div>
          </div>

          <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-stone-950/70">
            <div
              className="h-full rounded-full bg-leather-400/80"
              style={{ width: `${Math.min(100, Math.round((oracleUsage.messageCount / oracleUsage.limit) * 100))}%` }}
            />
          </div>

          <p className="mt-3 text-xs leading-6 text-bone-muted/75">
            Your Stelloquy limit resets on the first of each month. Cached input tokens cost ~90% less — a high cache hit rate means your natal chart and blueprint aren&apos;t being re-billed on every message.
          </p>
        </section>
      ) : null}

      <section className="shell-panel px-6 py-5 md:px-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="shell-kicker mb-2">Actions</p>
            <p className="text-sm leading-7 text-bone-muted">
              Save your preferences here, or jump to the deeper planner surfaces when you want to work directly in them.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={handleBillingPortal}
              disabled={isBillingPending}
              className="rounded-xl border border-border/80 bg-stone-950/75 px-4 py-2.5 text-sm font-medium text-bone-muted transition-colors hover:text-bone disabled:opacity-50"
            >
              {isBillingPending ? "Opening billing..." : "Manage billing"}
            </button>
            <Link
              href="/blueprint"
              className="rounded-xl border border-border/80 bg-stone-950/75 px-4 py-2.5 text-sm font-medium text-bone-muted transition-colors hover:text-bone"
            >
              Open blueprint
            </Link>
            <Link
              href="/journal"
              className="rounded-xl border border-border/80 bg-stone-950/75 px-4 py-2.5 text-sm font-medium text-bone-muted transition-colors hover:text-bone"
            >
              Open journal
            </Link>
            <Link
              href="/curriculum/setup"
              className="rounded-xl border border-border/80 bg-stone-950/75 px-4 py-2.5 text-sm font-medium text-bone-muted transition-colors hover:text-bone"
            >
              Set up curriculum
            </Link>
            <button
              type="button"
              onClick={startTour}
              className="rounded-xl border border-border/80 bg-stone-950/75 px-4 py-2.5 text-sm font-medium text-bone-muted transition-colors hover:text-bone"
            >
              Restart tour
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={!hydrated || isPending}
              className="rounded-xl border border-leather-400/50 bg-leather-500/30 px-5 py-2.5 text-sm font-medium text-bone shadow-glow transition hover:bg-leather-500/45 disabled:opacity-50"
            >
              {isPending ? "Saving…" : "Save settings"}
            </button>
            {saved ? <p className="text-sm text-moss-300">Saved</p> : null}
            {billingError ? <p className="text-sm text-red-200">{billingError}</p> : null}
          </div>
        </div>
      </section>
    </div>
  );
}

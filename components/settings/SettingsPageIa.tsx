"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import {
  SETTINGS_IA_PAGE_BOTTOM_PAD_PX,
  SETTINGS_IA_STICKY_SAVE_BAR_HEIGHT_PX,
  setSettingsIaStickySaveLift,
} from "@/lib/settings/settings-ia-sticky-save";
import { ChevronDown, MessageCircle } from "lucide-react";
import {
  SETTINGS_IA_BIRTH_TIME_UNKNOWN_PLACEHOLDER,
  SETTINGS_IA_CHECKBOX_ACCENT_CLASS,
  SETTINGS_IA_USAGE_DETAILS_LABEL,
  SETTINGS_IA_GROUPS,
  isSettingsIaNearPageBottom,
  pickSettingsIaActiveSection,
  scrollSettingsAnchorIntoView,
  settingsShortcutBlueprintHref,
  settingsShortcutCurriculumHref,
  settingsShortcutJournalHref,
  type SettingsIaGroupId,
} from "@/lib/settings/ia-settings-routes";
import { iaJournalFlagEnabled } from "@/lib/journal/ia-journal-routes";
import { ThemePicker } from "@/components/shared/ThemePicker";
import { VoicePanel } from "@/components/journal/VoicePanel";
import { JournalMemorySettingsPanel } from "@/components/settings/JournalMemorySettingsPanel";
import { MoonDayRemindersSettingsPanel } from "@/components/settings/MoonDayRemindersSettingsPanel";
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

type AccessWindow = {
  endsAt: string;
  accessPlan: "monthly" | "yearly";
  state: "active" | "read_only" | "expired" | "revoked";
  daysRemaining: number;
};

function formatLongDate(date: string) {
  const parsed = new Date(`${date}T12:00:00`);
  if (Number.isNaN(parsed.getTime())) return date;
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(parsed);
}

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

/** Matches SETTINGS_IA_SCROLL_OFFSET_PX (24px) for hash / scroll-margin parity. */
const SCROLL_MARGIN_CLASS = "scroll-mt-6";
const FIELD_INPUT_CLASS =
  "w-full rounded-xl border border-[#E3E2ED]/12 bg-[#0A0C14] px-4 py-3 text-[#E3E2ED] placeholder:text-bone-muted/45 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#A98AEF] focus-visible:outline-offset-2";

function statesEqual(a: SettingsState, b: SettingsState): boolean {
  return (
    a.display_name === b.display_name &&
    a.theme === b.theme &&
    a.birth_date === b.birth_date &&
    a.birth_time === b.birth_time &&
    a.birth_time_unknown === b.birth_time_unknown &&
    a.birth_city === b.birth_city &&
    a.birth_tz === b.birth_tz &&
    a.planner_lat === b.planner_lat &&
    a.planner_lng === b.planner_lng &&
    a.planner_tz === b.planner_tz &&
    a.plan_year === b.plan_year &&
    a.year_vision === b.year_vision &&
    a.what_to_release === b.what_to_release &&
    a.study_focus === b.study_focus &&
    a.tradition === b.tradition &&
    a.house_system === b.house_system
  );
}

export default function SettingsPageIa() {
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
  const [usageDetailsOpen, setUsageDetailsOpen] = useState(false);
  const [oracleUsage, setOracleUsage] = useState<{
    messageCount: number;
    limit: number;
    remaining: number;
    cacheHitRate: number;
  } | null>(null);
  const [accessWindow, setAccessWindow] = useState<AccessWindow | null>(null);
  const [baseline, setBaseline] = useState<SettingsState | null>(null);
  const [activeSection, setActiveSection] = useState<SettingsIaGroupId>("birth-data");
  const sectionRefs = useRef<Record<SettingsIaGroupId, HTMLElement | null>>({
    "birth-data": null,
    chart: null,
    year: null,
    look: null,
    journal: null,
    plan: null,
    shortcuts: null,
  });

  const iaJournalEnabled = iaJournalFlagEnabled(process.env.NEXT_PUBLIC_IA_JOURNAL);
  const shortcutBlueprintHref = settingsShortcutBlueprintHref();
  const shortcutJournalHref = settingsShortcutJournalHref(iaJournalEnabled);
  const shortcutCurriculumHref = settingsShortcutCurriculumHref();

  const isMainFormDirty = useMemo(() => {
    if (!baseline || !hydrated) return false;
    return !statesEqual(form, baseline);
  }, [baseline, form, hydrated]);

  useEffect(() => {
    setSettingsIaStickySaveLift(isMainFormDirty);
    return () => setSettingsIaStickySaveLift(false);
  }, [isMainFormDirty]);

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
        setAccessWindow((data.access_window ?? null) as AccessWindow | null);
        const nextForm = buildInitialState(nextProfile ?? ({ theme: fallbackTheme } as SettingsProfile));
        setForm(nextForm);
        setBaseline(nextForm);
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
        setBaseline(form);
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

  const focusGroupHeading = useCallback((root: HTMLElement) => {
    const section = root.closest("section") ?? root;
    const heading = section.querySelector<HTMLElement>("h2");
    if (heading) {
      heading.focus({ preventScroll: true });
      return;
    }
    if (root instanceof HTMLElement && root.matches("h2")) {
      root.focus({ preventScroll: true });
    }
  }, []);

  const focusMoonReminderTarget = useCallback((anchor: HTMLElement) => {
    const panelHeading = anchor.querySelector<HTMLElement>("[data-moon-reminder-focus]");
    const journalHeading = anchor.closest("section")?.querySelector<HTMLElement>("h2");
    const target = panelHeading ?? journalHeading;
    target?.focus({ preventScroll: true });
  }, []);

  const scrollToSection = useCallback(
    (id: SettingsIaGroupId, behavior: ScrollBehavior = "smooth") => {
      const node = sectionRefs.current[id];
      if (!node) return false;
      scrollSettingsAnchorIntoView(node, behavior);
      focusGroupHeading(node);
      return true;
    },
    [focusGroupHeading],
  );

  const jumpToSection = useCallback(
    (id: SettingsIaGroupId) => {
      setActiveSection(id);
      scrollToSection(id);
    },
    [scrollToSection],
  );

  const scrollToHashAnchor = useCallback(
    (hash: string, behavior: ScrollBehavior = "auto") => {
      if (hash === "moon-reminder") {
        const anchor = document.getElementById("moon-reminder");
        if (!anchor) return false;
        scrollSettingsAnchorIntoView(anchor, behavior);
        requestAnimationFrame(() => focusMoonReminderTarget(anchor));
        return true;
      }

      const groupId = SETTINGS_IA_GROUPS.find((g) => g.id === hash)?.id;
      if (groupId && scrollToSection(groupId, behavior)) {
        setActiveSection(groupId);
        return true;
      }

      const anchor = document.getElementById(hash);
      if (!anchor) return false;
      scrollSettingsAnchorIntoView(anchor, behavior);
      focusGroupHeading(anchor);
      return true;
    },
    [focusGroupHeading, focusMoonReminderTarget, scrollToSection],
  );

  useEffect(() => {
    if (!hydrated) return;

    let cancelled = false;

    const navigateToHash = () => {
      const hash = window.location.hash.replace(/^#/, "");
      if (!hash) return;
      let attempts = 0;
      const run = () => {
        if (cancelled) return;
        if (scrollToHashAnchor(hash, "auto")) return;
        if (attempts++ < 40) requestAnimationFrame(run);
      };
      requestAnimationFrame(run);
    };

    navigateToHash();
    window.addEventListener("hashchange", navigateToHash);
    return () => {
      cancelled = true;
      window.removeEventListener("hashchange", navigateToHash);
    };
  }, [hydrated, scrollToHashAnchor]);

  const syncActiveSection = useCallback(() => {
    const sectionTops = SETTINGS_IA_GROUPS.flatMap((group) => {
      const node = sectionRefs.current[group.id];
      if (!node) return [];
      return [{ id: group.id, top: node.getBoundingClientRect().top, ratio: 0 }];
    });

    const picked = pickSettingsIaActiveSection({
      sectionTops,
      nearPageBottom: isSettingsIaNearPageBottom(),
      viewportHeight: window.innerHeight,
    });
    if (picked) setActiveSection(picked);
  }, []);

  useEffect(() => {
    if (!hydrated) return;

    const onScroll = () => syncActiveSection();
    window.addEventListener("scroll", onScroll, { passive: true });
    syncActiveSection();

    return () => window.removeEventListener("scroll", onScroll);
  }, [hydrated, syncActiveSection]);

  const setSectionRef = (id: SettingsIaGroupId) => (node: HTMLElement | null) => {
    sectionRefs.current[id] = node;
  };

  const traditionCardClass = (selected: boolean) =>
    selected
      ? "border-[#A98AEF] bg-[#A98AEF]/16 text-[#E3E2ED]"
      : "border-[#E3E2ED]/12 bg-[#0A0C14] text-[#A4A3B1] hover:bg-[#E3E2ED]/5 hover:text-[#E3E2ED]";

  return (
<div
      className="mx-auto max-w-[1040px] bg-[#0A0C14] px-4 py-8 md:px-8"
      style={{
        paddingBottom: `calc(${SETTINGS_IA_PAGE_BOTTOM_PAD_PX}px + ${isMainFormDirty ? SETTINGS_IA_STICKY_SAVE_BAR_HEIGHT_PX : 0}px + env(safe-area-inset-bottom, 0px))`,
      }}
    >
      <section className="shell-panel px-5 py-5 md:px-8">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <p className="shell-kicker mb-3">Settings</p>
            <h1 className="shell-section-title text-[2rem] md:text-[2.25rem]">Personalize your planner</h1>
            <p className="mt-3 text-sm leading-7 text-bone-muted">
              Adjust the way {BRAND.product} looks, what it centers, and the birth details it uses to generate your timing layer.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
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
        <div className="mt-6 rounded-[1rem] border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-bone">
          {loadError}
        </div>
      ) : null}

      <div className="mt-6 lg:hidden">
        <p className="mb-3 text-sm font-medium text-[#A4A3B1]">Jump to</p>
        <div className="grid grid-cols-2 gap-2">
          {SETTINGS_IA_GROUPS.map((group) => (
            <button
              key={group.id}
              type="button"
              onClick={() => jumpToSection(group.id)}
              className="flex h-11 items-center justify-center rounded-xl border border-[#E3E2ED]/12 bg-[#0A0C14] px-2 text-center text-sm text-[#A4A3B1] transition-colors hover:bg-[#E3E2ED]/5 hover:text-[#E3E2ED] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#A98AEF] focus-visible:outline-offset-2"
            >
              {group.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-8 flex gap-8 lg:mt-6">
        <nav className="hidden w-[200px] shrink-0 lg:block" aria-label="Settings sections">
          <ul className="sticky top-6 space-y-0.5">
            {SETTINGS_IA_GROUPS.map((group) => {
              const isActive = activeSection === group.id;
              return (
                <li key={group.id}>
                  <button
                    type="button"
                    onClick={() => jumpToSection(group.id)}
                    aria-current={isActive ? "true" : undefined}
                    className={`flex h-9 w-full items-center rounded-r-md border-l-2 px-3 text-left text-sm transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#A98AEF] focus-visible:outline-offset-2 ${
                      isActive
                        ? "border-[#A98AEF] bg-[#A98AEF]/16 text-[#E3E2ED]"
                        : "border-transparent text-[#A4A3B1] hover:bg-[#E3E2ED]/5 hover:text-[#E3E2ED]"
                    }`}
                  >
                    {group.label}
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="min-w-0 max-w-[720px] flex-1 space-y-6">
          <section id="birth-data" ref={setSectionRef("birth-data")} className={`shell-panel px-5 py-5 md:px-6 ${SCROLL_MARGIN_CLASS}`}>
            <h2 tabIndex={-1} className="text-xl font-semibold text-[#E3E2ED] outline-none">Birth details</h2>
            <div className="mt-5 space-y-4">
              <label className="block space-y-2">
                <span className="text-sm font-medium text-bone">Display name</span>
                <input type="text" value={form.display_name} onChange={(event) => setField("display_name", event.target.value)} placeholder={`What should ${BRAND.product} call you?`} className={FIELD_INPUT_CLASS} />
              </label>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <label className="block space-y-2">
                  <span className="text-sm font-medium text-bone">Birth date</span>
                  <input type="date" value={form.birth_date} onChange={(event) => setField("birth_date", event.target.value)} className={FIELD_INPUT_CLASS} />
                </label>
                <label className="block space-y-2">
                  <span className="text-sm font-medium text-bone">Birth time</span>
                  {form.birth_time_unknown ? (
                    <input
                      type="text"
                      readOnly
                      value={SETTINGS_IA_BIRTH_TIME_UNKNOWN_PLACEHOLDER}
                      disabled
                      aria-disabled
                      className={`${FIELD_INPUT_CLASS} cursor-default text-bone-muted/45 disabled:cursor-default disabled:opacity-100`}
                    />
                  ) : (
                    <input
                      type="time"
                      value={form.birth_time}
                      onChange={(event) => setField("birth_time", event.target.value)}
                      className={FIELD_INPUT_CLASS}
                    />
                  )}
                </label>
                <label className="block space-y-2 md:col-span-2">
                  <span className="text-sm font-medium text-bone">Birth city</span>
                  <input type="text" value={form.birth_city} onChange={(event) => setField("birth_city", event.target.value)} placeholder="City used for your chart timing" className={FIELD_INPUT_CLASS} />
                </label>
                <label className="block space-y-2 md:col-span-2">
                  <span className="text-sm font-medium text-bone">Birth timezone</span>
                  <input type="text" value={form.birth_tz} onChange={(event) => setField("birth_tz", event.target.value)} placeholder="e.g. America/New_York" className={FIELD_INPUT_CLASS} />
                </label>
              </div>
              <label className="flex items-center gap-2 text-sm text-bone-muted">
                <input
                  type="checkbox"
                  checked={form.birth_time_unknown}
                  onChange={(event) => setField("birth_time_unknown", event.target.checked)}
                  className={`rounded border-border/80 bg-stone-950/70 ${SETTINGS_IA_CHECKBOX_ACCENT_CLASS}`}
                />
                I don&apos;t know my birth time
              </label>
              <p className="text-xs leading-6 text-bone-muted/75">
                Need to fully change your birth location coordinates? Use onboarding again so {BRAND.product} can geocode the place and rebuild the chart cleanly.
              </p>
              <div className="border-t border-border/55 pt-5">
                <h3 className="text-sm font-semibold text-[#E3E2ED]">Where you are now</h3>
                <p className="mt-2 text-sm leading-7 text-bone-muted">
                  If you live or work in a different timezone than your birthplace, set your current location here. Your planner&apos;s energy windows will use this location&apos;s sunrise/sunset times instead of your birth location&apos;s. Leave blank to use your birth timezone.
                </p>
                <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                  <label className="block space-y-2">
                    <span className="text-sm font-medium text-bone">Latitude</span>
                    <input type="number" step="0.0001" min="-90" max="90" value={form.planner_lat} onChange={(event) => setField("planner_lat", event.target.value)} placeholder="e.g. 34.0522" className={FIELD_INPUT_CLASS} />
                  </label>
                  <label className="block space-y-2">
                    <span className="text-sm font-medium text-bone">Longitude</span>
                    <input type="number" step="0.0001" min="-180" max="180" value={form.planner_lng} onChange={(event) => setField("planner_lng", event.target.value)} placeholder="e.g. -118.2437" className={FIELD_INPUT_CLASS} />
                  </label>
                  <label className="block space-y-2 md:col-span-2">
                    <span className="text-sm font-medium text-bone">Planner timezone</span>
                    <input type="text" value={form.planner_tz} onChange={(event) => setField("planner_tz", event.target.value)} placeholder="e.g. America/Los_Angeles" className={FIELD_INPUT_CLASS} />
                  </label>
                </div>
              </div>
            </div>
          </section>

          <section id="chart" ref={setSectionRef("chart")} className={`shell-panel px-5 py-5 md:px-6 ${SCROLL_MARGIN_CLASS}`}>
            <h2 tabIndex={-1} className="text-xl font-semibold text-[#E3E2ED] outline-none">Chart</h2>
            <p className="mt-4 text-sm leading-7 text-bone-muted">
              Your tradition shapes how {BRAND.product} reads your chart — which techniques it emphasizes and which house system it uses as a default. You can override the house system below if you want to diverge from the tradition default.
            </p>
            <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-1">
              {(Object.keys(TRADITION_LABELS) as Tradition[]).map((t) => (
                <button key={t} type="button" onClick={() => handleTraditionChange(t)} className={`rounded-xl border px-4 py-3 text-left transition-[color,background-color,border-color] duration-[120ms] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#A98AEF] focus-visible:outline-offset-2 ${traditionCardClass(form.tradition === t)}`}>
                  <p className="text-sm font-medium">{TRADITION_LABELS[t]}</p>
                  <p className="mt-1 text-xs leading-5 text-bone-muted">{TRADITION_DESCRIPTIONS[t]}</p>
                  <p className="mt-2 text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-bone-muted/60">Default: {HOUSE_SYSTEM_LABELS[TRADITION_HOUSE_DEFAULTS[t]]}</p>
                </button>
              ))}
            </div>
            <div className="mt-5">
              <p className="mb-2 text-sm font-medium text-bone">House system</p>
              <div className="flex flex-wrap gap-2">
                {(Object.keys(HOUSE_SYSTEM_LABELS) as HouseSystem[]).map((hs) => (
                  <button key={hs} type="button" onClick={() => { setField("house_system", hs); setSaved(false); }} className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#A98AEF] focus-visible:outline-offset-2 ${form.house_system === hs ? "border-[#A98AEF] bg-[#A98AEF]/16 text-[#E3E2ED]" : "border-[#E3E2ED]/12 bg-[#0A0C14] text-[#A4A3B1] hover:text-[#E3E2ED]"}`}>
                    {HOUSE_SYSTEM_LABELS[hs]}
                  </button>
                ))}
              </div>
              {form.tradition !== null && form.house_system !== null && form.house_system !== TRADITION_HOUSE_DEFAULTS[form.tradition] ? (
                <p className="mt-2 text-xs text-[#DF9B3F]">Overriding the {TRADITION_LABELS[form.tradition]} default ({HOUSE_SYSTEM_LABELS[TRADITION_HOUSE_DEFAULTS[form.tradition]]})</p>
              ) : null}
            </div>
          </section>

          <section id="year" ref={setSectionRef("year")} className={`shell-panel px-5 py-5 md:px-6 ${SCROLL_MARGIN_CLASS}`}>
            <h2 tabIndex={-1} className="text-xl font-semibold text-[#E3E2ED] outline-none">Your year</h2>
            <div className="mt-5 space-y-4">
              <label className="block space-y-2"><span className="text-sm font-medium text-bone">Plan year</span><input type="number" min={2024} max={2100} value={form.plan_year} onChange={(event) => setField("plan_year", event.target.value)} className={FIELD_INPUT_CLASS} /></label>
              <label className="block space-y-2"><span className="text-sm font-medium text-bone">Year vision</span><textarea rows={4} value={form.year_vision} onChange={(event) => setField("year_vision", event.target.value)} placeholder="What are you building this year?" className={FIELD_INPUT_CLASS} /></label>
              <label className="block space-y-2"><span className="text-sm font-medium text-bone">Release theme</span><textarea rows={3} value={form.what_to_release} onChange={(event) => setField("what_to_release", event.target.value)} placeholder="What are you intentionally leaving behind?" className={FIELD_INPUT_CLASS} /></label>
              <label className="block space-y-2"><span className="text-sm font-medium text-bone">Study focus</span><textarea rows={3} value={form.study_focus} onChange={(event) => setField("study_focus", event.target.value)} placeholder={`Books, topics, skills, or tracks you want ${BRAND.product} to support`} className={FIELD_INPUT_CLASS} /></label>
            </div>
          </section>

          <section id="look" ref={setSectionRef("look")} className={`shell-panel px-5 py-5 md:px-6 ${SCROLL_MARGIN_CLASS}`}>
            <h2 tabIndex={-1} className="text-xl font-semibold text-[#E3E2ED] outline-none">Look and voice</h2>
            <div className="mt-5">
              <ThemePicker value={form.theme} onChange={handleThemeChange} />
              <div className="mt-5 rounded-[1rem] border border-border/60 bg-stone-950/50 px-4 py-4">
                <p className="text-sm leading-7 text-bone-muted"><span className="font-medium text-bone">{selectedTheme.name} — </span>{selectedTheme.description}</p>
              </div>
            </div>
            <div className="mt-6"><VoicePanel /></div>
          </section>

          <section id="journal" ref={setSectionRef("journal")} className={`shell-panel px-5 py-5 md:px-6 ${SCROLL_MARGIN_CLASS}`}>
            <h2 tabIndex={-1} className="text-xl font-semibold text-[#E3E2ED] outline-none">Journal and reminders</h2>
            <div className="mt-5 space-y-5">
              <MoonDayRemindersSettingsPanel embedded anchorId="moon-reminder" />
              <JournalMemorySettingsPanel />
            </div>
          </section>

          <section id="plan" ref={setSectionRef("plan")} className={`shell-panel px-5 py-5 md:px-6 ${SCROLL_MARGIN_CLASS}`}>
            <h2 tabIndex={-1} className="text-xl font-semibold text-[#E3E2ED] outline-none">Plan and usage</h2>
            {accessWindow ? (
              <div className="mt-4 space-y-2 text-sm leading-7 text-bone-muted/85">
                <p>
                  {accessWindow.state === "active" ? (
                    accessWindow.accessPlan === "monthly" ? (
                      <>
                        Your monthly plan runs through{" "}
                        <span className="text-bone">{formatLongDate(accessWindow.endsAt)}</span>.
                        {" "}While active, your Blueprint includes the current week plus the next four weeks.
                      </>
                    ) : (
                      <>
                        Your annual plan runs through{" "}
                        <span className="text-bone">{formatLongDate(accessWindow.endsAt)}</span>
                        {" "}and includes the full canonical Blueprint.
                      </>
                    )
                  ) : accessWindow.accessPlan === "monthly" ? (
                    <>
                      Your paid Planner and generation access ended on{" "}
                      <span className="text-bone">{formatLongDate(accessWindow.endsAt)}</span>.
                    </>
                  ) : (
                    <>
                      Your annual generation access ended on{" "}
                      <span className="text-bone">{formatLongDate(accessWindow.endsAt)}</span>.
                      {" "}Your full canonical Blueprint remains readable.
                    </>
                  )}
                </p>
                <p>
                  If you cancel or paid access ends, your customer-authored journal history remains readable and
                  exportable. Writing and paid generation require active access.
                </p>
              </div>
            ) : null}
            <button type="button" onClick={handleBillingPortal} disabled={isBillingPending} className="mt-5 rounded-xl border border-[#E3E2ED]/12 bg-[#0A0C14] px-4 py-2.5 text-sm font-medium text-[#A4A3B1] transition-colors hover:bg-[#E3E2ED]/5 hover:text-[#E3E2ED] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#A98AEF] focus-visible:outline-offset-2 disabled:cursor-default disabled:opacity-45">{isBillingPending ? "Opening billing..." : "Manage billing"}</button>
            {billingError ? <p className="mt-2 text-sm text-red-200">{billingError}</p> : null}
            {oracleUsage ? (
              <div className="mt-8 border-t border-border/55 pt-6">
                <div className="mb-4 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-plum-400/30 bg-plum-400/10 text-plum-300"><MessageCircle size={18} /></div>
                  <div><p className="shell-kicker">Planner + Oracle</p><h3 className="shell-subsection-title mt-1">Stelloquy usage this month</h3></div>
                </div>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="rounded-[1rem] border border-border/70 bg-stone-950/55 px-4 py-3"><p className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-bone-muted/70">Messages used</p><p className="mt-2 text-lg font-medium text-bone">{oracleUsage.messageCount} <span className="text-bone-muted/70">/ {oracleUsage.limit}</span></p></div>
                  <div className="rounded-[1rem] border border-border/70 bg-stone-950/55 px-4 py-3"><p className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-bone-muted/70">Remaining</p><p className="mt-2 text-lg font-medium text-bone">{oracleUsage.remaining}</p></div>
                </div>
                <button
                  type="button"
                  aria-expanded={usageDetailsOpen}
                  onClick={() => setUsageDetailsOpen((open) => !open)}
                  className="mt-4 inline-flex items-center gap-2 rounded-xl border border-[#E3E2ED]/12 bg-[#0A0C14] px-4 py-2 text-sm font-medium text-[#A4A3B1] transition-colors hover:bg-[#E3E2ED]/5 hover:text-[#E3E2ED] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#A98AEF] focus-visible:outline-offset-2"
                >
                  {SETTINGS_IA_USAGE_DETAILS_LABEL}
                  <ChevronDown
                    aria-hidden
                    size={15}
                    className={`shrink-0 text-[#A4A3B1] transition-transform ${usageDetailsOpen ? "rotate-180" : ""}`}
                  />
                </button>
                {usageDetailsOpen ? (
                  <div className="mt-4 space-y-3">
                    <div className="rounded-[1rem] border border-border/70 bg-stone-950/55 px-4 py-3">
                      <p className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-bone-muted/70">Cache hit rate</p>
                      <p className="mt-2 text-lg font-medium text-bone">{Math.round(oracleUsage.cacheHitRate * 100)}%</p>
                    </div>
                    <p className="text-xs leading-6 text-bone-muted/75">
                      Cached input tokens cost ~90% less—a high cache hit rate means your natal chart and permitted
                      Blueprint context aren&apos;t being re-billed on every message.
                    </p>
                  </div>
                ) : null}
                <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-stone-950/70"><div className="h-full rounded-full bg-leather-400/80" style={{ width: `${Math.min(100, Math.round((oracleUsage.messageCount / oracleUsage.limit) * 100))}%` }} /></div>
                <p className="mt-3 text-xs leading-6 text-bone-muted/75">
                  Stelloquy requires active Planner + Oracle access. Its limit resets on the first of each month.
                </p>
              </div>
            ) : null}
          </section>

          <section id="shortcuts" ref={setSectionRef("shortcuts")} className={`shell-panel px-5 py-5 md:px-6 ${SCROLL_MARGIN_CLASS}`}>
            <h2 tabIndex={-1} className="text-xl font-semibold text-[#E3E2ED] outline-none">Shortcuts</h2>
            <p className="mt-3 text-sm leading-7 text-bone-muted">Jump to the deeper planner surfaces when you want to work directly in them.</p>
            <div className="mt-5 flex flex-col gap-2">
              <Link href={shortcutBlueprintHref} className="flex h-11 items-center justify-center rounded-xl border border-[#E3E2ED]/12 bg-[#0A0C14] text-sm font-medium text-[#A4A3B1] transition-colors hover:bg-[#E3E2ED]/5 hover:text-[#E3E2ED] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#A98AEF] focus-visible:outline-offset-2">Open blueprint</Link>
              <Link href={shortcutJournalHref} className="flex h-11 items-center justify-center rounded-xl border border-[#E3E2ED]/12 bg-[#0A0C14] text-sm font-medium text-[#A4A3B1] transition-colors hover:bg-[#E3E2ED]/5 hover:text-[#E3E2ED] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#A98AEF] focus-visible:outline-offset-2">Open journal</Link>
              <Link href={shortcutCurriculumHref} className="flex h-11 items-center justify-center rounded-xl border border-[#E3E2ED]/12 bg-[#0A0C14] text-sm font-medium text-[#A4A3B1] transition-colors hover:bg-[#E3E2ED]/5 hover:text-[#E3E2ED] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#A98AEF] focus-visible:outline-offset-2">Set up curriculum</Link>
              <button type="button" onClick={startTour} className="flex h-11 items-center justify-center rounded-xl border border-[#E3E2ED]/12 bg-[#0A0C14] text-sm font-medium text-[#A4A3B1] transition-colors hover:bg-[#E3E2ED]/5 hover:text-[#E3E2ED] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#A98AEF] focus-visible:outline-offset-2">Restart tour</button>
            </div>
          </section>
        </div>
      </div>

      {isMainFormDirty ? (
        <div
          className="fixed inset-x-0 bottom-0 z-50 flex h-14 items-center justify-between border-t border-[rgba(227,226,237,0.08)] bg-[#0A0C14] px-4 md:px-8"
          style={{ paddingBottom: "max(0px, env(safe-area-inset-bottom))" }}
        >
          <p className="text-sm text-[#A4A3B1]">Unsaved changes</p>
          <div className="flex items-center gap-3">
            {saved ? <p className="text-sm text-bone-muted">Saved</p> : null}
            <button
              type="button"
              onClick={handleSave}
              disabled={!hydrated || isPending}
              className="rounded-xl bg-[#A98AEF] px-5 py-2.5 text-sm font-medium text-[#0A0C14] transition hover:bg-[#A98AEF]/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#A98AEF] focus-visible:outline-offset-2 disabled:cursor-default disabled:opacity-45"
            >
              {isPending ? "Saving…" : "Save"}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

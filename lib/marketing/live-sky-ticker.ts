import "server-only";

import {
  getDailyLongitudes,
  getLunarPhaseLabel,
  getMoonIllumination,
  getMoonPhasesForYear,
  lonToDegreeInSign,
  lonToSign,
  msToJDE,
} from "@/lib/ephemeris/astronomia-adapter";
import type { LunarPhase } from "@/types/blueprint";

const DAY_MS = 86_400_000;

/** Shown only if the ephemeris throws. Labelled so nobody reads it as tonight's sky. */
const FALLBACK_ITEMS = [
  "SAMPLE SKY",
  "☉ 10°42′ CANCER",
  "☽ WANING GIBBOUS · 62%",
  "LIVE HUMAN DESIGN · WEATHER × BODY",
];

const PHASE_LABELS: Record<LunarPhase, string> = {
  new: "NEW MOON",
  "waxing-crescent": "WAXING CRESCENT",
  "first-quarter": "FIRST QUARTER",
  "waxing-gibbous": "WAXING GIBBOUS",
  full: "FULL MOON",
  "waning-gibbous": "WANING GIBBOUS",
  "last-quarter": "LAST QUARTER",
  "waning-crescent": "WANING CRESCENT",
};

function formatPosition(lon: number): string {
  const inSign = lonToDegreeInSign(lon);
  let degrees = Math.floor(inSign);
  let minutes = Math.round((inSign - degrees) * 60);
  if (minutes === 60) {
    degrees += 1;
    minutes = 0;
  }
  return `${degrees}°${String(minutes).padStart(2, "0")}′ ${lonToSign(lon).toUpperCase()}`;
}

function isRetrograde(today: number, twoDaysAgo: number): boolean {
  let diff = today - twoDaysAgo;
  if (diff > 180) diff -= 360;
  if (diff < -180) diff += 360;
  return diff < 0;
}

function nextFullMoonLabel(now: Date): string | null {
  const today = now.toISOString().slice(0, 10);
  const year = now.getUTCFullYear();
  const next = [...getMoonPhasesForYear(year), ...getMoonPhasesForYear(year + 1)].find(
    (event) => event.phase === "full" && event.date >= today,
  );
  if (!next) return null;

  const days = Math.round(
    (Date.parse(`${next.date}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / DAY_MS,
  );
  if (days === 0) return `FULL MOON TODAY · ${next.sign.toUpperCase()}`;
  if (days === 1) return `FULL MOON TOMORROW · ${next.sign.toUpperCase()}`;
  return `NEXT FULL MOON · ${days} DAYS · ${next.sign.toUpperCase()}`;
}

/**
 * The home page ticker, calculated from the real sky at request time.
 * Falls back to a clearly labelled sample if the ephemeris fails.
 */
export function buildLiveSkyTicker(now: Date = new Date()): string[] {
  try {
    const jde = msToJDE(now.getTime());
    const sky = getDailyLongitudes(jde);
    const earlier = getDailyLongitudes(jde - 2);
    const illumination = Math.round(getMoonIllumination(sky.sun, sky.moon) * 100);
    const phase = PHASE_LABELS[getLunarPhaseLabel(sky.sun, sky.moon)];

    const saturnRx = isRetrograde(sky.saturn, earlier.saturn) ? " · RETROGRADE" : "";
    const jupiterRx = isRetrograde(sky.jupiter, earlier.jupiter) ? " · RETROGRADE" : "";
    const mercuryRx = isRetrograde(sky.mercury, earlier.mercury);

    const items = [
      `☉ ${formatPosition(sky.sun)}`,
      `☽ ${phase} · ${illumination}% · ${lonToSign(sky.moon).toUpperCase()}`,
      "LIVE HUMAN DESIGN · WEATHER × BODY",
      `♄ ${formatPosition(sky.saturn)}${saturnRx}`,
    ];

    const fullMoon = nextFullMoonLabel(now);
    if (fullMoon) items.push(fullMoon);

    items.push(`♃ ${formatPosition(sky.jupiter)}${jupiterRx}`);
    if (mercuryRx) items.push("☿ MERCURY RETROGRADE");

    return items;
  } catch (error) {
    console.error("[live-sky-ticker] Falling back to the sample sky:", error);
    return FALLBACK_ITEMS;
  }
}

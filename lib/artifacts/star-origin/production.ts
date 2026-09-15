import { createHash, randomUUID } from "node:crypto";

import { computeNatalChart, type BirthData } from "@/lib/ephemeris/astronomia-adapter";
import { buildBaseline, type Baseline } from "./baseline.ts";
import { generateStarOrigin } from "./generator.ts";
import { groupOf, isRanked, RANKED_LINEAGES } from "./lineages.ts";
import { scoreChart } from "./scoring.ts";
import { starPositionsForYear, type CatalogStar } from "./stars.ts";
import type {
  StarOriginArtifact,
  StarOriginNormalizedBirth,
  StarOriginTier,
} from "./contract.ts";

export const STAR_ORIGIN_BASELINE_VERSION = "star-origin.layer1.2026-08-21.n4000";
const BASELINE_SAMPLE_SIZE = 4_000;
const SCORING_ORB = 2.5;

const CITIES: ReadonlyArray<readonly [number, number, string]> = [
  [40.71, -74.01, "America/New_York"],
  [34.05, -118.24, "America/Los_Angeles"],
  [51.51, -0.13, "Europe/London"],
  [-33.87, 151.21, "Australia/Sydney"],
  [35.68, 139.65, "Asia/Tokyo"],
  [19.43, -99.13, "America/Mexico_City"],
  [52.52, 13.4, "Europe/Berlin"],
  [-23.55, -46.63, "America/Sao_Paulo"],
  [28.61, 77.21, "Asia/Kolkata"],
  [-26.2, 28.05, "Africa/Johannesburg"],
  [55.76, 37.62, "Europe/Moscow"],
  [1.35, 103.82, "Asia/Singapore"],
];

function mulberry32(seed: number) {
  return function random() {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let value = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    value = (value + Math.imul(value ^ (value >>> 7), 61 | value)) ^ value;
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

function groupedScores(
  birth: BirthData,
  year: number,
  positions: ReadonlyArray<{ star: CatalogStar; longitude: number }>,
): Map<string, number> {
  const chart = computeNatalChart(birth, "whole_sign");
  const scored = scoreChart(chart, year, { orb: SCORING_ORB, starPositions: positions });
  const grouped = new Map<string, number>();
  for (const [lineage, points] of scored.byLineage) {
    if (!isRanked(lineage)) continue;
    const key = groupOf(lineage);
    grouped.set(key, (grouped.get(key) ?? 0) + points);
  }
  return grouped;
}

function buildProductionBaseline(): Baseline {
  const random = mulberry32(20260819);
  const start = Date.UTC(1950, 0, 1);
  const end = Date.UTC(2010, 11, 31);
  const positions = new Map<number, ReturnType<typeof starPositionsForYear>>();
  const scores: Map<string, number>[] = [];

  for (let index = 0; index < BASELINE_SAMPLE_SIZE; index += 1) {
    const date = new Date(start + random() * (end - start));
    const [lat, lng, timezone] = CITIES[Math.floor(random() * CITIES.length)];
    const year = date.getUTCFullYear();
    let yearPositions = positions.get(year);
    if (!yearPositions) {
      yearPositions = starPositionsForYear(year);
      positions.set(year, yearPositions);
    }
    scores.push(
      groupedScores(
        {
          date: `${year}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`,
          time: `${pad(Math.floor(random() * 24))}:${pad(Math.floor(random() * 60))}`,
          timezone,
          lat,
          lng,
          timeUnknown: false,
        },
        year,
        yearPositions,
      ),
    );
  }

  return buildBaseline(scores, RANKED_LINEAGES, STAR_ORIGIN_BASELINE_VERSION);
}

const baselineGlobal = globalThis as typeof globalThis & {
  __kiarosStarOriginBaseline?: Baseline;
};

export function getProductionStarOriginBaseline(): Baseline {
  baselineGlobal.__kiarosStarOriginBaseline ??= buildProductionBaseline();
  return baselineGlobal.__kiarosStarOriginBaseline;
}

function canonicalJson(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalJson);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, item]) => [key, canonicalJson(item)]),
    );
  }
  return value;
}

export function starOriginChartFingerprint(
  birth: StarOriginNormalizedBirth,
  chart: ReturnType<typeof computeNatalChart>,
): string {
  return `sha256:${createHash("sha256")
    .update(JSON.stringify(canonicalJson({ birth, chart, houseSystem: "whole_sign" })))
    .digest("hex")}`;
}

export interface GenerateProductionStarOriginInput {
  artifactId?: string;
  displayName: string | null;
  tier: Extract<StarOriginTier, "mini" | "standard">;
  normalizedBirth: StarOriginNormalizedBirth;
}

export function generateProductionStarOrigin(
  input: GenerateProductionStarOriginInput,
): StarOriginArtifact {
  const { normalizedBirth } = input;
  const time = normalizedBirth.timeUnknown ? "12:00" : normalizedBirth.time;
  if (!time) throw new RangeError("A known-time Star Origin report requires a birth time.");

  const birth: BirthData = {
    date: normalizedBirth.date,
    time,
    timezone: normalizedBirth.timezone,
    lat: normalizedBirth.latitude,
    lng: normalizedBirth.longitude,
    timeUnknown: normalizedBirth.timeUnknown,
  };
  const chart = computeNatalChart(birth, "whole_sign");

  return generateStarOrigin({
    artifactId: input.artifactId ?? `star_${randomUUID().split("-").join("")}`,
    displayName: input.displayName,
    tier: input.tier,
    normalizedBirth,
    chart,
    year: Number(normalizedBirth.date.slice(0, 4)),
    baseline: getProductionStarOriginBaseline(),
    baselineVersion: STAR_ORIGIN_BASELINE_VERSION,
    chartFingerprint: starOriginChartFingerprint(normalizedBirth, chart),
    ephemerisProvider: "astronomia",
    ephemerisVersion: "4.2.0",
  });
}

import { createHash } from "node:crypto";

import {
  computeNatalChart,
  getDailyLongitudesForDate,
  getSunLongitude,
  lonToDegreeInSign,
  lonToSign,
  normalizeDeg,
  type BirthData,
} from "../../ephemeris/astronomia-adapter.ts";
import {
  ZODIAC_SIGNS,
  type AspectType,
  type NatalChart,
  type Planet,
  type ZodiacSign,
} from "../../../types/blueprint.ts";
import {
  YEAR_AHEAD_SCHEMA_VERSION,
  YearAheadContractError,
  type YearAheadActivationWindow,
  type YearAheadCalculation,
  type YearAheadFact,
  type YearAheadInput,
  type YearAheadLifeArea,
  type YearAheadPlacement,
  type YearAheadProfection,
  type YearAheadQuarter,
} from "./contract.ts";

const DAY_MS = 86_400_000;

function angularSep(left: number, right: number): number {
  const difference = Math.abs(normalizeDeg(left - right));
  return difference > 180 ? 360 - difference : difference;
}
const PLANETS: readonly Planet[] = [
  "Sun", "Moon", "Mercury", "Venus", "Mars",
  "Jupiter", "Saturn", "Uranus", "Neptune", "Pluto",
];
const TRANSITING_PLANETS: readonly Planet[] = [
  "Mars", "Jupiter", "Saturn", "Uranus", "Neptune", "Pluto",
];
const ASPECTS: ReadonlyArray<{ aspect: AspectType; angle: number }> = [
  { aspect: "conjunction", angle: 0 },
  { aspect: "opposition", angle: 180 },
  { aspect: "square", angle: 90 },
  { aspect: "trine", angle: 120 },
  { aspect: "sextile", angle: 60 },
];

const SIGN_RULERS: Record<ZodiacSign, Planet> = {
  Aries: "Mars", Taurus: "Venus", Gemini: "Mercury", Cancer: "Moon",
  Leo: "Sun", Virgo: "Mercury", Libra: "Venus", Scorpio: "Mars",
  Sagittarius: "Jupiter", Capricorn: "Saturn", Aquarius: "Saturn", Pisces: "Jupiter",
};

const HOUSE_DATA: Record<number, { theme: string; topic: string; area: YearAheadLifeArea }> = {
  1: { theme: "Embodiment", topic: "identity, vitality, and self-definition", area: "identity" },
  2: { theme: "Roots", topic: "values, resources, and stability", area: "resources" },
  3: { theme: "Voice", topic: "learning, communication, and daily rhythm", area: "communication" },
  4: { theme: "Foundation", topic: "home, family, and emotional grounding", area: "home" },
  5: { theme: "Expression", topic: "creativity, pleasure, and courageous visibility", area: "creativity" },
  6: { theme: "Devotion", topic: "craft, routines, service, and wellbeing", area: "wellbeing" },
  7: { theme: "Reciprocity", topic: "partnership, collaboration, and mutuality", area: "relationships" },
  8: { theme: "Alchemy", topic: "shared resources, intimacy, and transformation", area: "transformation" },
  9: { theme: "Expansion", topic: "meaning, study, travel, and worldview", area: "meaning" },
  10: { theme: "Legacy", topic: "vocation, reputation, and visible contribution", area: "calling" },
  11: { theme: "Alliances", topic: "community, belonging, and future vision", area: "community" },
  12: { theme: "Surrender", topic: "rest, retreat, healing, and spiritual release", area: "restoration" },
};

const PLANET_WEIGHT: Record<Planet, number> = {
  Sun: 0, Moon: 0, Mercury: 0, Venus: 0,
  Mars: 4, Jupiter: 7, Saturn: 9, Uranus: 9, Neptune: 8, Pluto: 10,
};
const POINT_WEIGHT: Record<Planet | "Ascendant" | "Midheaven", number> = {
  Sun: 6, Moon: 6, Mercury: 3, Venus: 4, Mars: 4,
  Jupiter: 3, Saturn: 4, Uranus: 2, Neptune: 2, Pluto: 3,
  Ascendant: 6, Midheaven: 6,
};
const ASPECT_WEIGHT: Record<AspectType, number> = {
  conjunction: 6, opposition: 5, square: 5, trine: 3, sextile: 2,
};

function fail(message: string): never {
  throw new YearAheadContractError(message);
}

function assertIsoDate(value: string, label: string): void {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) fail(`${label} must use YYYY-MM-DD.`);
  const parsed = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(parsed.valueOf()) || parsed.toISOString().slice(0, 10) !== value) {
    fail(`${label} is not a calendar date.`);
  }
}

function assertTimezone(timezone: string): void {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: timezone }).format(new Date(0));
  } catch {
    fail(`Invalid IANA timezone: ${timezone}.`);
  }
}

export function validateYearAheadInput(input: YearAheadInput): void {
  if (!/^year_[A-Za-z0-9_-]{8,80}$/.test(input.artifactId)) {
    fail("artifactId must be an opaque year_ identifier.");
  }
  if (input.displayName !== null && (input.displayName.trim().length < 1 || input.displayName.length > 80)) {
    fail("displayName must contain 1–80 characters.");
  }
  assertIsoDate(input.normalizedBirth.date, "birth date");
  if (!/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(input.normalizedBirth.time)) {
    fail("An exact birth time is required in HH:MM format.");
  }
  if (!Number.isInteger(input.targetBirthdayYear) || input.targetBirthdayYear < 1900 || input.targetBirthdayYear > 2200) {
    fail("targetBirthdayYear must be between 1900 and 2200.");
  }
  const birthYear = Number(input.normalizedBirth.date.slice(0, 4));
  if (input.targetBirthdayYear < birthYear) fail("The forecast year cannot precede the birth year.");
  for (const [label, place] of [["birth place", input.normalizedBirth], ["birthday place", input.returnPlace]] as const) {
    if (!place.city.trim() || !place.country.trim()) fail(`${label} needs a city and country.`);
    if (!Number.isFinite(place.latitude) || place.latitude < -90 || place.latitude > 90) fail(`${label} latitude is invalid.`);
    if (!Number.isFinite(place.longitude) || place.longitude < -180 || place.longitude > 180) fail(`${label} longitude is invalid.`);
    assertTimezone(place.timezone);
  }
}

function jdeFromMs(ms: number): number {
  return 2440587.5 + ms / DAY_MS;
}

function signedAngularDelta(value: number, target: number): number {
  const delta = normalizeDeg(value - target);
  return delta > 180 ? delta - 360 : delta;
}

function birthdayEstimate(birthDate: string, year: number): Date {
  const [, month, day] = birthDate.split("-").map(Number);
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return new Date(Date.UTC(year, month - 1, Math.min(day, lastDay), 12, 0, 0));
}

export function findSolarReturnExactUtc(natalSunLongitude: number, birthDate: string, year: number): Date {
  let ms = birthdayEstimate(birthDate, year).getTime();
  for (let iteration = 0; iteration < 8; iteration += 1) {
    const delta = signedAngularDelta(getSunLongitude(jdeFromMs(ms)), natalSunLongitude);
    ms -= (delta / 0.98564736) * DAY_MS;
  }
  return new Date(ms);
}

function birthData(input: YearAheadInput): BirthData {
  return {
    date: input.normalizedBirth.date,
    time: input.normalizedBirth.time,
    timezone: input.normalizedBirth.timezone,
    lat: input.normalizedBirth.latitude,
    lng: input.normalizedBirth.longitude,
    timeUnknown: false,
  };
}

function returnChartAt(exact: Date, input: YearAheadInput): NatalChart {
  const iso = exact.toISOString();
  return computeNatalChart({
    date: iso.slice(0, 10),
    time: iso.slice(11, 16),
    timezone: "UTC",
    lat: input.returnPlace.latitude,
    lng: input.returnPlace.longitude,
    timeUnknown: false,
  }, "whole_sign");
}

function placement(chart: NatalChart, planet: Planet): YearAheadPlacement {
  const position = chart[planet.toLowerCase() as Lowercase<Planet>];
  return { planet, longitude: position.longitude, sign: position.sign, degree: position.degree, house: position.house };
}

function profectionFor(input: YearAheadInput, natal: NatalChart): YearAheadProfection {
  const birthYear = Number(input.normalizedBirth.date.slice(0, 4));
  const age = input.targetBirthdayYear - birthYear;
  const house = (age % 12) + 1;
  const risingIndex = ZODIAC_SIGNS.indexOf(natal.rising);
  const sign = ZODIAC_SIGNS[(risingIndex + house - 1) % 12];
  const data = HOUSE_DATA[house];
  return { age, house, sign, lord: SIGN_RULERS[sign], theme: data.theme, topic: data.topic };
}

interface NatalPoint {
  name: Planet | "Ascendant" | "Midheaven";
  longitude: number;
  house: number;
}

interface CandidateWindow extends Omit<YearAheadActivationWindow, "id" | "rank"> {
  key: string;
}

function planetLongitude(longitudes: ReturnType<typeof getDailyLongitudesForDate>, planet: Planet): number {
  return longitudes[planet.toLowerCase() as Lowercase<Planet>];
}

function closestAspect(transitLongitude: number, natalLongitude: number): { aspect: AspectType; orb: number } {
  const separation = angularSep(transitLongitude, natalLongitude);
  return ASPECTS.map(({ aspect, angle }) => ({ aspect, orb: Math.abs(separation - angle) }))
    .sort((left, right) => left.orb - right.orb)[0];
}

function addUtcDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * DAY_MS);
}

function dateOnly(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function windowTitle(planet: Planet, aspect: AspectType, point: NatalPoint["name"]): string {
  return `${planet} ${aspect} natal ${point}`;
}

function rankActivationWindows(
  natal: NatalChart,
  profection: YearAheadProfection,
  start: Date,
  end: Date,
): YearAheadCalculation["activationWindows"] {
  const points: NatalPoint[] = PLANETS.map((planet) => ({
    name: planet,
    longitude: natal[planet.toLowerCase() as Lowercase<Planet>].longitude,
    house: natal[planet.toLowerCase() as Lowercase<Planet>].house,
  }));
  if (natal.ascendantLongitude === undefined || natal.midheavenLongitude === undefined) {
    fail("Year Ahead requires a known birth time and stable natal angles.");
  }
  points.push(
    { name: "Ascendant", longitude: natal.ascendantLongitude, house: 1 },
    { name: "Midheaven", longitude: natal.midheavenLongitude, house: 10 },
  );

  const active = new Map<string, CandidateWindow>();
  const completed: CandidateWindow[] = [];
  for (let cursor = new Date(start); cursor <= end; cursor = addUtcDays(cursor, 1)) {
    const day = dateOnly(cursor);
    const positions = getDailyLongitudesForDate(day);
    const priorPositions = getDailyLongitudesForDate(dateOnly(addUtcDays(cursor, -1)));
    const seenToday = new Set<string>();
    for (const transitingPlanet of TRANSITING_PLANETS) {
      const transitLongitude = planetLongitude(positions, transitingPlanet);
      const priorLongitude = planetLongitude(priorPositions, transitingPlanet);
      for (const point of points) {
        const { aspect, orb } = closestAspect(transitLongitude, point.longitude);
        const threshold = transitingPlanet === "Mars" ? 1.5 : 2.5;
        if (orb > threshold) continue;
        const key = `${transitingPlanet}.${aspect}.${point.name}`;
        seenToday.add(key);
        const priorOrb = closestAspect(priorLongitude, point.longitude).orb;
        const profectionRelevant = point.house === profection.house || point.name === profection.lord;
        const score = PLANET_WEIGHT[transitingPlanet] + POINT_WEIGHT[point.name] + ASPECT_WEIGHT[aspect] +
          (profectionRelevant ? 6 : 0) + Math.max(0, 3 - orb);
        const existing = active.get(key);
        if (!existing) {
          active.set(key, {
            key,
            title: windowTitle(transitingPlanet, aspect, point.name),
            startDate: day,
            peakDate: day,
            endDate: day,
            transitingPlanet,
            natalPoint: point.name,
            aspect,
            peakOrb: orb,
            applyingAtPeak: priorOrb > orb,
            natalHouse: point.house,
            lifeArea: HOUSE_DATA[point.house].area,
            profectionRelevant,
            score,
          });
        } else {
          existing.endDate = day;
          if (orb < existing.peakOrb) {
            existing.peakDate = day;
            existing.peakOrb = orb;
            existing.applyingAtPeak = priorOrb > orb;
            existing.score = score;
          }
        }
      }
    }
    for (const [key, candidate] of active) {
      if (!seenToday.has(key)) {
        completed.push(candidate);
        active.delete(key);
      }
    }
  }
  completed.push(...active.values());

  const strongestByKey = new Map<string, CandidateWindow>();
  for (const candidate of completed) {
    const current = strongestByKey.get(candidate.key);
    if (!current || candidate.score > current.score || candidate.peakOrb < current.peakOrb) {
      strongestByKey.set(candidate.key, candidate);
    }
  }
  const selected = [...strongestByKey.values()]
    .sort((left, right) => right.score - left.score || left.peakOrb - right.peakOrb || left.peakDate.localeCompare(right.peakDate))
    .slice(0, 3);
  if (selected.length !== 3) fail("The annual scan did not produce three distinct activation windows.");
  const ranked = selected.map(({ key: _key, ...candidate }, index) => ({
    ...candidate,
    id: `activation.${index + 1}` as YearAheadActivationWindow["id"],
    rank: (index + 1) as 1 | 2 | 3,
    peakOrb: Math.round(candidate.peakOrb * 100) / 100,
    score: Math.round(candidate.score * 100) / 100,
  }));
  return [ranked[0], ranked[1], ranked[2]];
}

function quartersFor(
  start: Date,
  end: Date,
  windows: YearAheadCalculation["activationWindows"],
): YearAheadCalculation["quarters"] {
  const span = end.getTime() - start.getTime();
  const quarters = ([1, 2, 3, 4] as const).map((quarter, index) => {
    const quarterStart = new Date(start.getTime() + (span * index) / 4);
    const quarterEnd = index === 3
      ? end
      : addUtcDays(new Date(start.getTime() + (span * (index + 1)) / 4), -1);
    const startDate = dateOnly(quarterStart);
    const endDate = dateOnly(quarterEnd);
    return {
      quarter,
      startDate,
      endDate,
      activationIds: windows
        .filter((window) => window.peakDate >= startDate && window.peakDate <= endDate)
        .map((window) => window.id),
    } satisfies YearAheadQuarter;
  });
  return [quarters[0], quarters[1], quarters[2], quarters[3]];
}

function formatPlacement(item: YearAheadPlacement): string {
  return `${item.planet} at ${item.degree.toFixed(2)}° ${item.sign} in house ${item.house}`;
}

function factsFor(
  profection: YearAheadProfection,
  natalPlacements: readonly YearAheadPlacement[],
  returnPlacements: readonly YearAheadPlacement[],
  windows: YearAheadCalculation["activationWindows"],
  returnChart: NatalChart,
  exact: Date,
  input: YearAheadInput,
): readonly YearAheadFact[] {
  const facts: YearAheadFact[] = [
    {
      id: "profection.year",
      statement: `Age ${profection.age} activates the ${profection.house}${ordinal(profection.house)} whole-sign house in ${profection.sign}; ${profection.lord} is Lord of the Year, emphasizing ${profection.topic}.`,
    },
    {
      id: "solar_return.exact",
      statement: `The solar return perfects at ${exact.toISOString()} and is cast for ${input.returnPlace.city}, ${input.returnPlace.country}.`,
    },
    {
      id: "solar_return.angles",
      statement: `The solar-return Ascendant is ${returnChart.rising}; the Midheaven is ${lonToDegreeInSign(returnChart.midheavenLongitude ?? 0).toFixed(2)}° ${lonToSign(returnChart.midheavenLongitude ?? 0)}.`,
    },
  ];
  for (const item of natalPlacements) facts.push({ id: `natal.${item.planet}`, statement: `Natal ${formatPlacement(item)}.` });
  for (const item of returnPlacements) facts.push({ id: `solar_return.${item.planet}`, statement: `Solar-return ${formatPlacement(item)}.` });
  for (const window of windows) {
    facts.push({
      id: window.id,
      statement: `${window.title} is within the selected orb from ${window.startDate} through ${window.endDate}, closest on ${window.peakDate} at ${window.peakOrb.toFixed(2)}°; it emphasizes ${HOUSE_DATA[window.natalHouse].topic}${window.profectionRelevant ? " and directly reinforces the profection year" : ""}.`,
    });
  }
  return facts;
}

function ordinal(value: number): string {
  if (value % 100 >= 11 && value % 100 <= 13) return "th";
  return value % 10 === 1 ? "st" : value % 10 === 2 ? "nd" : value % 10 === 3 ? "rd" : "th";
}

function canonicalJson(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalJson);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, item]) => [key, canonicalJson(item)]));
  }
  return value;
}

export function calculateYearAhead(input: YearAheadInput): YearAheadCalculation {
  validateYearAheadInput(input);
  const natal = computeNatalChart(birthData(input), "whole_sign");
  if (natal.ascendantLongitude === undefined || natal.midheavenLongitude === undefined) {
    fail("Year Ahead requires a known birth time.");
  }
  const exact = findSolarReturnExactUtc(natal.sun.longitude, input.normalizedBirth.date, input.targetBirthdayYear);
  const nextExact = findSolarReturnExactUtc(natal.sun.longitude, input.normalizedBirth.date, input.targetBirthdayYear + 1);
  const end = addUtcDays(nextExact, -1);
  const returnChart = returnChartAt(exact, input);
  if (returnChart.ascendantLongitude === undefined || returnChart.midheavenLongitude === undefined) {
    fail("The solar-return angles could not be calculated.");
  }
  const profection = profectionFor(input, natal);
  const natalPlacements = PLANETS.map((planet) => placement(natal, planet));
  const solarReturnPlacements = PLANETS.map((planet) => placement(returnChart, planet));
  const activationWindows = rankActivationWindows(natal, profection, exact, end);
  const quarters = quartersFor(exact, end, activationWindows);
  const facts = factsFor(profection, natalPlacements, solarReturnPlacements, activationWindows, returnChart, exact, input);
  const fingerprintPayload = {
    input,
    exact: exact.toISOString(),
    natalPlacements,
    solarReturnPlacements,
    activationWindows,
    profection,
  };
  return {
    forecastStart: dateOnly(exact),
    forecastEnd: dateOnly(end),
    solarReturnExactUtc: exact.toISOString(),
    solarReturnSunErrorDegrees: Math.abs(signedAngularDelta(getSunLongitude(jdeFromMs(exact.getTime())), natal.sun.longitude)),
    profection,
    natalPlacements,
    solarReturnPlacements,
    solarReturnAngles: {
      ascendantLongitude: returnChart.ascendantLongitude,
      ascendantSign: returnChart.rising,
      midheavenLongitude: returnChart.midheavenLongitude,
      midheavenSign: lonToSign(returnChart.midheavenLongitude),
    },
    activationWindows,
    quarters,
    facts,
    provenance: {
      zodiac: "tropical",
      natalHouseSystem: "whole_sign",
      solarReturnHouseSystem: "whole_sign",
      calculationVersion: YEAR_AHEAD_SCHEMA_VERSION,
      ephemerisProvider: "astronomia",
      ephemerisVersion: "4.2.0",
      chartFingerprint: `sha256:${createHash("sha256").update(JSON.stringify(canonicalJson(fingerprintPayload))).digest("hex")}`,
    },
  };
}

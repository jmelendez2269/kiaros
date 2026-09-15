import { createHash } from "node:crypto";

import {
  computeNatalChart,
  getDailyLongitudesForDate,
  lonToSign,
  type BirthData,
} from "../../ephemeris/astronomia-adapter.ts";
import { computeNatalAspects } from "../../ephemeris/natal-aspects.ts";
import type { NatalChart, Planet, ZodiacSign } from "../../../types/blueprint.ts";

import {
  ANCHOR_NON_MOON_PLANETS,
  type AnchorCalculation,
  type AnchorNarrative,
  type AnchorNormalizedBirth,
  type AnchorPlanetPlacement,
  type AnchorPrintInput,
} from "./contract.ts";
import { validateAnchorPrintInput } from "./generator.ts";

export const ANCHOR_CALCULATION_VERSION = "anchor-calculation.astronomia.v1" as const;
export const ANCHOR_EPHEMERIS_VERSION = "4.2.0" as const;

const PLANET_KEYS: Record<Exclude<Planet, "Moon">, keyof ReturnType<typeof getDailyLongitudesForDate>> = {
  Sun: "sun",
  Mercury: "mercury",
  Venus: "venus",
  Mars: "mars",
  Jupiter: "jupiter",
  Saturn: "saturn",
  Uranus: "uranus",
  Neptune: "neptune",
  Pluto: "pluto",
};

const TRADITIONAL_RULER: Record<ZodiacSign, Exclude<Planet, "Moon"> | "Moon"> = {
  Aries: "Mars",
  Taurus: "Venus",
  Gemini: "Mercury",
  Cancer: "Moon",
  Leo: "Sun",
  Virgo: "Mercury",
  Libra: "Venus",
  Scorpio: "Mars",
  Sagittarius: "Jupiter",
  Capricorn: "Saturn",
  Aquarius: "Saturn",
  Pisces: "Jupiter",
};

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

function shiftedIsoDate(date: string, days: number): string {
  const value = new Date(`${date}T12:00:00.000Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

function signedLongitudeChange(current: number, prior: number): number {
  let difference = current - prior;
  if (difference > 180) difference -= 360;
  if (difference < -180) difference += 360;
  return difference;
}

function positionFor(chart: NatalChart, planet: Exclude<Planet, "Moon">) {
  return chart[planet.toLowerCase() as Lowercase<Exclude<Planet, "Moon">>];
}

function chartFingerprint(birth: AnchorNormalizedBirth, chart: NatalChart): string {
  return `sha256:${createHash("sha256")
    .update(JSON.stringify(canonicalJson({ birth, chart, houseSystem: "whole_sign" })))
    .digest("hex")}`;
}

function calculateMoonRange(birth: AnchorNormalizedBirth) {
  const base = {
    date: birth.date,
    timezone: birth.timezone,
    lat: birth.latitude,
    lng: birth.longitude,
    timeUnknown: false,
  };
  const start = computeNatalChart({ ...base, time: "00:00" }, "whole_sign").moon;
  const end = computeNatalChart({ ...base, time: "23:59" }, "whole_sign").moon;
  if (start.sign === end.sign) {
    return {
      kind: "date_stable" as const,
      sign: start.sign,
      degreeRange: [start.degree, end.degree] as const,
    };
  }
  return {
    kind: "sign_uncertain" as const,
    possibleSigns: [start.sign, end.sign] as const,
  };
}

export function buildProductionAnchorCalculation(
  normalizedBirth: AnchorNormalizedBirth,
): AnchorCalculation {
  const birth: BirthData = {
    date: normalizedBirth.date,
    time: normalizedBirth.timeUnknown ? "12:00" : normalizedBirth.time,
    timezone: normalizedBirth.timezone,
    lat: normalizedBirth.latitude,
    lng: normalizedBirth.longitude,
    timeUnknown: normalizedBirth.timeUnknown,
  };
  const chart = computeNatalChart(birth, "whole_sign");
  const midheavenLongitude = normalizedBirth.timeUnknown
    ? null
    : (computeNatalChart(birth, "porphyry").houseCusps?.[9] ?? null);
  const current = getDailyLongitudesForDate(normalizedBirth.date);
  const prior = getDailyLongitudesForDate(shiftedIsoDate(normalizedBirth.date, -2));
  const placements: AnchorPlanetPlacement[] = ANCHOR_NON_MOON_PLANETS.map((planet) => {
    const position = positionFor(chart, planet);
    const key = PLANET_KEYS[planet];
    return {
      planet,
      longitude: position.longitude,
      sign: position.sign,
      degree: position.degree,
      house: normalizedBirth.timeUnknown ? null : position.house,
      retrograde:
        planet === "Sun" ? false : signedLongitudeChange(current[key], prior[key]) < 0,
    };
  });

  return {
    placements,
    moon: normalizedBirth.timeUnknown
      ? calculateMoonRange(normalizedBirth)
      : {
          kind: "exact",
          longitude: chart.moon.longitude,
          sign: chart.moon.sign,
          degree: chart.moon.degree,
          house: chart.moon.house,
        },
    angles: normalizedBirth.timeUnknown
      ? {
          ascendantLongitude: null,
          ascendantSign: null,
          midheavenLongitude: null,
          midheavenSign: null,
        }
      : {
          ascendantLongitude: chart.ascendantLongitude ?? null,
          ascendantSign: chart.ascendantLongitude === undefined ? null : lonToSign(chart.ascendantLongitude),
          midheavenLongitude,
          midheavenSign: midheavenLongitude === null ? null : lonToSign(midheavenLongitude),
        },
    aspects: computeNatalAspects(chart)
      .filter((aspect) => !normalizedBirth.timeUnknown || (aspect.a !== "Moon" && aspect.b !== "Moon"))
      .map((aspect) => ({
        first: aspect.a,
        second: aspect.b,
        type: aspect.aspect,
        orb: aspect.orb,
      })),
    provenance: {
      zodiac: "tropical",
      houseSystem: "whole_sign",
      calculationVersion: ANCHOR_CALCULATION_VERSION,
      ephemerisProvider: "astronomia",
      ephemerisVersion: ANCHOR_EPHEMERIS_VERSION,
      timezoneProvenance: `operator-confirmed-IANA:${normalizedBirth.timezone}`,
      chartFingerprint: chartFingerprint(normalizedBirth, chart),
    },
  };
}

function placementStatement(placement: AnchorPlanetPlacement): string {
  const house = placement.house === null ? "house omitted" : `House ${placement.house}`;
  const retrograde = placement.retrograde ? ", retrograde" : "";
  return `${placement.planet} at ${placement.degree.toFixed(2)} degrees ${placement.sign}, ${house}${retrograde}.`;
}

export interface AnchorNarrativeFact {
  id: string;
  statement: string;
}

export function buildAnchorNarrativeFacts(
  calculation: AnchorCalculation,
  timeUnknown: boolean,
): readonly AnchorNarrativeFact[] {
  const facts: AnchorNarrativeFact[] = calculation.placements.map((placement) => ({
    id: `placement.${placement.planet}`,
    statement: placementStatement(placement),
  }));

  if (calculation.moon.kind === "exact") {
    facts.push({
      id: "placement.Moon",
      statement: `Moon at ${calculation.moon.degree.toFixed(2)} degrees ${calculation.moon.sign}, House ${calculation.moon.house}.`,
    });
  } else if (calculation.moon.kind === "date_stable") {
    facts.push({
      id: "placement.Moon",
      statement: `Moon remained in ${calculation.moon.sign}; its degree ranged from ${calculation.moon.degreeRange[0].toFixed(2)} to ${calculation.moon.degreeRange[1].toFixed(2)} during the local birth date.`,
    });
  } else {
    facts.push({
      id: "placement.Moon",
      statement: `Moon may be in ${calculation.moon.possibleSigns[0]} or ${calculation.moon.possibleSigns[1]}; no Moon-dependent interpretation is stable.`,
    });
  }

  if (timeUnknown) {
    facts.push(
      { id: "time.unknown", statement: "Birth time is unknown; houses and angles must not be interpreted." },
      { id: "moon.uncertainty", statement: "Moon-dependent aspects and unstable Moon claims must be omitted." },
    );
  } else if (calculation.angles.ascendantSign && calculation.angles.midheavenSign) {
    const ruler = TRADITIONAL_RULER[calculation.angles.ascendantSign];
    facts.push(
      {
        id: "angle.Ascendant",
        statement: `Ascendant is ${calculation.angles.ascendantSign}; its traditional chart ruler is ${ruler}.`,
      },
      { id: "angle.Midheaven", statement: `Midheaven is ${calculation.angles.midheavenSign}.` },
      { id: "pattern.houses", statement: "Whole Sign houses are available and may be interpreted." },
    );
  }

  facts.push(
    { id: "pattern.elements", statement: "Element emphasis must be derived only from the supplied placement signs." },
    { id: "pattern.modalities", statement: "Modality emphasis must be derived only from the supplied placement signs." },
    { id: "pattern.polarities", statement: "Polarity emphasis must be derived only from the supplied placement signs." },
  );

  for (const aspect of calculation.aspects) {
    facts.push({
      id: `aspect.${aspect.first}.${aspect.second}.${aspect.type}`,
      statement: `${aspect.first} ${aspect.type} ${aspect.second}, ${aspect.orb.toFixed(2)} degree orb.`,
    });
  }
  return facts;
}

export interface ProductionAnchorInputRequest {
  artifactId: string;
  displayName: string | null;
  normalizedBirth: AnchorNormalizedBirth;
  narrative: AnchorNarrative;
}

export function createProductionAnchorInput(request: ProductionAnchorInputRequest): AnchorPrintInput {
  const input: AnchorPrintInput = {
    artifactId: request.artifactId,
    displayName: request.displayName,
    normalizedBirth: request.normalizedBirth,
    calculation: buildProductionAnchorCalculation(request.normalizedBirth),
    narrative: request.narrative,
  };
  validateAnchorPrintInput(input);
  return input;
}

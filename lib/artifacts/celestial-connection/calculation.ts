import { createHash } from "node:crypto";

import { computeNatalChart, lonToDegreeInSign, lonToSign, normalizeDeg, type BirthData } from "../../ephemeris/astronomia-adapter.ts";
import { ZODIAC_SIGNS, type AspectType, type NatalChart, type Planet } from "../../../types/blueprint.ts";
import {
  CELESTIAL_CONNECTION_SCHEMA_VERSION, CelestialConnectionContractError,
  type CelestialConnectionCalculation, type CelestialConnectionFact, type CelestialConnectionInput,
  type CompositePlacement, type CompositePointName, type ConnectionDomain, type ConnectionPersonInput,
  type ConnectionPlacement, type ConnectionPointName, type ConnectionSignature, type ConnectionTone,
} from "./contract.ts";

const PLANETS: readonly Planet[] = ["Sun", "Moon", "Mercury", "Venus", "Mars", "Jupiter", "Saturn", "Uranus", "Neptune", "Pluto"];
const ASPECTS: ReadonlyArray<{ aspect: AspectType; angle: number }> = [
  { aspect: "conjunction", angle: 0 }, { aspect: "sextile", angle: 60 }, { aspect: "square", angle: 90 },
  { aspect: "trine", angle: 120 }, { aspect: "opposition", angle: 180 },
];
const POINT_WEIGHT: Record<ConnectionPointName, number> = {
  Sun: 8, Moon: 9, Mercury: 7, Venus: 8, Mars: 7, Jupiter: 5, Saturn: 7,
  Uranus: 4, Neptune: 4, Pluto: 5, Ascendant: 8, Midheaven: 5, NorthNode: 6,
};
const ASPECT_WEIGHT: Record<AspectType, number> = { conjunction: 6, opposition: 5, square: 5, trine: 4, sextile: 3 };

function fail(message: string): never { throw new CelestialConnectionContractError(message); }
function assertIsoDate(value: string, label: string): void {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) fail(`${label} must use YYYY-MM-DD.`);
  const parsed = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(parsed.valueOf()) || parsed.toISOString().slice(0, 10) !== value) fail(`${label} is not a calendar date.`);
}
function assertTimezone(timezone: string, label: string): void {
  try { new Intl.DateTimeFormat("en-US", { timeZone: timezone }).format(new Date(0)); }
  catch { fail(`${label} has an invalid IANA timezone.`); }
}
function validatePerson(person: ConnectionPersonInput, label: string): void {
  if (person.displayName.trim().length < 1 || person.displayName.trim().length > 60) fail(`${label} needs a display name of 1–60 characters.`);
  assertIsoDate(person.date, `${label} birth date`);
  if (person.timeUnknown) { if (person.time !== null) fail(`${label} time must be empty when birth time is unknown.`); }
  else if (!person.time || !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(person.time)) fail(`${label} needs an exact birth time or an unknown-time choice.`);
  if (!person.place.city.trim() || !person.place.country.trim()) fail(`${label} needs a birth city and country.`);
  assertTimezone(person.place.timezone, label);
  if (!Number.isFinite(person.place.latitude) || person.place.latitude < -90 || person.place.latitude > 90) fail(`${label} latitude is invalid.`);
  if (!Number.isFinite(person.place.longitude) || person.place.longitude < -180 || person.place.longitude > 180) fail(`${label} longitude is invalid.`);
}
export function validateCelestialConnectionInput(input: CelestialConnectionInput): void {
  if (!/^connection_[A-Za-z0-9_-]{8,90}$/.test(input.artifactId)) fail("artifactId must be an opaque connection_ identifier.");
  validatePerson(input.personA, "Person A"); validatePerson(input.personB, "Person B");
}
function birthData(person: ConnectionPersonInput): BirthData {
  return { date: person.date, time: person.timeUnknown ? null : person.time, timezone: person.timeUnknown ? null : person.place.timezone,
    lat: person.place.latitude, lng: person.place.longitude, timeUnknown: person.timeUnknown };
}
function planetPosition(chart: NatalChart, planet: Planet) { return chart[planet.toLowerCase() as Lowercase<Planet>]; }
function houseAgainst(longitude: number, chart: NatalChart): number | null {
  if (chart.birthTimeUnknown) return null;
  return ((Math.floor(normalizeDeg(longitude) / 30) - ZODIAC_SIGNS.indexOf(chart.rising) + 12) % 12) + 1;
}
function placements(chart: NatalChart): ConnectionPlacement[] {
  const result: ConnectionPlacement[] = PLANETS.map((planet) => {
    const position = planetPosition(chart, planet);
    return { point: planet, longitude: position.longitude, sign: position.sign, degree: position.degree,
      house: chart.birthTimeUnknown ? null : position.house, timeSensitive: planet === "Moon" && chart.birthTimeUnknown };
  });
  if (chart.northNodeLongitude !== undefined) result.push({ point: "NorthNode", longitude: chart.northNodeLongitude,
    sign: lonToSign(chart.northNodeLongitude), degree: lonToDegreeInSign(chart.northNodeLongitude),
    house: houseAgainst(chart.northNodeLongitude, chart), timeSensitive: false });
  if (!chart.birthTimeUnknown && chart.ascendantLongitude !== undefined && chart.midheavenLongitude !== undefined) result.push(
    { point: "Ascendant", longitude: chart.ascendantLongitude, sign: lonToSign(chart.ascendantLongitude), degree: lonToDegreeInSign(chart.ascendantLongitude), house: 1, timeSensitive: false },
    { point: "Midheaven", longitude: chart.midheavenLongitude, sign: lonToSign(chart.midheavenLongitude), degree: lonToDegreeInSign(chart.midheavenLongitude), house: 10, timeSensitive: false },
  );
  return result;
}
function angularSeparation(left: number, right: number): number {
  const difference = Math.abs(normalizeDeg(left - right)); return difference > 180 ? 360 - difference : difference;
}
function pointOrb(point: ConnectionPointName): number {
  if (point === "Sun" || point === "Moon") return 6;
  if (point === "Ascendant" || point === "Midheaven" || point === "Mercury" || point === "Venus" || point === "Mars") return 5;
  return point === "NorthNode" ? 3.5 : 3;
}
function bestAspect(left: ConnectionPlacement, right: ConnectionPlacement) {
  const separation = angularSeparation(left.longitude, right.longitude);
  const match = ASPECTS.map((item) => ({ ...item, orb: Math.abs(separation - item.angle) })).sort((a, b) => a.orb - b.orb)[0];
  const limit = Math.min(pointOrb(left.point), pointOrb(right.point)) + (match.aspect === "conjunction" ? 0.5 : 0);
  return match.orb <= limit ? { ...match, limit } : null;
}
function domainFor(left: ConnectionPointName, right: ConnectionPointName): ConnectionDomain {
  const points = new Set([left, right]);
  if (points.has("Moon")) return "emotional_rhythm"; if (points.has("Mercury")) return "communication";
  if (points.has("Venus")) return "affection_and_values"; if (points.has("Mars")) return "desire_and_momentum";
  if (points.has("Saturn")) return "commitment_and_structure"; if (points.has("Jupiter") || points.has("NorthNode")) return "growth_and_meaning";
  if (points.has("Uranus")) return "freedom_and_change"; if (points.has("Neptune")) return "imagination_and_sensitivity";
  if (points.has("Pluto")) return "depth_and_transformation"; return "identity";
}
function titleFor(domain: ConnectionDomain): string { return ({
  identity: "Recognition & Identity", emotional_rhythm: "Emotional Attunement", communication: "Communication Current",
  affection_and_values: "Affection & Values", desire_and_momentum: "Desire & Momentum", growth_and_meaning: "Growth & Meaning",
  commitment_and_structure: "Commitment & Structure", freedom_and_change: "Freedom & Change",
  imagination_and_sensitivity: "Imagination & Sensitivity", depth_and_transformation: "Depth & Transformation",
} as const)[domain]; }
function toneFor(aspect: AspectType): ConnectionTone {
  if (aspect === "trine" || aspect === "sextile") return "flowing";
  return aspect === "square" || aspect === "opposition" ? "growth_edge" : "blended";
}
type Candidate = Omit<ConnectionSignature, "id" | "rank">;
function candidates(a: readonly ConnectionPlacement[], b: readonly ConnectionPlacement[], chartA: NatalChart, chartB: NatalChart): Candidate[] {
  const result: Candidate[] = [];
  for (const left of a.filter((item) => !item.timeSensitive)) for (const right of b.filter((item) => !item.timeSensitive)) {
    const match = bestAspect(left, right); if (!match) continue;
    const domain = domainFor(left.point, right.point); const exactness = Math.max(0, match.limit - match.orb);
    result.push({ title: titleFor(domain), personAPoint: left.point, personBPoint: right.point, aspect: match.aspect,
      angle: match.angle, orb: Number(match.orb.toFixed(3)), tone: toneFor(match.aspect), domain,
      personAInPersonBHouse: houseAgainst(left.longitude, chartB), personBInPersonAHouse: houseAgainst(right.longitude, chartA),
      score: Math.round(POINT_WEIGHT[left.point] + POINT_WEIGHT[right.point] + ASPECT_WEIGHT[match.aspect] + exactness * 4 + (POINT_WEIGHT[left.point] >= 7 && POINT_WEIGHT[right.point] >= 7 ? 5 : 0)) });
  }
  return result.sort((left, right) => right.score - left.score || left.orb - right.orb || left.personAPoint.localeCompare(right.personAPoint) || left.personBPoint.localeCompare(right.personBPoint));
}
function selectTopThree(items: readonly Candidate[]): [ConnectionSignature, ConnectionSignature, ConnectionSignature] {
  const selected: Candidate[] = []; const aCounts = new Map<ConnectionPointName, number>(); const bCounts = new Map<ConnectionPointName, number>();
  for (const item of items) { if (selected.length === 3) break; if ((aCounts.get(item.personAPoint) ?? 0) >= 2 || (bCounts.get(item.personBPoint) ?? 0) >= 2) continue;
    selected.push(item); aCounts.set(item.personAPoint, (aCounts.get(item.personAPoint) ?? 0) + 1); bCounts.set(item.personBPoint, (bCounts.get(item.personBPoint) ?? 0) + 1); }
  for (const item of items) { if (selected.length === 3) break; if (!selected.includes(item)) selected.push(item); }
  if (selected.length !== 3) fail("The two charts did not produce three supported major-aspect signatures.");
  return selected.map((item, index) => ({ ...item, id: `signature.${index + 1}` as ConnectionSignature["id"], rank: (index + 1) as ConnectionSignature["rank"] })) as [ConnectionSignature, ConnectionSignature, ConnectionSignature];
}
function midpoint(left: number, right: number): number { const delta = normalizeDeg(right - left); return normalizeDeg(left + (delta > 180 ? delta - 360 : delta) / 2); }
function composite(a: readonly ConnectionPlacement[], b: readonly ConnectionPlacement[]): CompositePlacement[] {
  const bMap = new Map(b.map((item) => [item.point, item]));
  return a.flatMap((left) => { const right = bMap.get(left.point); if (!right || left.timeSensitive || right.timeSensitive) return [];
    const longitude = midpoint(left.longitude, right.longitude); return [{ point: left.point as CompositePointName, longitude, sign: lonToSign(longitude), degree: lonToDegreeInSign(longitude) }]; });
}
function canonicalJson(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalJson);
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => [key, canonicalJson(item)]));
  return value;
}
export function calculateCelestialConnection(input: CelestialConnectionInput): CelestialConnectionCalculation {
  validateCelestialConnectionInput(input);
  const chartA = computeNatalChart(birthData(input.personA), "whole_sign"); const chartB = computeNatalChart(birthData(input.personB), "whole_sign");
  const personAPlacements = placements(chartA); const personBPlacements = placements(chartB);
  const bothKnown = !input.personA.timeUnknown && !input.personB.timeUnknown;
  const allCandidates = candidates(personAPlacements, personBPlacements, chartA, chartB).map((item) =>
    bothKnown ? item : { ...item, personAInPersonBHouse: null, personBInPersonAHouse: null },
  );
  const signatures = selectTopThree(allCandidates);
  const supportingAspects = allCandidates.filter((item) => !signatures.some((signature) => signature.personAPoint === item.personAPoint && signature.personBPoint === item.personBPoint && signature.aspect === item.aspect)).slice(0, 9);
  const compositePlacements = composite(personAPlacements, personBPlacements);
  const note = bothKnown ? "Both birth times are known; angles, house overlays, and Moon aspects are available." : "At least one birth time is unknown. Unknown-time angles and houses are omitted, and that person’s noon-reference Moon is excluded from ranked aspects and composite interpretation.";
  const placementFacts = (prefix: string, items: readonly ConnectionPlacement[]): CelestialConnectionFact[] => items.map((item) => ({ id: `${prefix}.${item.point}`, statement: `${item.point} is ${item.degree.toFixed(2)}° ${item.sign}${item.timeSensitive ? " (noon reference only; excluded from ranked aspects)" : ""}.` }));
  const facts: CelestialConnectionFact[] = [
    { id: "relationship.context", statement: `This report describes a ${input.relationshipType.replace(/_/g, " ")} relationship between ${input.personA.displayName} and ${input.personB.displayName}.` },
    { id: "precision.scope", statement: note }, ...placementFacts("person_a", personAPlacements), ...placementFacts("person_b", personBPlacements),
    ...signatures.map((item) => ({ id: item.id, statement: `${input.personA.displayName}’s ${item.personAPoint} is ${item.aspect} ${input.personB.displayName}’s ${item.personBPoint} with a ${item.orb.toFixed(2)}° orb${item.personAInPersonBHouse ? `; A’s point falls in B’s house ${item.personAInPersonBHouse}` : ""}${item.personBInPersonAHouse ? `; B’s point falls in A’s house ${item.personBInPersonAHouse}` : ""}.` })),
    ...supportingAspects.map((item, index) => ({ id: `supporting.${index + 1}`, statement: `${input.personA.displayName}’s ${item.personAPoint} is ${item.aspect} ${input.personB.displayName}’s ${item.personBPoint} with a ${item.orb.toFixed(2)}° orb.` })),
    ...compositePlacements.map((item) => ({ id: `composite.${item.point}`, statement: `The short-arc composite ${item.point} is ${item.degree.toFixed(2)}° ${item.sign}.` })),
  ];
  const chartFingerprint = `sha256:${createHash("sha256").update(JSON.stringify(canonicalJson({ input, signatures, compositePlacements, note }))).digest("hex")}`;
  return { personAPlacements, personBPlacements, signatures, supportingAspects, compositePlacements,
    precision: { personATimeKnown: !input.personA.timeUnknown, personBTimeKnown: !input.personB.timeUnknown, housesAvailable: bothKnown, moonAspectsAvailable: bothKnown, note }, facts,
    provenance: { zodiac: "tropical", houseSystem: "whole_sign", compositeMethod: "short_arc_midpoint", calculationVersion: CELESTIAL_CONNECTION_SCHEMA_VERSION, ephemerisProvider: "astronomia", ephemerisVersion: "4.2.0", chartFingerprint } };
}

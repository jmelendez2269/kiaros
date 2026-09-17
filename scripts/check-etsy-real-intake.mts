import assert from "node:assert/strict";

import {
  buildAnchorNarrativeFacts,
  buildProductionAnchorCalculation,
} from "../lib/artifacts/anchor-print/production.ts";

let assertions = 0;

function ok(value: unknown, message: string): asserts value {
  assert.ok(value, message);
  assertions += 1;
}

function equal<T>(actual: T, expected: T, message: string): void {
  assert.equal(actual, expected, message);
  assertions += 1;
}

const knownBirth = {
  date: "1990-04-04",
  time: "08:30",
  timeUnknown: false,
  city: "Portland",
  country: "United States",
  timezone: "America/Los_Angeles",
  latitude: 45.5152,
  longitude: -122.6784,
};

const knownCalculation = buildProductionAnchorCalculation(knownBirth);
equal(knownCalculation.placements.length, 9, "production calculation contains all non-Moon planets");
ok(knownCalculation.angles.ascendantSign, "known-time production calculation includes an Ascendant");
ok(knownCalculation.angles.midheavenSign, "known-time production calculation includes a Midheaven");
ok(knownCalculation.aspects.length > 0, "production calculation derives natal aspects");
ok(knownCalculation.provenance.chartFingerprint.startsWith("sha256:"), "production calculation records a chart fingerprint");
ok(knownCalculation.placements.some((placement) => placement.retrograde), "production calculation derives natal retrogrades");

const unknownCalculation = buildProductionAnchorCalculation({ ...knownBirth, time: null, timeUnknown: true });
equal(unknownCalculation.angles.ascendantSign, null, "unknown-time production calculation suppresses the Ascendant");
equal(unknownCalculation.angles.midheavenSign, null, "unknown-time production calculation suppresses the Midheaven");
ok(unknownCalculation.placements.every((placement) => placement.house === null), "unknown-time production calculation suppresses houses");
ok(unknownCalculation.aspects.every((aspect) => aspect.first !== "Moon" && aspect.second !== "Moon"), "unknown-time production calculation suppresses Moon aspects");
ok(unknownCalculation.moon.kind !== "exact", "unknown-time production calculation cannot claim an exact Moon");

const unknownFacts = buildAnchorNarrativeFacts(unknownCalculation, true);
ok(unknownFacts.some((fact) => fact.id === "time.unknown"), "unknown-time narrative facts preserve the uncertainty boundary");
ok(unknownFacts.some((fact) => fact.id === "moon.uncertainty"), "unknown-time narrative facts preserve Moon uncertainty");
ok(!unknownFacts.some((fact) => fact.id === "angle.Ascendant"), "unknown-time narrative facts cannot expose an angle");
ok(!unknownFacts.some((fact) => fact.id === "pattern.houses"), "unknown-time narrative facts cannot expose houses");

console.log(`Etsy real-intake calculation check passed: ${assertions} assertions.`);

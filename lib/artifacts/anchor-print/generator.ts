import { ZODIAC_SIGNS, type AspectType, type Planet, type ZodiacSign } from "../../../types/blueprint.ts";
import {
  ANCHOR_NON_MOON_PLANETS,
  ANCHOR_PLANETS,
  ANCHOR_PRINT_PRICE_USD,
  ANCHOR_PRINT_SCHEMA_VERSION,
  ANCHOR_PRINT_SKU,
  ANCHOR_PRINT_TEMPLATE_VERSION,
  ANCHOR_PRODUCT_NAME,
  ANCHOR_REPORT_SECTION_IDS,
  ANCHOR_RETENTION_POLICY,
  ANCHOR_SERVICE_POLICY,
  AnchorPrintContractError,
  type AnchorAspect,
  type AnchorCalculation,
  type AnchorFileVariant,
  type AnchorNarrative,
  type AnchorPatternEntry,
  type AnchorPatternSummary,
  type AnchorPlanetPlacement,
  type AnchorPrintArtifact,
  type AnchorPrintInput,
  type AnchorPlacementRow,
  type AnchorReportSectionId,
} from "./contract.ts";

const VALID_ASPECTS: readonly AspectType[] = [
  "conjunction", "opposition", "square", "trine", "sextile",
];

const ASPECT_GEOMETRY: Record<AspectType, { angle: number; maximumOrb: number }> = {
  conjunction: { angle: 0, maximumOrb: 6 },
  opposition: { angle: 180, maximumOrb: 6 },
  square: { angle: 90, maximumOrb: 5 },
  trine: { angle: 120, maximumOrb: 5 },
  sextile: { angle: 60, maximumOrb: 4 },
};

const ELEMENT_BY_SIGN: Record<ZodiacSign, "Fire" | "Earth" | "Air" | "Water"> = {
  Aries: "Fire", Taurus: "Earth", Gemini: "Air", Cancer: "Water",
  Leo: "Fire", Virgo: "Earth", Libra: "Air", Scorpio: "Water",
  Sagittarius: "Fire", Capricorn: "Earth", Aquarius: "Air", Pisces: "Water",
};

const MODALITY_BY_SIGN: Record<ZodiacSign, "Cardinal" | "Fixed" | "Mutable"> = {
  Aries: "Cardinal", Taurus: "Fixed", Gemini: "Mutable", Cancer: "Cardinal",
  Leo: "Fixed", Virgo: "Mutable", Libra: "Cardinal", Scorpio: "Fixed",
  Sagittarius: "Mutable", Capricorn: "Cardinal", Aquarius: "Fixed", Pisces: "Mutable",
};

const POLARITY_BY_SIGN: Record<ZodiacSign, "Active" | "Receptive"> = {
  Aries: "Active", Taurus: "Receptive", Gemini: "Active", Cancer: "Receptive",
  Leo: "Active", Virgo: "Receptive", Libra: "Active", Scorpio: "Receptive",
  Sagittarius: "Active", Capricorn: "Receptive", Aquarius: "Active", Pisces: "Receptive",
};

const MAXIMUM_FILE_BYTES = 10 * 1024 * 1024;
const EPSILON = 0.05;

function fail(message: string): never {
  throw new AnchorPrintContractError(message);
}

function assertLength(value: string, label: string, minimum = 1, maximum = 160): void {
  const length = value.trim().length;
  if (length < minimum) fail(label + " must contain at least " + minimum + " characters");
  if (value.length > maximum) fail(label + " exceeds " + maximum + " characters");
}

function assertFiniteRange(value: number, minimum: number, maximum: number, label: string): void {
  if (!Number.isFinite(value) || value < minimum || value > maximum) {
    fail(label + " must be between " + minimum + " and " + maximum);
  }
}

function assertIsoDate(value: string): void {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) fail("birth date must use YYYY-MM-DD");
  const parsed = new Date(value + "T00:00:00.000Z");
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) {
    fail("birth date must be a real calendar date");
  }
}

function assertTime(value: string): void {
  if (!/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value)) fail("birth time must use 24-hour HH:MM");
}

function assertTimeZone(value: string): void {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: value }).format(new Date(0));
  } catch {
    fail("birth timezone must be a valid IANA timezone");
  }
}

function normalizedLongitude(value: number): number {
  return ((value % 360) + 360) % 360;
}

function angularSeparation(first: number, second: number): number {
  const difference = Math.abs(normalizedLongitude(first - second));
  return difference > 180 ? 360 - difference : difference;
}

function expectedSign(longitude: number): ZodiacSign {
  return ZODIAC_SIGNS[Math.floor(normalizedLongitude(longitude) / 30)];
}

function expectedDegree(longitude: number): number {
  return normalizedLongitude(longitude) % 30;
}

function assertPlacementCoordinates(
  placement: Pick<AnchorPlanetPlacement, "longitude" | "sign" | "degree">,
  label: string,
): void {
  assertFiniteRange(placement.longitude, 0, 359.999999, label + " longitude");
  assertFiniteRange(placement.degree, 0, 29.999999, label + " degree");
  if (placement.sign !== expectedSign(placement.longitude)) {
    fail(label + " sign does not match its longitude");
  }
  if (Math.abs(placement.degree - expectedDegree(placement.longitude)) > EPSILON) {
    fail(label + " degree does not match its longitude");
  }
}

function assertAngle(longitude: number | null, sign: ZodiacSign | null, label: string): void {
  if (longitude === null || sign === null) fail(label + " is required when birth time is known");
  assertFiniteRange(longitude, 0, 359.999999, label + " longitude");
  if (sign !== expectedSign(longitude)) fail(label + " sign does not match its longitude");
}

function orderedPair(first: Planet, second: Planet): readonly [Planet, Planet] {
  return ANCHOR_PLANETS.indexOf(first) <= ANCHOR_PLANETS.indexOf(second)
    ? [first, second]
    : [second, first];
}

function aspectFactId(aspect: AnchorAspect): string {
  const [first, second] = orderedPair(aspect.first, aspect.second);
  return "aspect." + first + "." + second + "." + aspect.type;
}

function compareAspects(left: AnchorAspect, right: AnchorAspect): number {
  const orbDifference = left.orb - right.orb;
  return Math.abs(orbDifference) > Number.EPSILON
    ? orbDifference
    : aspectFactId(left).localeCompare(aspectFactId(right));
}

function validateBirth(input: AnchorPrintInput): void {
  const birth = input.normalizedBirth;
  assertIsoDate(birth.date);
  assertLength(birth.city, "birth city");
  assertLength(birth.country, "birth country");
  assertLength(birth.timezone, "birth timezone");
  assertTimeZone(birth.timezone);
  assertFiniteRange(birth.latitude, -90, 90, "birth latitude");
  assertFiniteRange(birth.longitude, -180, 180, "birth longitude");
  if (birth.timeUnknown) {
    if (birth.time !== null) fail("unknown-time artifacts must not retain a proxy birth time");
  } else {
    if (birth.time === null) fail("known-time artifacts require a birth time");
    assertTime(birth.time);
  }
}

function validatePlacements(input: AnchorPrintInput): void {
  const seen = new Set<Planet>();
  const timeUnknown = input.normalizedBirth.timeUnknown;
  if (input.calculation.placements.length !== ANCHOR_NON_MOON_PLANETS.length) {
    fail("calculation must contain each non-Moon planet exactly once");
  }
  for (const placement of input.calculation.placements) {
    if (!ANCHOR_NON_MOON_PLANETS.includes(placement.planet)) {
      fail("unexpected planet placement: " + placement.planet);
    }
    if (seen.has(placement.planet)) fail("duplicate planet placement: " + placement.planet);
    seen.add(placement.planet);
    assertPlacementCoordinates(placement, placement.planet);
    if (timeUnknown && placement.house !== null) {
      fail(placement.planet + " house must be suppressed when birth time is unknown");
    }
    if (!timeUnknown) {
      if (placement.house === null || !Number.isInteger(placement.house)) {
        fail(placement.planet + " house is required when birth time is known");
      }
      assertFiniteRange(placement.house, 1, 12, placement.planet + " house");
    }
  }
  for (const planet of ANCHOR_NON_MOON_PLANETS) {
    if (!seen.has(planet)) fail("missing planet placement: " + planet);
  }
}

function validateMoonAndAngles(input: AnchorPrintInput): void {
  const { moon, angles } = input.calculation;
  const timeUnknown = input.normalizedBirth.timeUnknown;
  if (timeUnknown) {
    if (moon.kind === "exact") fail("unknown-time artifacts cannot claim an exact Moon placement");
    if (
      angles.ascendantLongitude !== null ||
      angles.ascendantSign !== null ||
      angles.midheavenLongitude !== null ||
      angles.midheavenSign !== null
    ) {
      fail("angles must be suppressed when birth time is unknown");
    }
    if (moon.kind === "date_stable") {
      const [start, end] = moon.degreeRange;
      assertFiniteRange(start, 0, 29.999999, "Moon range start");
      assertFiniteRange(end, 0, 29.999999, "Moon range end");
      if (end < start) fail("Moon degree range must be ascending within one stable sign");
    } else if (moon.possibleSigns[0] === moon.possibleSigns[1]) {
      fail("uncertain Moon must contain two distinct possible signs");
    }
    return;
  }
  if (moon.kind !== "exact") fail("known-time artifacts require an exact Moon placement");
  assertPlacementCoordinates(moon, "Moon");
  if (!Number.isInteger(moon.house)) fail("Moon house must be an integer");
  assertFiniteRange(moon.house, 1, 12, "Moon house");
  assertAngle(angles.ascendantLongitude, angles.ascendantSign, "Ascendant");
  assertAngle(angles.midheavenLongitude, angles.midheavenSign, "Midheaven");
}

function validateAspects(calculation: AnchorCalculation, timeUnknown: boolean): void {
  const seen = new Set<string>();
  const longitudes = new Map<Planet, number>(
    calculation.placements.map((placement) => [placement.planet, placement.longitude]),
  );
  if (calculation.moon.kind === "exact") longitudes.set("Moon", calculation.moon.longitude);
  for (const aspect of calculation.aspects) {
    if (!ANCHOR_PLANETS.includes(aspect.first) || !ANCHOR_PLANETS.includes(aspect.second)) {
      fail("aspects may reference only the ten approved planets");
    }
    if (aspect.first === aspect.second) fail("an aspect requires two distinct planets");
    if (!VALID_ASPECTS.includes(aspect.type)) fail("unsupported aspect type: " + aspect.type);
    assertFiniteRange(aspect.orb, 0, 6, "aspect orb");
    const id = aspectFactId(aspect);
    if (seen.has(id)) fail("duplicate aspect: " + id);
    seen.add(id);
    if (timeUnknown && (aspect.first === "Moon" || aspect.second === "Moon")) {
      fail("Moon aspects must be suppressed when birth time is unknown");
    }
    const firstLongitude = longitudes.get(aspect.first);
    const secondLongitude = longitudes.get(aspect.second);
    if (firstLongitude === undefined || secondLongitude === undefined) {
      fail("aspect lacks a stable longitude: " + id);
    }
    const geometry = ASPECT_GEOMETRY[aspect.type];
    const calculatedOrb = Math.abs(angularSeparation(firstLongitude, secondLongitude) - geometry.angle);
    if (calculatedOrb > geometry.maximumOrb + EPSILON) {
      fail(id + " exceeds the approved " + geometry.maximumOrb + "° orb");
    }
    if (Math.abs(calculatedOrb - aspect.orb) > EPSILON) {
      fail(id + " orb does not match the recorded longitudes");
    }
  }
}

function validateProvenance(input: AnchorPrintInput): void {
  const provenance = input.calculation.provenance;
  if (provenance.zodiac !== "tropical") fail("Natal report zodiac must be tropical");
  if (provenance.houseSystem !== "whole_sign") fail("Natal report house system must be Whole Sign");
  assertLength(provenance.calculationVersion, "calculation version");
  assertLength(provenance.ephemerisProvider, "ephemeris provider");
  assertLength(provenance.ephemerisVersion, "ephemeris version");
  assertLength(provenance.timezoneProvenance, "timezone provenance");
  if (!/^sha256:[a-f0-9]{64}$/.test(provenance.chartFingerprint)) {
    fail("chart fingerprint must be a lowercase SHA-256 identifier");
  }
}

function buildFactIds(input: AnchorPrintInput): readonly string[] {
  const facts = input.calculation.placements.map((placement) => "placement." + placement.planet);
  facts.push("placement.Moon", "pattern.elements", "pattern.modalities", "pattern.polarities");
  if (input.normalizedBirth.timeUnknown) facts.push("time.unknown", "moon.uncertainty");
  else facts.push("angle.Ascendant", "angle.Midheaven", "pattern.houses");
  for (const aspect of input.calculation.aspects) facts.push(aspectFactId(aspect));
  return [...new Set(facts)].sort();
}

function validateNarrative(narrative: AnchorNarrative, factIds: readonly string[]): void {
  assertLength(narrative.promptVersion, "narrative prompt version");
  if (narrative.generationMethod === "human") {
    if (narrative.model !== null) fail("human-authored narrative must not claim an AI model");
    if (narrative.tokenUsage !== null) fail("human-authored narrative must not claim AI token usage");
  } else {
    if (narrative.model === null) fail("AI-assisted narrative must record its model");
    assertLength(narrative.model, "narrative model");
    if (narrative.tokenUsage === null) fail("AI-assisted narrative must record token usage");
    const { inputTokens, outputTokens, totalTokens } = narrative.tokenUsage;
    if (
      !Number.isSafeInteger(inputTokens) ||
      !Number.isSafeInteger(outputTokens) ||
      !Number.isSafeInteger(totalTokens) ||
      inputTokens < 0 ||
      outputTokens < 0 ||
      totalTokens !== inputTokens + outputTokens
    ) {
      fail("AI-assisted narrative token usage must contain non-negative integer counts with a valid total");
    }
  }
  if (narrative.openingLetter.length !== 2) fail("opening letter must contain exactly two paragraphs");
  narrative.openingLetter.forEach((paragraph, index) =>
    assertLength(paragraph, "opening paragraph " + (index + 1), 220, 1200),
  );
  if (narrative.sections.length !== ANCHOR_REPORT_SECTION_IDS.length) {
    fail("narrative must contain exactly fourteen report sections");
  }
  const allowedFacts = new Set(factIds);
  const seenSections = new Set<string>();
  for (const section of narrative.sections) {
    if (!ANCHOR_REPORT_SECTION_IDS.includes(section.id)) {
      fail("unsupported narrative section: " + section.id);
    }
    if (seenSections.has(section.id)) fail("duplicate narrative section: " + section.id);
    seenSections.add(section.id);
    assertLength(section.eyebrow, section.id + " eyebrow", 3, 50);
    assertLength(section.title, section.id + " title", 8, 90);
    assertLength(section.summary, section.id + " summary", 90, 300);
    if (section.paragraphs.length !== 2) fail(section.id + " must contain exactly two developed paragraphs");
    section.paragraphs.forEach((paragraph, index) =>
      assertLength(paragraph, section.id + " paragraph " + (index + 1), 260, 1250),
    );
    if (section.keyPoints.length !== 3) fail(section.id + " must contain exactly three practical anchors");
    section.keyPoints.forEach((point, index) =>
      assertLength(point, section.id + " anchor " + (index + 1), 30, 220),
    );
    if (section.sourceFactIds.length === 0) fail(section.id + " must cite at least one deterministic fact");
    for (const factId of section.sourceFactIds) {
      if (!allowedFacts.has(factId)) fail(section.id + " cites unavailable fact: " + factId);
    }
  }
  for (const sectionId of ANCHOR_REPORT_SECTION_IDS) {
    if (!seenSections.has(sectionId)) fail("missing narrative section: " + sectionId);
  }
  if (narrative.reflectionPrompts.length !== 8) fail("report must contain exactly eight reflection prompts");
  narrative.reflectionPrompts.forEach((prompt) =>
    assertLength(prompt, "reflection prompt", 30, 260),
  );
}

function formatDegree(value: number): string {
  return value.toFixed(1) + "°";
}

function placementRows(input: AnchorPrintInput): readonly AnchorPlacementRow[] {
  const byPlanet = new Map(input.calculation.placements.map((placement) => [placement.planet, placement]));
  const rows: AnchorPlacementRow[] = [];
  for (const planet of ANCHOR_PLANETS) {
    if (planet === "Moon") {
      const moon = input.calculation.moon;
      if (moon.kind === "exact") {
        rows.push({
          planet,
          position: formatDegree(moon.degree) + " " + moon.sign,
          house: "House " + moon.house,
          retrograde: false,
          certainty: "exact",
        });
      } else if (moon.kind === "date_stable") {
        rows.push({
          planet,
          position: formatDegree(moon.degreeRange[0]) + "–" + formatDegree(moon.degreeRange[1]) + " " + moon.sign,
          house: null,
          retrograde: false,
          certainty: "date_stable",
        });
      } else {
        rows.push({
          planet,
          position: moon.possibleSigns[0] + " or " + moon.possibleSigns[1],
          house: null,
          retrograde: false,
          certainty: "sign_uncertain",
        });
      }
      continue;
    }
    const placement = byPlanet.get(planet);
    if (!placement) fail("missing placement while building document: " + planet);
    rows.push({
      planet,
      position: formatDegree(placement.degree) + " " + placement.sign,
      house: placement.house === null ? null : "House " + placement.house,
      retrograde: placement.retrograde,
      certainty: "exact",
    });
  }
  return rows;
}

function countLabels<T extends string>(values: readonly T[], order: readonly T[]): readonly AnchorPatternEntry[] {
  return order.map((label) => ({
    label,
    count: values.filter((value) => value === label).length,
  }));
}

function patternSummary(input: AnchorPrintInput): AnchorPatternSummary {
  const signs: ZodiacSign[] = input.calculation.placements.map((placement) => placement.sign);
  if (input.calculation.moon.kind !== "sign_uncertain") signs.push(input.calculation.moon.sign);
  const houses = input.normalizedBirth.timeUnknown
    ? []
    : [
        ...input.calculation.placements.map((placement) => placement.house),
        input.calculation.moon.kind === "exact" ? input.calculation.moon.house : null,
      ].filter((house): house is number => house !== null);
  const houseBands = [
    { label: "Self & resources · Houses 1–3", range: [1, 3] },
    { label: "Roots & craft · Houses 4–6", range: [4, 6] },
    { label: "Relationship & meaning · Houses 7–9", range: [7, 9] },
    { label: "Calling & community · Houses 10–12", range: [10, 12] },
  ] as const;
  return {
    elements: countLabels(signs.map((sign) => ELEMENT_BY_SIGN[sign]), ["Fire", "Earth", "Air", "Water"]),
    modalities: countLabels(signs.map((sign) => MODALITY_BY_SIGN[sign]), ["Cardinal", "Fixed", "Mutable"]),
    polarities: countLabels(signs.map((sign) => POLARITY_BY_SIGN[sign]), ["Active", "Receptive"]),
    houseEmphasis: houseBands.map(({ label, range }) => ({
      label,
      count: houses.filter((house) => house >= range[0] && house <= range[1]).length,
    })),
    caveat: input.normalizedBirth.timeUnknown
      ? "House, angle, and hemisphere patterns are intentionally omitted because the birth time is unknown. The Moon is also excluded from pattern counts when its sign changes during the birth date."
      : null,
  };
}

function fileVariants(
  artifactId: string,
): readonly [AnchorFileVariant, AnchorFileVariant, AnchorFileVariant, AnchorFileVariant] {
  return [
    {
      documentKind: "report",
      paperSize: "letter",
      fileName: artifactId + "_natal-report_letter.pdf",
      pageWidthMm: 215.9,
      pageHeightMm: 279.4,
      maximumBytes: MAXIMUM_FILE_BYTES,
    },
    {
      documentKind: "report",
      paperSize: "a4",
      fileName: artifactId + "_natal-report_a4.pdf",
      pageWidthMm: 210,
      pageHeightMm: 297,
      maximumBytes: MAXIMUM_FILE_BYTES,
    },
    {
      documentKind: "anchor_print",
      paperSize: "letter",
      fileName: artifactId + "_anchor-print_letter.pdf",
      pageWidthMm: 215.9,
      pageHeightMm: 279.4,
      maximumBytes: MAXIMUM_FILE_BYTES,
    },
    {
      documentKind: "anchor_print",
      paperSize: "a4",
      fileName: artifactId + "_anchor-print_a4.pdf",
      pageWidthMm: 210,
      pageHeightMm: 297,
      maximumBytes: MAXIMUM_FILE_BYTES,
    },
  ];
}

export function validateAnchorPrintInput(input: AnchorPrintInput): readonly string[] {
  if (!/^art_[A-Za-z0-9_-]{8,80}$/.test(input.artifactId)) {
    fail("artifactId must be an opaque art_ identifier");
  }
  if (input.displayName !== null) assertLength(input.displayName, "display name", 1, 80);
  validateBirth(input);
  validatePlacements(input);
  validateMoonAndAngles(input);
  validateAspects(input.calculation, input.normalizedBirth.timeUnknown);
  validateProvenance(input);
  const factIds = buildFactIds(input);
  validateNarrative(input.narrative, factIds);
  return factIds;
}

function sectionById(narrative: AnchorNarrative, id: AnchorReportSectionId) {
  const section = narrative.sections.find((candidate) => candidate.id === id);
  if (!section) fail("missing report section while building document: " + id);
  return section;
}

export function generateAnchorPrint(input: AnchorPrintInput): AnchorPrintArtifact {
  const factIds = validateAnchorPrintInput(input);
  const timeKnown = !input.normalizedBirth.timeUnknown;
  const aspects = [...input.calculation.aspects].sort(compareAspects).slice(0, 8);
  const uncertaintyNote = timeKnown
    ? null
    : input.calculation.moon.kind === "sign_uncertain"
      ? "Birth time is unknown. Ascendant, Midheaven, houses, and Moon-dependent aspects are omitted. The Moon may be in " +
        input.calculation.moon.possibleSigns[0] + " or " +
        input.calculation.moon.possibleSigns[1] + "."
      : "Birth time is unknown. Ascendant, Midheaven, and houses are omitted. The Moon stayed in " +
        input.calculation.moon.sign + " across the local birth date; its degree is shown as a range.";
  const birthTimeLabel = timeKnown ? input.normalizedBirth.time : "time unknown";
  const birthLabel =
    input.normalizedBirth.date + " · " + birthTimeLabel + " · " +
    input.normalizedBirth.city + ", " + input.normalizedBirth.country;
  const displayTitle = input.displayName
    ? input.displayName + " · Natal Report"
    : "Personal Natal Report";
  const reference = {
    title: "Your natal chart",
    subtitle: "The astronomical reference beneath every interpretation in this report",
    chartDescription: timeKnown
      ? "Tropical natal placements in a Whole Sign chart. The placement table and aspect list provide a complete text equivalent of the chart graphic."
      : "Tropical date-stable placements without houses or chart angles. The placement table is the authoritative text equivalent of the chart graphic.",
    placements: placementRows(input),
    aspects: aspects.map((aspect) => ({
      label: aspect.first + " " + aspect.type + " " + aspect.second,
      orb: aspect.orb.toFixed(1) + "° orb",
      sourceFactId: aspectFactId(aspect),
    })),
    methodNote:
      "Tropical zodiac · Whole Sign houses when birth time is known · " +
      input.calculation.provenance.ephemerisProvider + " " +
      input.calculation.provenance.ephemerisVersion + " · calculation " +
      input.calculation.provenance.calculationVersion,
    uncertaintyNote,
  };
  const scopeNote =
    "Reflective astrology for personal use—not medical, mental-health, legal, financial, or other professional advice. " +
    "The purchase includes four personalized PDF files only and does not include a Kairos account, subscription, " +
    "Blueprint, Stelloquy, activation, or off-marketplace purchase.";
  const keepsakeIds: readonly AnchorReportSectionId[] = [
    "identity_and_vitality",
    "emotional_world",
    "mind_and_communication",
    "love_and_values",
    "desire_and_action",
    "integration_and_practice",
  ];
  const keepsakeItems = keepsakeIds.map((id, index) => {
    const section = sectionById(input.narrative, id);
    return {
      label: String(index + 1).padStart(2, "0"),
      title: section.title,
      text: section.summary,
    };
  }) as unknown as AnchorPrintArtifact["anchorPrint"]["items"];

  return {
    schemaVersion: ANCHOR_PRINT_SCHEMA_VERSION,
    templateVersion: ANCHOR_PRINT_TEMPLATE_VERSION,
    artifactId: input.artifactId,
    product: {
      name: ANCHOR_PRODUCT_NAME,
      sku: ANCHOR_PRINT_SKU,
      priceUsd: ANCHOR_PRINT_PRICE_USD,
    },
    retentionPolicy: ANCHOR_RETENTION_POLICY,
    servicePolicy: ANCHOR_SERVICE_POLICY,
    displayName: input.displayName,
    privateArtifact: true,
    workflow: {
      status: "draft",
      revision: 1,
      humanReviewRequired: true,
      deliveryReady: false,
      generatedFileChecksum: null,
      deliveredAt: null,
    },
    birthLabel,
    timeKnown,
    calculation: input.calculation,
    narrativeProvenance: {
      generationMethod: input.narrative.generationMethod,
      model: input.narrative.model,
      promptVersion: input.narrative.promptVersion,
      tokenUsage: input.narrative.tokenUsage,
    },
    factIds,
    report: {
      kind: "report",
      title: displayTitle,
      subtitle: "A twenty-six-page exploration of your natal pattern and the Kairos Planner",
      pageCount: 26,
      openingLetter: [...input.narrative.openingLetter] as [string, string],
      reference,
      patterns: patternSummary(input),
      sections: input.narrative.sections.map((section) => ({
        ...section,
        paragraphs: [...section.paragraphs] as [string, string],
        keyPoints: [...section.keyPoints] as [string, string, string],
        sourceFactIds: [...section.sourceFactIds],
      })),
      reflectionPrompts:
        [...input.narrative.reflectionPrompts] as AnchorNarrative["reflectionPrompts"],
      scopeNote,
    },
    anchorPrint: {
      kind: "anchor_print",
      title: input.displayName
        ? input.displayName + " · Six Natal Anchors"
        : "Six Natal Anchors",
      subtitle: "A one-page keepsake drawn from the accompanying full report",
      items: keepsakeItems,
      uncertaintyNote,
      scopeNote,
    },
    files: fileVariants(input.artifactId),
    accessibility: {
      minimumBodyPointSize: 11,
      minimumTextContrast: 4.5,
      selectableTextRequired: true,
      taggedReadingOrderRequired: true,
      documentLanguageRequired: true,
      chartTextEquivalentRequired: true,
      colorOnlyMeaningForbidden: true,
      targetStandard: "PDF/UA-1-compatible",
      publicConformanceClaimAllowed: false,
    },
    fulfillmentBoundary: {
      createsKairosAccount: false,
      createsProductEntitlement: false,
      subscribesToMarketing: false,
      requiresOffMarketplacePurchase: false,
    },
  };
}

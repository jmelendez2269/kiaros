/**
 * generator.ts
 *
 * Turns a birth chart into a validated Star Origin artifact.
 *
 * This is the join between the engine and the product. Everything it does is
 * already decided somewhere else - scoring.ts scores, baseline.ts classifies,
 * findings.ts selects, compose.ts writes, contract.ts checks. The generator
 * only runs them in the right order and in the right combination for the tier,
 * then refuses to return anything the contract rejects.
 *
 * Deliberately no writing happens here. If a sentence in a finished report
 * cannot be traced back to a file a person wrote and signed off, that is a bug
 * in this file.
 */

import type { NatalChart, ZodiacSign } from "@/types/blueprint";
import { ZODIAC_SIGNS } from "@/types/blueprint";
import { starPositionsForYear, STAR_CATALOG_VERSION, type CatalogStar } from "./stars.ts";
import { markersFromChart, scoreChart, type Contact } from "./scoring.ts";
import {
  classifyByNotable, isNotable, standing,
  DECIDING_MARKERS, MIN_DECIDING_WEIGHT, NOTABLE_ORB, type Baseline,
} from "./baseline.ts";
import {
  selectFindings, writtenUp, findingsOrbFor, FINDINGS_WRITTEN_UP, type Finding,
} from "./findings.ts";
import { groupOf, isRanked, lineageMap } from "./lineages.ts";
import { LINEAGE_MEANINGS } from "./content/lineage-meanings.ts";
import {
  composeFinding, composeLineage, composeResonanceProfile, decidedByFor, lineageSectionOpening, workingsRow,
} from "./content/compose.ts";
import {
  HOW_TO_READ_THIS, LIVING_WITH_IT, STAR_ORIGIN_CONTENT_VERSION,
} from "./content/report-frame.ts";
import {
  STAR_ORIGIN_SCHEMA_VERSION, STAR_ORIGIN_TEMPLATE_VERSION,
  TIERS_THAT_MAY_NAME_A_LINEAGE, validateStarOriginInput, NO_REVIEW_NEEDED,
  type LineageProximityRow, type LineageScore, type StarContact, type StarOriginArtifact,
  type StarOriginChartHighlight, type StarOriginChartMarker,
  type StarOriginCalculation, type StarOriginInput, type StarOriginNarrativeSection,
  type StarOriginNormalizedBirth, type StarOriginResult, type StarOriginTier,
  type WorkingsTableRow,
} from "./contract.ts";
import { topThreeResonances } from "./profile.ts";

const DEFAULT_SCORING_ORB = 2.5;

function signAndDegree(longitude: number): { sign: ZodiacSign; degree: number } {
  const norm = ((longitude % 360) + 360) % 360;
  return { sign: ZODIAC_SIGNS[Math.floor(norm / 30)], degree: norm % 30 };
}

function contactId(marker: string, starId: string): string {
  return `contact.${marker}.${starId}`;
}

const CHART_MARKERS: ReadonlyArray<{
  markerId: string;
  displayName: string;
  abbreviation: string;
  kind: StarOriginChartMarker["kind"];
  longitude: (chart: NatalChart) => number | undefined;
}> = [
  { markerId: "sun", displayName: "Sun", abbreviation: "Su", kind: "planet", longitude: (chart) => chart.sun.longitude },
  { markerId: "moon", displayName: "Moon", abbreviation: "Mo", kind: "planet", longitude: (chart) => chart.moon.longitude },
  { markerId: "mercury", displayName: "Mercury", abbreviation: "Me", kind: "planet", longitude: (chart) => chart.mercury.longitude },
  { markerId: "venus", displayName: "Venus", abbreviation: "Ve", kind: "planet", longitude: (chart) => chart.venus.longitude },
  { markerId: "mars", displayName: "Mars", abbreviation: "Ma", kind: "planet", longitude: (chart) => chart.mars.longitude },
  { markerId: "jupiter", displayName: "Jupiter", abbreviation: "Ju", kind: "planet", longitude: (chart) => chart.jupiter.longitude },
  { markerId: "saturn", displayName: "Saturn", abbreviation: "Sa", kind: "planet", longitude: (chart) => chart.saturn.longitude },
  { markerId: "uranus", displayName: "Uranus", abbreviation: "Ur", kind: "planet", longitude: (chart) => chart.uranus.longitude },
  { markerId: "neptune", displayName: "Neptune", abbreviation: "Ne", kind: "planet", longitude: (chart) => chart.neptune.longitude },
  { markerId: "pluto", displayName: "Pluto", abbreviation: "Pl", kind: "planet", longitude: (chart) => chart.pluto.longitude },
  { markerId: "ascendant", displayName: "Ascendant", abbreviation: "ASC", kind: "angle", longitude: (chart) => chart.ascendantLongitude },
  { markerId: "midheaven", displayName: "Midheaven", abbreviation: "MC", kind: "angle", longitude: (chart) => chart.midheavenLongitude },
  { markerId: "north_node", displayName: "North Node", abbreviation: "NN", kind: "node", longitude: (chart) => chart.northNodeLongitude },
  { markerId: "south_node", displayName: "South Node", abbreviation: "SN", kind: "node", longitude: (chart) => chart.southNodeLongitude },
];

function chartMarkers(chart: NatalChart): StarOriginChartMarker[] {
  return CHART_MARKERS.flatMap((definition) => {
    const longitude = definition.longitude(chart);
    return longitude === undefined
      ? []
      : [{
          markerId: definition.markerId,
          displayName: definition.displayName,
          abbreviation: definition.abbreviation,
          longitude,
          kind: definition.kind,
        }];
  });
}

function chartHighlights(
  result: StarOriginResult,
  map: readonly LineageProximityRow[],
  positions: ReadonlyArray<{ star: CatalogStar; longitude: number }>,
  chart: NatalChart,
): StarOriginChartHighlight[] {
  const markerLongitudes = markersFromChart(chart);
  const markerDefinitions = new Map(
    CHART_MARKERS.map((definition) => [definition.markerId, definition]),
  );

  return topThreeResonances(result, map).map((entry) => {
    const starPosition = positions.find(
      (position) =>
        position.star.name === entry.row.nearestStar &&
        position.star.lineage !== null &&
        groupOf(position.star.lineage) === entry.row.lineageId,
    );
    const markerLongitude = markerLongitudes.get(entry.row.nearestMarker);
    const marker = markerDefinitions.get(entry.row.nearestMarker);
    if (!starPosition || markerLongitude === undefined || !marker) {
      throw new RangeError(
        "The chart print could not resolve " +
          entry.row.nearestStar +
          " to " +
          entry.row.nearestMarker +
          ".",
      );
    }
    return {
      rank: entry.rank,
      role: entry.role,
      lineageId: entry.row.lineageId,
      displayName: entry.row.displayName,
      starId: starPosition.star.id,
      starName: starPosition.star.name,
      starLongitude: starPosition.longitude,
      markerId: entry.row.nearestMarker,
      markerName: marker.displayName,
      markerLongitude,
      orb: entry.row.orb,
    };
  });
}

function toStarContact(c: Contact | Finding, band: StarContact["band"]): StarContact {
  const { sign, degree } = signAndDegree(c.starLongitude);
  return {
    contactId: contactId(c.marker, c.star.id),
    marker: c.marker,
    markerLongitude: c.markerLongitude,
    star: {
      starId: c.star.id,
      displayName: c.star.name,
      lineageId: c.star.lineage,
      longitudeAtBirthEpoch: c.starLongitude,
      sign,
      degree,
    },
    orb: c.orb,
    band,
    // Recorded, never recomputed downstream. The Midheaven scores higher than
    // any other marker and is barred from naming a lineage; a template that
    // worked this out for itself could disagree with the engine.
    mayNameLineage:
      isNotable(
        { marker: c.marker, orb: c.orb, points: 0, star: { lineage: c.star.lineage, weight: c.star.weight } },
        NOTABLE_ORB,
        DECIDING_MARKERS,
      ) && isRanked(c.star.lineage),
  };
}

export interface GenerateOptions {
  artifactId: string;
  displayName: string | null;
  tier: StarOriginTier;
  normalizedBirth: StarOriginNormalizedBirth;
  chart: NatalChart;
  year: number;
  baseline: Baseline;
  baselineVersion: string;
  chartFingerprint: string;
  ephemerisProvider: string;
  ephemerisVersion: string;
  scoringOrb?: number;
  notableOrb?: number;
  starPositions?: ReadonlyArray<{ star: CatalogStar; longitude: number }>;
}

export function generateStarOrigin(opts: GenerateOptions): StarOriginArtifact {
  const scoringOrb = opts.scoringOrb ?? DEFAULT_SCORING_ORB;
  const notableOrb = opts.notableOrb ?? NOTABLE_ORB;
  const findingsOrb = findingsOrbFor(opts.chart);
  const positions = opts.starPositions ?? starPositionsForYear(opts.year);
  const mayNameALineage = TIERS_THAT_MAY_NAME_A_LINEAGE.has(opts.tier);

  // --- Layer 1: the lineage -------------------------------------------------
  const scored = scoreChart(opts.chart, opts.year, { orb: scoringOrb, starPositions: positions });

  const byLineage = new Map<string, number>();
  const notable = new Set<string>();
  for (const [lineage, points] of scored.byLineage) {
    if (!isRanked(lineage)) continue;
    const key = groupOf(lineage);
    byLineage.set(key, (byLineage.get(key) ?? 0) + points);
  }
  for (const c of scored.contacts) {
    if (!isRanked(c.star.lineage)) continue;
    if (!isNotable(c, notableOrb, DECIDING_MARKERS)) continue;
    notable.add(groupOf(c.star.lineage as string));
  }

  // Mini never promises a lineage, so it is not given one to promise.
  const verdict = mayNameALineage
    ? classifyByNotable(opts.baseline, byLineage, notable)
    : ({ kind: "spread" } as const);

  const lineageScoreFor = (id: string): LineageScore => {
    const meaning = LINEAGE_MEANINGS[id];
    return {
      lineageId: id,
      displayName: meaning?.displayName ?? id,
      subStrands: meaning?.subStrands ?? [],
      rawPoints: byLineage.get(id) ?? 0,
      standing: standing(opts.baseline, id, byLineage.get(id) ?? 0),
      contributingContactIds: scored.contacts
        .filter((c) => c.star.lineage && groupOf(c.star.lineage) === id)
        .map((c) => contactId(c.marker, c.star.id)),
    };
  };

  /** The contact that named a line. Must be one the engine accepted. */
  const namingContact = (id: string) =>
    scored.contacts
      .filter((c) => c.star.lineage && groupOf(c.star.lineage) === id)
      .filter((c) => isNotable(c, notableOrb, DECIDING_MARKERS))
      .sort((a, b) => b.points - a.points)[0];

  const result: StarOriginResult =
    verdict.kind === "single"
      ? {
          kind: "single",
          primary: lineageScoreFor(verdict.primary),
          decidedBy: decidedByFor("single", notable.size),
        }
      : verdict.kind === "paired"
        ? {
            kind: "paired",
            primary: lineageScoreFor(verdict.primary),
            secondary: lineageScoreFor(verdict.secondary),
          }
        : { kind: "spread" };

  // --- The findings ---------------------------------------------------------
  const findings = selectFindings(opts.chart, opts.year, {
    orb: findingsOrb,
    starPositions: positions,
  });
  const lineageStarId =
    verdict.kind === "spread" ? undefined : namingContact(verdict.primary)?.star.id;
  const written = writtenUp(findings, FINDINGS_WRITTEN_UP, lineageStarId);

  // --- Contacts, deduplicated across both passes ----------------------------
  // The findings pass runs at a wider orb over more stars, so it is a superset
  // of the lineage pass for every marker it shares. Keyed by id so a marker
  // that appears in both is one contact, not two.
  const contacts = new Map<string, StarContact>();
  for (const f of findings) contacts.set(contactId(f.marker, f.star.id), toStarContact(f, f.band));
  for (const c of scored.contacts) {
    const id = contactId(c.marker, c.star.id);
    if (!contacts.has(id)) {
      contacts.set(id, toStarContact(c, c.orb <= 1 ? "exact" : c.orb <= 2.5 ? "close" : "within_range"));
    }
  }

  // --- The map --------------------------------------------------------------
  const yourLine = verdict.kind === "spread" ? null : verdict.primary;
  const map: LineageProximityRow[] = mayNameALineage
    ? lineageMap(opts.chart, opts.year, {
        scoringOrb, notableOrb, deciding: DECIDING_MARKERS,
        minDecidingWeight: MIN_DECIDING_WEIGHT, starPositions: positions,
      }).map((row) => {
        const meaning = LINEAGE_MEANINGS[row.lineage];
        return {
          lineageId: row.lineage,
          displayName: meaning?.displayName ?? row.lineage,
          essence: meaning?.essence ?? "",
          orb: row.orb,
          nearestStar: row.nearestStar,
          nearestMarker: row.nearestMarker,
          isYourLine: row.lineage === yourLine,
        };
      })
    : [];

  // --- Sections -------------------------------------------------------------
  const sections: StarOriginNarrativeSection[] = [
    {
      id: "how_to_read_this",
      title: HOW_TO_READ_THIS.title,
      subtitle: "",
      paragraphs: HOW_TO_READ_THIS.paragraphs,
      sourceContactIds: [],
    },
  ];

  if (mayNameALineage) {
    const opening = lineageSectionOpening(verdict.kind);
    const blocks =
      verdict.kind === "single"
        ? [{ id: verdict.primary, standing: verdict.standing, kind: "single" as const }]
        : verdict.kind === "paired"
          ? [
              { id: verdict.primary, standing: verdict.standings[0], kind: "paired" as const },
              { id: verdict.secondary, standing: verdict.standings[1], kind: "paired" as const },
            ]
          : [];

    const paragraphs = [opening];
    const cited: string[] = [];
    let title = "Where you resonate";
    let subtitle = "";

    for (const block of blocks) {
      const lead = namingContact(block.id);
      const composed = composeLineage({
        lineageId: block.id,
        standing: block.standing,
        kind: block.kind,
        decidedBy: decidedByFor(block.kind, notable.size),
        leadContact: lead
          ? { starName: lead.star.name, marker: lead.marker, orb: lead.orb }
          : undefined,
      });
      if (blocks.length === 1) {
        title = composed.title;
        subtitle = composed.subtitle;
      } else {
        paragraphs.push(`${composed.title} — ${composed.subtitle}`);
      }
      paragraphs.push(...composed.body);
      if (lead) cited.push(contactId(lead.marker, lead.star.id));
    }

    sections.push({
      id: "where_you_resonate",
      title,
      subtitle,
      paragraphs,
      sourceContactIds: cited,
    });

    const topThree = topThreeResonances(result, map);
    const topThreeIds = new Set(topThree.map((entry) => entry.row.lineageId));
    const profile = composeResonanceProfile(topThree, []);

    sections.push({
      id: "the_twelve_families",
      title: profile.title,
      subtitle: profile.subtitle,
      paragraphs: [
        ...profile.paragraphs,
        ...map.filter((row) => !topThreeIds.has(row.lineageId)).map(
          (row) =>
            `${row.displayName} — ${row.essence}. Nearest approach ${row.orb.toFixed(2)}°, ${row.nearestStar} to your ${row.nearestMarker}.${row.isYourLine ? " This is your line." : ""}`,
        ),
      ],
      sourceContactIds: [],
    });
  }

  const findingSections = written.map((f) => composeFinding(f));
  sections.push({
    id: "your_strongest_markers",
    title: "What else is marked",
    subtitle: `${findings.length} stars within ${findingsOrb}°`,
    paragraphs: findingSections.flatMap((c) => [`${c.title} — ${c.subtitle}`, ...c.body]),
    sourceContactIds: written.map((f) => contactId(f.marker, f.star.id)),
  });

  sections.push({
    id: "living_with_it",
    title: LIVING_WITH_IT.title,
    subtitle: "",
    paragraphs: LIVING_WITH_IT.paragraphs,
    sourceContactIds: [],
  });

  // --- The workings ---------------------------------------------------------
  const workings: WorkingsTableRow[] = findings.map((f) => {
    const row = workingsRow(f);
    const named = lineageStarId === f.star.id && contacts.get(contactId(f.marker, f.star.id))?.mayNameLineage;
    return {
      ...row,
      tag: named ? "named the line" : !isRanked(f.star.lineage) ? "a marking" : "",
    };
  });

  const chartPrint = {
    risingSign: opts.chart.birthTimeUnknown ? null : opts.chart.rising,
    markers: chartMarkers(opts.chart),
    highlights: chartHighlights(result, map, positions, opts.chart),
  };

  const calculation: StarOriginCalculation = {
    contacts: [...contacts.values()],
    lineages: [...byLineage.keys()].map(lineageScoreFor),
    result,
    map,
    chartPrint,
    provenance: {
      zodiac: "tropical",
      houseSystem: "whole_sign",
      calculationVersion: STAR_ORIGIN_SCHEMA_VERSION,
      ephemerisProvider: opts.ephemerisProvider,
      ephemerisVersion: opts.ephemerisVersion,
      timezoneProvenance: `IANA:${opts.normalizedBirth.timezone}`,
      chartFingerprint: opts.chartFingerprint,
      starCatalogVersion: STAR_CATALOG_VERSION,
      baselineVersion: opts.baselineVersion,
      scoringOrb,
      notableOrb,
      findingsOrb,
    },
  };

  const input: StarOriginInput = {
    artifactId: opts.artifactId,
    displayName: opts.displayName,
    tier: opts.tier,
    normalizedBirth: opts.normalizedBirth,
    calculation,
    narrative: {
      generationMethod: "composed",
      contentVersion: STAR_ORIGIN_CONTENT_VERSION,
      sections,
    },
  };

  // Nothing leaves this function unchecked.
  validateStarOriginInput(input);

  return {
    schemaVersion: STAR_ORIGIN_SCHEMA_VERSION,
    templateVersion: STAR_ORIGIN_TEMPLATE_VERSION,
    artifactId: input.artifactId,
    tier: input.tier,
    displayName: input.displayName,
    normalizedBirth: input.normalizedBirth,
    result,
    provenance: calculation.provenance,
    narrativeProvenance: {
      generationMethod: "composed",
      contentVersion: STAR_ORIGIN_CONTENT_VERSION,
    },
    // The generator composes only. A per-buyer synthesis is attached
    // afterwards by attachSynthesis(), which flips the review state with it,
    // so a report can never gain model-written prose without also gaining the
    // requirement that somebody read it.
    synthesisProvenance: null,
    review: NO_REVIEW_NEEDED,
    sections,
    workings,
    map,
    chartPrint,
    files: [
      { paperSize: "letter", fileName: `star-origin-${input.artifactId}-letter.pdf` },
      { paperSize: "a4", fileName: `star-origin-${input.artifactId}-a4.pdf` },
    ],
    chartPrintFiles: chartPrint.highlights.length === 3
      ? [
          "8x10",
          "11x14",
          "16x20",
          "a4",
          "a3",
        ].map((printSize) => ({
          printSize: printSize as "8x10" | "11x14" | "16x20" | "a4" | "a3",
          fileName:
            `star-family-chart-${input.artifactId}-${printSize}.pdf`,
        }))
      : [],
  };
}

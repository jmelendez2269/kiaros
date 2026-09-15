import { readFileSync } from "node:fs";

import type { Planet, ZodiacSign } from "../../../types/blueprint.ts";
import type {
  AnchorAspect,
  AnchorDocumentKind,
  AnchorPaperSize,
  AnchorPrintArtifact,
} from "./contract.ts";

export const ANCHOR_PRINT_PALETTE = {
  paper: "#f7f2e8",
  paperDeep: "#eee5d6",
  ink: "#181923",
  inkMuted: "#4b4b57",
  violet: "#5135a8",
  violetSoft: "#e8e0f5",
  steel: "#315f80",
  amber: "#754900",
  line: "#b9afc5",
} as const;

const PAPER_NAMES: Record<AnchorPaperSize, string> = {
  letter: "Letter",
  a4: "A4",
};

interface ProductTourScreen {
  pageNumber: number;
  fileName: string;
  kicker: string;
  title: string;
  summary: string;
  alt: string;
  caption: string;
}

const PRODUCT_TOUR_SCREENS: readonly ProductTourScreen[] = [
  {
    pageNumber: 21,
    fileName: "01-today-overview.jpg",
    kicker: "The center of the planner",
    title: "Today, made useful",
    summary:
      "Kairos brings the current sky, your year theme, active priorities, and your chosen pace into one starting point.",
    alt:
      "Fictional Kairos Today overview for Alex showing the yearly theme, Moon and transit summary, personal words, and three planning lanes: Creative Projects, Restoration rhythm, and Philosophy plus music theory.",
    caption:
      "The Today experience translates astrological timing into a clear emphasis: what to protect first, what to tend, and what can grow slowly at the edge of attention.",
  },
  {
    pageNumber: 22,
    fileName: "02-week-timing.jpg",
    kicker: "The week pulse",
    title: "See the week before it arrives",
    summary:
      "Daily activation, review, and lunar signals make the changing rhythm of a week visible without turning it into a rigid prediction.",
    alt:
      "Fictional seven-day Kairos Week Pulse for April 21 through 27 showing Moon signs and relative activation, review, and lunar-charge bars for each day.",
    caption:
      "The week view helps you recognize stronger action windows, reflective days, and the moments when rest or integration deserves room.",
  },
  {
    pageNumber: 23,
    fileName: "03-quarter-view.jpg",
    kicker: "Quarter and year context",
    title: "Give the year a shape",
    summary:
      "Longer arcs connect daily choices to the larger season, highlighting active themes, supportive windows, and deliberate rest periods.",
    alt:
      "Fictional Kairos second-quarter panel titled The Expanding Heart with a quarter interpretation, cosmic highlights, activation windows, and a rest period.",
    caption:
      "Quarter views keep today from becoming isolated. You can see what the current season is building toward and where timing asks for patience.",
  },
  {
    pageNumber: 24,
    fileName: "04-goals-life-areas.jpg",
    kicker: "Goals in context",
    title: "Let your priorities meet the moment",
    summary:
      "Kairos connects the life areas you care about with the timing around them, then offers a relevant doorway into reflection.",
    alt:
      "Fictional Kairos life-area cards for Creative Projects, Personal Growth, and Relationships, each with a timing summary and a pre-seeded journal prompt.",
    caption:
      "Goals are not decorative profile fields. They become planning context, and each active area can open directly into a prompt written for that moment.",
  },
  {
    pageNumber: 25,
    fileName: "05-journal.jpg",
    kicker: "A journal that knows the context",
    title: "Reflect without starting from a blank page",
    summary:
      "Timing windows, lunar moments, and active goals can open into prompts that already understand why this moment may matter.",
    alt:
      "Fictional Kairos journal demonstration with four contextual prompts based on a Jupiter window, First Quarter Moon, Creative Projects goal area, and upcoming Mars station.",
    caption:
      "Journal entries remain private. You decide what to write and, when using Planner plus Oracle, which entries may become memory for later conversations.",
  },
  {
    pageNumber: 26,
    fileName: "06-oracle.jpg",
    kicker: "Optional Planner + Oracle",
    title: "Continue the conversation with context",
    summary:
      "Stelloquy can work from your chart, current transits, goals, and the journal memory you deliberately choose—without making you repeat the whole story.",
    alt:
      "Fictional Stelloquy screen showing the context available to the optional Oracle and a sample conversation grounded in chart timing, goals, and selected journal memory.",
    caption:
      "Stelloquy is included only with Planner + Oracle. The core Kairos Planner remains the home for your blueprint, calendar, goals, and private journal.",
  },
];

const productTourImageCache = new Map<string, string>();

function productTourImageDataUri(fileName: string): string {
  const cached = productTourImageCache.get(fileName);
  if (cached) return cached;
  const bytes = readFileSync(
    new URL("../../../docs/assets/etsy/natal-report-tour/" + fileName, import.meta.url),
  );
  const dataUri = "data:image/jpeg;base64," + bytes.toString("base64");
  productTourImageCache.set(fileName, dataUri);
  return dataUri;
}

const SIGN_ABBREVIATIONS: Record<ZodiacSign, string> = {
  Aries: "Ar",
  Taurus: "Ta",
  Gemini: "Ge",
  Cancer: "Ca",
  Leo: "Le",
  Virgo: "Vi",
  Libra: "Li",
  Scorpio: "Sc",
  Sagittarius: "Sg",
  Capricorn: "Cp",
  Aquarius: "Aq",
  Pisces: "Pi",
};

const PLANET_ABBREVIATIONS: Record<Planet, string> = {
  Sun: "Su",
  Moon: "Mo",
  Mercury: "Me",
  Venus: "Ve",
  Mars: "Ma",
  Jupiter: "Ju",
  Saturn: "Sa",
  Uranus: "Ur",
  Neptune: "Ne",
  Pluto: "Pl",
};

const PLANET_ORDER: readonly Planet[] = [
  "Sun",
  "Moon",
  "Mercury",
  "Venus",
  "Mars",
  "Jupiter",
  "Saturn",
  "Uranus",
  "Neptune",
  "Pluto",
];

function escapeHtml(value: string): string {
  return value
    .split("&").join("&amp;")
    .split("<").join("&lt;")
    .split(">").join("&gt;")
    .split('"').join("&quot;")
    .split("'").join("&#039;");
}

function round4(value: number): number {
  return Math.round(value * 10_000) / 10_000;
}

function toPoint(longitude: number, radius: number, size: number): readonly [number, number] {
  const angle = ((180 - longitude) * Math.PI) / 180;
  const center = size / 2;
  return [
    round4(center + radius * Math.cos(angle)),
    round4(center + radius * Math.sin(angle)),
  ];
}

function aspectKey(aspect: AnchorAspect): string {
  const ordered = [aspect.first, aspect.second].sort(
    (left, right) => PLANET_ORDER.indexOf(left) - PLANET_ORDER.indexOf(right),
  );
  return `aspect.${ordered[0]}.${ordered[1]}.${aspect.type}`;
}

function knownLongitudeByPlanet(
  calculation: AnchorPrintArtifact["calculation"],
): ReadonlyMap<Planet, number> {
  const result = new Map<Planet, number>(
    calculation.placements.map((placement) => [placement.planet, placement.longitude]),
  );
  const moon = calculation.moon;
  if (moon.kind === "exact") result.set("Moon", moon.longitude);
  if (moon.kind === "date_stable") {
    const signIndex = Object.keys(SIGN_ABBREVIATIONS).indexOf(moon.sign);
    result.set("Moon", signIndex * 30 + (moon.degreeRange[0] + moon.degreeRange[1]) / 2);
  }
  return result;
}

function renderChartSvg(artifact: AnchorPrintArtifact): string {
  const size = 420;
  const center = size / 2;
  const outerRadius = 190;
  const labelRadius = 169;
  const planetRadius = 135;
  const aspectRadius = 112;
  const titleId = `${artifact.artifactId}-chart-title`;
  const descriptionId = `${artifact.artifactId}-chart-description`;
  const longitudes = knownLongitudeByPlanet(artifact.calculation);
  const visibleAspectIds = new Set(
    artifact.report.reference.aspects.map((aspect) => aspect.sourceFactId),
  );

  const signSegments = Object.entries(SIGN_ABBREVIATIONS)
    .map(([sign, abbreviation], index) => {
      const [x1, y1] = toPoint(index * 30, 70, size);
      const [x2, y2] = toPoint(index * 30, outerRadius, size);
      const [labelX, labelY] = toPoint(index * 30 + 15, labelRadius, size);
      const risingIndex = artifact.calculation.angles.ascendantSign
        ? Object.keys(SIGN_ABBREVIATIONS).indexOf(artifact.calculation.angles.ascendantSign)
        : -1;
      const house = risingIndex >= 0 ? ((index - risingIndex + 12) % 12) + 1 : null;
      return `<g>
        <line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" class="chart-division" />
        <text x="${labelX}" y="${labelY}" class="chart-sign">${escapeHtml(abbreviation)}</text>
        ${house === null ? "" : `<text x="${labelX}" y="${round4(labelY + 14)}" class="chart-house">H${house}</text>`}
        <title>${escapeHtml(sign)}${house === null ? "" : `, Whole Sign house ${house}`}</title>
      </g>`;
    })
    .join("");

  const aspectLines = artifact.calculation.aspects
    .filter((aspect) => visibleAspectIds.has(aspectKey(aspect)))
    .map((aspect) => {
      const first = longitudes.get(aspect.first);
      const second = longitudes.get(aspect.second);
      if (first === undefined || second === undefined) return "";
      const [x1, y1] = toPoint(first, aspectRadius, size);
      const [x2, y2] = toPoint(second, aspectRadius, size);
      return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" class="chart-aspect chart-aspect-${aspect.type}">
        <title>${escapeHtml(`${aspect.first} ${aspect.type} ${aspect.second}, ${aspect.orb.toFixed(1)} degree orb`)}</title>
      </line>`;
    })
    .join("");

  const planetMarkers = PLANET_ORDER.map((planet) => {
    const longitude = longitudes.get(planet);
    if (longitude === undefined) return "";
    const [x, y] = toPoint(longitude, planetRadius, size);
    return `<g>
      <circle cx="${x}" cy="${y}" r="11" class="chart-planet-marker" />
      <text x="${x}" y="${round4(y + 3.5)}" class="chart-planet-label">${PLANET_ABBREVIATIONS[planet]}</text>
      <title>${escapeHtml(`${planet} at ${longitude.toFixed(1)} degrees tropical longitude`)}</title>
    </g>`;
  }).join("");

  const angleMarkers = artifact.timeKnown
    ? [
        ["ASC", artifact.calculation.angles.ascendantLongitude],
        ["MC", artifact.calculation.angles.midheavenLongitude],
      ]
        .map(([label, longitude]) => {
          if (typeof longitude !== "number") return "";
          const [x, y] = toPoint(longitude, outerRadius, size);
          return `<g><circle cx="${x}" cy="${y}" r="7" class="chart-angle-marker" /><text x="${x}" y="${round4(y + 3)}" class="chart-angle-label">${label}</text></g>`;
        })
        .join("")
    : "";

  return `<svg class="natal-chart" viewBox="0 0 ${size} ${size}" role="img" aria-labelledby="${titleId} ${descriptionId}">
    <title id="${titleId}">Natal placement reference</title>
    <desc id="${descriptionId}">${escapeHtml(artifact.report.reference.chartDescription)}</desc>
    <circle cx="${center}" cy="${center}" r="${outerRadius}" class="chart-ring chart-ring-outer" />
    <circle cx="${center}" cy="${center}" r="${planetRadius}" class="chart-ring" />
    <circle cx="${center}" cy="${center}" r="${aspectRadius}" class="chart-ring chart-ring-inner" />
    ${signSegments}
    ${aspectLines}
    ${planetMarkers}
    ${angleMarkers}
    <circle cx="${center}" cy="${center}" r="3" class="chart-center" />
  </svg>`;
}

function factLabel(factId: string): string {
  const parts = factId.split(".");
  if (parts[0] === "placement") return parts[1] ?? factId;
  if (parts[0] === "angle") return parts[1] ?? factId;
  if (parts[0] === "moon") return "Moon uncertainty";
  if (parts[0] === "aspect") return `${parts[1]} ${parts[3]} ${parts[2]}`;
  return factId;
}

function renderReferencePage(artifact: AnchorPrintArtifact): string {
  const page = artifact.report.reference;
  const placementRows = page.placements
    .map((placement) => `<tr>
      <th scope="row">${escapeHtml(placement.planet)}</th>
      <td>${escapeHtml(placement.position)}${placement.retrograde ? " <span class=\"status-marker\">retrograde</span>" : ""}</td>
      <td>${escapeHtml(placement.house ?? "Omitted")}</td>
      <td>${placement.certainty === "exact" ? "Exact" : placement.certainty === "date_stable" ? "Date-stable range" : "Sign uncertain"}</td>
    </tr>`)
    .join("");
  const aspectRows = page.aspects
    .map((aspect) => `<li><span>${escapeHtml(aspect.label)}</span><span>${escapeHtml(aspect.orb)}</span></li>`)
    .join("");

  return `<section class="artifact-page reference-page" aria-labelledby="reference-title">
    <header class="artifact-header">
      <div><p class="brand-mark">KAIROS</p><p class="kicker">Chart reference</p></div>
      <p class="page-number" aria-label="Page 3 of 26">03 / 26</p>
    </header>
    <div class="title-block">
      <h1 id="reference-title">${escapeHtml(page.title)}</h1>
      <p class="subtitle">${escapeHtml(page.subtitle)}</p>
      <p class="birth-label">${escapeHtml(artifact.birthLabel)}</p>
    </div>
    <div class="reference-grid">
      <figure class="chart-panel">
        ${renderChartSvg(artifact)}
        <figcaption>${escapeHtml(page.chartDescription)}</figcaption>
      </figure>
      <div class="reference-data">
        <section aria-labelledby="placements-title">
          <h2 id="placements-title">Placements</h2>
          <table>
            <caption class="sr-only">Planetary placements with houses and certainty labels</caption>
            <thead><tr><th scope="col">Point</th><th scope="col">Position</th><th scope="col">House</th><th scope="col">Certainty</th></tr></thead>
            <tbody>${placementRows}</tbody>
          </table>
        </section>
        <section class="aspect-section" aria-labelledby="aspects-title">
          <h2 id="aspects-title">Major aspects</h2>
          <ul class="aspect-list">${aspectRows}</ul>
        </section>
      </div>
    </div>
    ${page.uncertaintyNote ? `<aside class="uncertainty-note" aria-label="Birth-time uncertainty"><strong>Time-aware reading:</strong> ${escapeHtml(page.uncertaintyNote)}</aside>` : ""}
    <footer class="artifact-footer"><p>${escapeHtml(page.methodNote)}</p><p>${escapeHtml(artifact.calculation.provenance.chartFingerprint)}</p></footer>
  </section>`;
}

function reportHeader(kicker: string, pageNumber: number): string {
  const pageLabel = String(pageNumber).padStart(2, "0") + " / 26";
  return `<header class="artifact-header">
    <div><p class="brand-mark">KAIROS</p><p class="kicker">${escapeHtml(kicker)}</p></div>
    <p class="page-number" aria-label="Page ${pageNumber} of 26">${pageLabel}</p>
  </header>`;
}

function renderCoverPage(artifact: AnchorPrintArtifact): string {
  return `<section class="artifact-page cover-page" aria-labelledby="report-title">
    <div class="cover-orbit orbit-one" aria-hidden="true"></div>
    <div class="cover-orbit orbit-two" aria-hidden="true"></div>
    <p class="cover-brand">KAIROS</p>
    <div class="cover-copy">
      <p class="cover-kicker">Personal natal astrology</p>
      <h1 id="report-title">${escapeHtml(artifact.report.title)}</h1>
      <p class="cover-subtitle">${escapeHtml(artifact.report.subtitle)}</p>
      <p class="cover-birth">${escapeHtml(artifact.birthLabel)}</p>
    </div>
    <div class="cover-note">
      <span>26-page report + Kairos Planner tour</span>
      <span>Tropical zodiac · Whole Sign houses</span>
    </div>
  </section>`;
}

function renderWelcomePage(artifact: AnchorPrintArtifact): string {
  return `<section class="artifact-page prose-page" aria-labelledby="welcome-title">
    ${reportHeader("How to use this report", 2)}
    <div class="chapter-heading">
      <p class="chapter-index">Orientation</p>
      <h1 id="welcome-title">A map for reflection, not a verdict</h1>
      <p class="chapter-summary">Begin with the whole pattern. Return to individual chapters as lived experience gives their symbols more context.</p>
    </div>
    <div class="prose-columns">
      <p>${escapeHtml(artifact.report.openingLetter[0])}</p>
      <p>${escapeHtml(artifact.report.openingLetter[1])}</p>
    </div>
    <aside class="reading-guide" aria-labelledby="reading-guide-title">
      <h2 id="reading-guide-title">A useful reading sequence</h2>
      <ol>
        <li><strong>Verify the reference.</strong> Check the birth label and placement table before interpreting.</li>
        <li><strong>Read for patterns.</strong> Notice repeated ideas across chapters rather than isolating one placement.</li>
        <li><strong>Test through experience.</strong> Keep what becomes specific and useful; question what remains generic.</li>
        <li><strong>Preserve uncertainty.</strong> Missing birth-time information is named instead of silently invented.</li>
      </ol>
    </aside>
    <footer class="artifact-footer"><p>Prepared for private personal reflection.</p><p>02 / 26</p></footer>
  </section>`;
}

function renderPatternGroup(title: string, entries: readonly { label: string; count: number }[]): string {
  const maximum = Math.max(1, ...entries.map((entry) => entry.count));
  return `<section class="pattern-group">
    <h2>${escapeHtml(title)}</h2>
    <ul>${entries.map((entry) => `<li>
      <div><span>${escapeHtml(entry.label)}</span><strong>${entry.count}</strong></div>
      <span class="pattern-track" aria-hidden="true"><span style="width: ${(entry.count / maximum) * 100}%"></span></span>
    </li>`).join("")}</ul>
  </section>`;
}

function renderPatternPage(artifact: AnchorPrintArtifact): string {
  const patterns = artifact.report.patterns;
  return `<section class="artifact-page pattern-page" aria-labelledby="patterns-title">
    ${reportHeader("Chart architecture", 4)}
    <div class="chapter-heading compact-heading">
      <p class="chapter-index">Pattern overview</p>
      <h1 id="patterns-title">The balance beneath the placements</h1>
      <p class="chapter-summary">Counts do not define personality. They show which kinds of movement receive repeated emphasis and which may need more deliberate recruitment.</p>
    </div>
    <div class="pattern-grid">
      ${renderPatternGroup("Elements", patterns.elements)}
      ${renderPatternGroup("Modalities", patterns.modalities)}
      ${renderPatternGroup("Polarities", patterns.polarities)}
      ${renderPatternGroup("House emphasis", patterns.houseEmphasis)}
    </div>
    ${patterns.caveat ? `<aside class="uncertainty-note"><strong>Time-aware boundary:</strong> ${escapeHtml(patterns.caveat)}</aside>` : ""}
    <footer class="artifact-footer"><p>Counts include the ten planets when their signs are stable.</p><p>04 / 26</p></footer>
  </section>`;
}

function renderChapterPage(
  artifact: AnchorPrintArtifact,
  section: AnchorPrintArtifact["report"]["sections"][number],
  index: number,
): string {
  const pageNumber = index + 5;
  const points = section.keyPoints
    .map((point, pointIndex) => `<li><span aria-hidden="true">${String(pointIndex + 1).padStart(2, "0")}</span><p>${escapeHtml(point)}</p></li>`)
    .join("");
  return `<section class="artifact-page chapter-page" aria-labelledby="chapter-${index + 1}-title">
    ${reportHeader(section.eyebrow, pageNumber)}
    <div class="chapter-heading">
      <p class="chapter-index">Chapter ${String(index + 1).padStart(2, "0")}</p>
      <h1 id="chapter-${index + 1}-title">${escapeHtml(section.title)}</h1>
      <p class="chapter-summary">${escapeHtml(section.summary)}</p>
    </div>
    <div class="chapter-body">
      <p>${escapeHtml(section.paragraphs[0])}</p>
      <p>${escapeHtml(section.paragraphs[1])}</p>
    </div>
    <section class="practice-panel" aria-labelledby="practice-${index + 1}-title">
      <h2 id="practice-${index + 1}-title">Three ways to work with this pattern</h2>
      <ol>${points}</ol>
    </section>
    <p class="source-note">Grounded in: ${section.sourceFactIds.map(factLabel).map(escapeHtml).join(" · ")}</p>
    <footer class="artifact-footer"><p>Interpretation is reflective and requires human review before delivery.</p><p>${String(pageNumber).padStart(2, "0")} / 26</p></footer>
  </section>`;
}

function renderReflectionPage(artifact: AnchorPrintArtifact): string {
  const prompts = artifact.report.reflectionPrompts
    .map((prompt, index) => `<li><span aria-hidden="true">${String(index + 1).padStart(2, "0")}</span><p>${escapeHtml(prompt)}</p></li>`)
    .join("");
  return `<section class="artifact-page reflection-page" aria-labelledby="reflection-title">
    ${reportHeader("Integration", 19)}
    <div class="chapter-heading">
      <p class="chapter-index">Your lived evidence</p>
      <h1 id="reflection-title">Questions worth returning to</h1>
      <p class="chapter-summary">These prompts are invitations to observe. They are not tests, predictions, or requirements to agree with the report.</p>
    </div>
    <ol class="prompt-list">${prompts}</ol>
    <footer class="artifact-footer"><p>Write elsewhere or use the open space; this PDF remains selectable and printable.</p><p>19 / 26</p></footer>
  </section>`;
}

function renderPlannerAdPage(artifact: AnchorPrintArtifact): string {
  const productionDisclosure = artifact.narrativeProvenance.generationMethod === "ai_assisted_human_reviewed"
    ? "AI-assisted drafting supported portions of this report; every delivered report requires human review."
    : "This report was written and reviewed by a human.";
  return `<section class="artifact-page planner-ad-page" aria-labelledby="planner-ad-title">
    <div class="planner-ad-orbit planner-ad-orbit-one" aria-hidden="true"></div>
    <div class="planner-ad-orbit planner-ad-orbit-two" aria-hidden="true"></div>
    <header class="planner-ad-header">
      <p>KAIROS</p>
      <p>A PERSONAL ASTROLOGY PLANNER</p>
      <p>20 / 26</p>
    </header>
    <div class="planner-ad-hero">
      <p class="planner-ad-kicker">The report ends. Your year continues.</p>
      <h1 id="planner-ad-title">Plan your life with the sky.</h1>
      <p>Kairos is a personalized astrology planner that brings your natal chart, real astrological timing, your goals, and your private journal entries into one living planning system.</p>
    </div>
    <section class="planner-ad-features" aria-label="What Kairos brings together">
      <article><p>01</p><div><h2>Your chart</h2><p>A natal blueprint built from your actual birth details—not a generic Sun-sign profile.</p></div></article>
      <article><p>02</p><div><h2>Your timing</h2><p>Real transits, lunar phases, and personal timing windows that give your plans context.</p></div></article>
      <article><p>03</p><div><h2>Your goals</h2><p>What matters to you, carried into the same system as your astrology and calendar.</p></div></article>
      <article><p>04</p><div><h2>Your journal</h2><p>Private entries with astrological timing context, helping lived patterns become visible over time.</p></div></article>
    </section>
    <section class="planner-ad-cta" aria-labelledby="planner-cta-title">
      <p>MEET THE KAIROS PLANNER</p>
      <h2 id="planner-cta-title">Your chart. Your goals. Your timing. One place.</h2>
      <p>Turn the insight in this report into an ongoing rhythm of planning, reflection, and personal evidence.</p>
      <a href="https://kairosplanner.xyz">kairosplanner.xyz <span aria-hidden="true">→</span></a>
    </section>
    <footer class="planner-ad-footer">
      <p>This Natal Report is a separate, complete Kairos product. Planner access is not included with this purchase.</p>
      <p>${escapeHtml(productionDisclosure)} Reflective astrology only—not medical, mental-health, legal, financial, or other professional advice.</p>
    </footer>
  </section>`;
}

function renderProductTourPage(screen: ProductTourScreen): string {
  return `<section class="artifact-page product-tour-page" aria-labelledby="product-tour-title-${screen.pageNumber}">
    ${reportHeader(screen.kicker, screen.pageNumber)}
    <div class="product-tour-heading">
      <p class="chapter-index">Inside the Kairos Planner</p>
      <h1 id="product-tour-title-${screen.pageNumber}">${escapeHtml(screen.title)}</h1>
      <p>${escapeHtml(screen.summary)}</p>
    </div>
    <figure class="product-tour-figure">
      <img src="${productTourImageDataUri(screen.fileName)}" alt="${escapeHtml(screen.alt)}" />
      <figcaption>${escapeHtml(screen.caption)}</figcaption>
    </figure>
    <footer class="artifact-footer"><p>Real Kairos interface · fictional demo data · no buyer information</p><p>${String(screen.pageNumber).padStart(2, "0")} / 26</p></footer>
  </section>`;
}

function renderKeepsake(artifact: AnchorPrintArtifact): string {
  const items = artifact.anchorPrint.items.map((item) => `<article class="keepsake-card">
    <p class="keepsake-number" aria-hidden="true">${escapeHtml(item.label)}</p>
    <div><h2>${escapeHtml(item.title)}</h2><p>${escapeHtml(item.text)}</p></div>
  </article>`).join("");
  return `<section class="artifact-page keepsake-page" aria-labelledby="keepsake-title">
    <div class="keepsake-constellation" aria-hidden="true"></div>
    <header class="keepsake-header"><p class="cover-brand">KAIROS</p><p>PERSONAL NATAL ANCHOR PRINT</p></header>
    <div class="keepsake-title-block">
      <h1 id="keepsake-title">${escapeHtml(artifact.anchorPrint.title)}</h1>
      <p>${escapeHtml(artifact.anchorPrint.subtitle)}</p>
      <p class="cover-birth">${escapeHtml(artifact.birthLabel)}</p>
    </div>
    <div class="keepsake-grid">${items}</div>
    ${artifact.anchorPrint.uncertaintyNote ? `<aside class="keepsake-uncertainty"><strong>Time-aware reading:</strong> ${escapeHtml(artifact.anchorPrint.uncertaintyNote)}</aside>` : ""}
    <footer class="keepsake-footer"><p>Use with the accompanying twenty-six-page report.</p><p>Reflective astrology · personal use</p></footer>
  </section>`;
}

function renderReport(artifact: AnchorPrintArtifact): string {
  return [
    renderCoverPage(artifact),
    renderWelcomePage(artifact),
    renderReferencePage(artifact),
    renderPatternPage(artifact),
    ...artifact.report.sections.map((section, index) => renderChapterPage(artifact, section, index)),
    renderReflectionPage(artifact),
    renderPlannerAdPage(artifact),
    ...PRODUCT_TOUR_SCREENS.map((screen) => renderProductTourPage(screen)),
  ].join("");
}

function styles(pageWidthMm: number, pageHeightMm: number, paperName: string): string {
  return `
    :root {
      --paper: ${ANCHOR_PRINT_PALETTE.paper};
      --paper-deep: ${ANCHOR_PRINT_PALETTE.paperDeep};
      --ink: ${ANCHOR_PRINT_PALETTE.ink};
      --ink-muted: ${ANCHOR_PRINT_PALETTE.inkMuted};
      --violet: ${ANCHOR_PRINT_PALETTE.violet};
      --violet-soft: ${ANCHOR_PRINT_PALETTE.violetSoft};
      --steel: ${ANCHOR_PRINT_PALETTE.steel};
      --amber: ${ANCHOR_PRINT_PALETTE.amber};
      --line: ${ANCHOR_PRINT_PALETTE.line};
    }
    @page { size: ${paperName}; margin: 0; }
    * { box-sizing: border-box; }
    html, body { margin: 0; padding: 0; background: #d7d3ca; color: var(--ink); }
    body { font-family: "Aptos", "Segoe UI", Arial, sans-serif; font-size: 11pt; line-height: 1.5; }
    .artifact-page {
      width: ${pageWidthMm}mm;
      height: ${pageHeightMm}mm;
      margin: 0 auto;
      padding: 13mm 14mm 12mm;
      background: var(--paper);
      break-after: page;
      page-break-after: always;
      break-inside: avoid;
      page-break-inside: avoid;
      position: relative;
      overflow: hidden;
      print-color-adjust: exact;
      -webkit-print-color-adjust: exact;
    }
    .artifact-page:last-child { break-after: auto; page-break-after: auto; }
    .artifact-page::before {
      content: "";
      position: absolute;
      inset: 0;
      border-top: 4mm solid var(--violet);
      pointer-events: none;
    }
    .artifact-header, .artifact-footer { display: flex; align-items: flex-start; justify-content: space-between; gap: 8mm; }
    .artifact-header { margin-top: 2mm; border-bottom: 0.35mm solid var(--line); padding-bottom: 4mm; }
    .brand-mark { margin: 0; color: var(--violet); font: 700 9pt/1 "Aptos", "Segoe UI", sans-serif; letter-spacing: 0.22em; }
    .kicker, .page-number { margin: 1.5mm 0 0; color: var(--ink-muted); font-size: 8pt; letter-spacing: 0.08em; text-transform: uppercase; }
    .title-block { margin: 7mm 0 5mm; }
    .title-block.compact { margin-bottom: 4mm; }
    h1, h2 { font-family: "Iowan Old Style", Georgia, serif; color: var(--ink); }
    h1 { margin: 0; font-size: 27pt; line-height: 1.05; font-weight: 600; letter-spacing: -0.02em; }
    h2 { margin: 0 0 2mm; font-size: 13pt; line-height: 1.15; font-weight: 600; }
    p { orphans: 3; widows: 3; }
    .subtitle { max-width: 72ch; margin: 2mm 0 0; color: var(--ink-muted); font-family: "Iowan Old Style", Georgia, serif; font-size: 12pt; line-height: 1.45; }
    .birth-label { margin: 2mm 0 0; color: var(--steel); font-size: 9pt; font-weight: 600; }
    .reference-grid { display: grid; grid-template-columns: 0.9fr 1.1fr; gap: 7mm; align-items: start; }
    .chart-panel { margin: 0; }
    .natal-chart { width: 100%; height: auto; display: block; }
    .chart-ring, .chart-division { fill: none; stroke: #766f82; stroke-width: 0.8; }
    .chart-ring-outer { stroke: var(--violet); stroke-width: 1.4; }
    .chart-ring-inner { stroke-dasharray: 3 4; }
    .chart-sign, .chart-house, .chart-planet-label, .chart-angle-label { text-anchor: middle; font-family: "Aptos", "Segoe UI", sans-serif; }
    .chart-sign { fill: var(--violet); font-size: 11px; font-weight: 700; }
    .chart-house { fill: var(--ink-muted); font-size: 8px; }
    .chart-planet-marker { fill: var(--paper); stroke: var(--violet); stroke-width: 1.4; }
    .chart-planet-label { fill: var(--ink); font-size: 8px; font-weight: 700; }
    .chart-angle-marker { fill: var(--amber); stroke: var(--ink); stroke-width: 0.7; }
    .chart-angle-label { fill: #fff; font-size: 5px; font-weight: 700; }
    .chart-center { fill: var(--violet); }
    .chart-aspect { fill: none; stroke: var(--steel); stroke-width: 1.1; opacity: 0.8; }
    .chart-aspect-opposition { stroke-dasharray: 8 3; }
    .chart-aspect-square { stroke-dasharray: 3 3; }
    .chart-aspect-trine { stroke: var(--violet); }
    .chart-aspect-sextile { stroke: var(--amber); stroke-dasharray: 1 3; }
    .chart-aspect-conjunction { stroke-width: 2; }
    figcaption { margin-top: 2mm; color: var(--ink-muted); font-size: 11pt; line-height: 1.4; }
    table { width: 100%; border-collapse: collapse; font-size: 11pt; line-height: 1.25; font-variant-numeric: tabular-nums; }
    th, td { border-bottom: 0.25mm solid var(--line); padding: 1.35mm 1mm; text-align: left; vertical-align: top; }
    thead th { color: var(--ink-muted); font-size: 7pt; letter-spacing: 0.06em; text-transform: uppercase; }
    tbody th { color: var(--violet); font-weight: 700; }
    .status-marker { color: var(--amber); font-size: 7pt; font-weight: 700; text-transform: uppercase; }
    .aspect-section { margin-top: 4mm; }
    .aspect-list { list-style: none; margin: 0; padding: 0; }
    .aspect-list li { display: flex; justify-content: space-between; gap: 5mm; border-bottom: 0.25mm solid var(--line); padding: 1.2mm 0; font-size: 11pt; }
    .uncertainty-note { margin-top: 4mm; border-left: 1.2mm solid var(--amber); background: #f0e4c9; padding: 3mm 4mm; color: #49340d; font-size: 11pt; }
    .artifact-footer { position: absolute; left: 14mm; right: 14mm; bottom: 8mm; border-top: 0.25mm solid var(--line); padding-top: 2mm; color: var(--ink-muted); font-size: 6.8pt; }
    .artifact-footer p { margin: 0; max-width: 70%; overflow-wrap: anywhere; }
    .anchors-page h1 { font-size: 24pt; }
    .anchors-page { padding-bottom: 8mm; }
    .anchors-page .subtitle { font-size: 11pt; line-height: 1.35; }
    .anchor-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 2.5mm; }
    .anchor-card { display: grid; grid-template-columns: 7mm 1fr; gap: 2.5mm; border: 0.3mm solid var(--line); border-radius: 3mm; background: rgba(255,255,255,0.28); padding: 3mm; }
    .anchor-card h2 { font-size: 12pt; line-height: 1.1; }
    .anchor-card p { margin: 0; font-size: 11pt; line-height: 1.28; }
    .anchor-number { color: var(--violet) !important; font-size: 9pt !important; font-weight: 700; letter-spacing: 0.06em; }
    .source-note { margin-top: 2mm !important; color: var(--steel); font-size: 7.2pt !important; font-weight: 600; }
    .reflection-panel { margin-top: 3mm; border-top: 0.8mm solid var(--violet); background: var(--violet-soft); padding: 3mm 4mm; }
    .reflection-panel ol { margin: 1mm 0 0; padding-left: 5mm; columns: 3; column-gap: 7mm; }
    .reflection-panel li { break-inside: avoid; padding-right: 2mm; font: 11pt/1.4 "Iowan Old Style", Georgia, serif; }
    .disclosure-footer { margin-top: 2mm; border-top: 0.25mm solid var(--line); padding-top: 1.5mm; color: var(--ink-muted); font-size: 11pt; line-height: 1.25; }
    .disclosure-footer p { margin: 0 0 0.8mm; }
    .cover-page, .keepsake-page {
      color: #f7f2e8;
      background: #0c0d21;
    }
    .cover-page::before, .keepsake-page::before { border-top-color: #b87938; }
    .cover-brand { margin: 5mm 0 0; color: #d9b47e; font-size: 10pt; font-weight: 700; letter-spacing: 0.32em; }
    .cover-copy { position: absolute; left: 18mm; right: 18mm; top: 76mm; z-index: 2; }
    .cover-kicker { margin: 0 0 5mm; color: #93d7e5; font-size: 9pt; font-weight: 700; letter-spacing: 0.18em; text-transform: uppercase; }
    .cover-page h1 { max-width: 150mm; color: #fffaf0; font-size: 38pt; line-height: 1.03; }
    .cover-subtitle { max-width: 120mm; margin: 5mm 0 0; color: #d9d2e8; font: 14pt/1.5 "Iowan Old Style", Georgia, serif; }
    .cover-birth { margin: 6mm 0 0; color: #a9dce7; font-size: 10pt; font-weight: 600; letter-spacing: 0.04em; }
    .cover-note, .keepsake-footer {
      position: absolute; left: 18mm; right: 18mm; bottom: 14mm;
      display: flex; justify-content: space-between; gap: 8mm;
      border-top: 0.25mm solid rgba(255,255,255,0.3); padding-top: 3mm;
      color: #d9d2e8; font-size: 8pt; letter-spacing: 0.04em;
    }
    .cover-orbit { position: absolute; border: 0.35mm solid rgba(217,180,126,0.4); border-radius: 50%; }
    .orbit-one { width: 150mm; height: 150mm; right: -56mm; top: 24mm; }
    .orbit-two { width: 92mm; height: 92mm; right: -12mm; top: 52mm; border-color: rgba(147,215,229,0.36); }
    .chapter-heading { margin: 10mm 0 8mm; max-width: 155mm; }
    .compact-heading { margin-bottom: 5mm; }
    .chapter-index { margin: 0 0 3mm; color: var(--violet); font-size: 8pt; font-weight: 700; letter-spacing: 0.16em; text-transform: uppercase; }
    .chapter-summary { max-width: 72ch; margin: 4mm 0 0; color: var(--steel); font: 13pt/1.45 "Iowan Old Style", Georgia, serif; }
    .prose-columns, .chapter-body { max-width: 148mm; }
    .prose-columns p, .chapter-body p, .method-copy p { margin: 0 0 5mm; font: 11pt/1.65 "Iowan Old Style", Georgia, serif; }
    .reading-guide { margin-top: 8mm; border: 0.35mm solid var(--line); background: var(--paper-deep); padding: 6mm; }
    .reading-guide ol { margin: 3mm 0 0; padding-left: 6mm; display: grid; gap: 3mm; }
    .reading-guide li { padding-left: 2mm; font-size: 11pt; line-height: 1.45; }
    .pattern-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 5mm; }
    .pattern-group { border: 0.3mm solid var(--line); background: rgba(255,255,255,0.35); padding: 5mm; }
    .pattern-group ul { list-style: none; margin: 0; padding: 0; }
    .pattern-group li { margin-top: 3mm; }
    .pattern-group li > div { display: flex; justify-content: space-between; gap: 4mm; font-size: 10.5pt; }
    .pattern-track { display: block; height: 2.2mm; margin-top: 1.2mm; background: #ddd5e5; }
    .pattern-track > span { display: block; height: 100%; background: repeating-linear-gradient(135deg, var(--violet), var(--violet) 2mm, #735dc2 2mm, #735dc2 4mm); }
    .chapter-body { border-left: 0.8mm solid var(--line); padding-left: 7mm; }
    .practice-panel { margin-top: 8mm; border-top: 0.8mm solid var(--violet); background: var(--violet-soft); padding: 5mm 6mm; }
    .practice-panel ol { list-style: none; margin: 3mm 0 0; padding: 0; display: grid; gap: 3mm; }
    .practice-panel li { display: grid; grid-template-columns: 8mm 1fr; gap: 3mm; align-items: start; }
    .practice-panel li > span, .prompt-list li > span { color: var(--violet); font-size: 8pt; font-weight: 700; letter-spacing: 0.08em; }
    .practice-panel li p, .prompt-list li p { margin: 0; font: 11pt/1.45 "Iowan Old Style", Georgia, serif; }
    .chapter-page > .source-note { margin-top: 5mm !important; }
    .prompt-list { list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: 1fr 1fr; gap: 4mm; }
    .prompt-list li { display: grid; grid-template-columns: 8mm 1fr; gap: 3mm; min-height: 31mm; border: 0.3mm solid var(--line); background: rgba(255,255,255,0.32); padding: 5mm; }
    .planner-ad-page { padding: 12mm 14mm; color: #f7f2e8; background: #0c0d21; }
    .planner-ad-page::before { border-top-color: #b87938; }
    .planner-ad-header { position: relative; z-index: 2; display: grid; grid-template-columns: auto 1fr auto; align-items: baseline; gap: 6mm; border-bottom: 0.25mm solid rgba(255,255,255,0.3); padding: 2mm 0 4mm; }
    .planner-ad-header p { margin: 0; color: #a9dce7; font-size: 8pt; font-weight: 700; letter-spacing: 0.14em; }
    .planner-ad-header p:first-child { color: #d9b47e; font-size: 10pt; letter-spacing: 0.3em; }
    .planner-ad-header p:last-child { text-align: right; }
    .planner-ad-hero { position: relative; z-index: 2; margin: 13mm 0 8mm; max-width: 155mm; }
    .planner-ad-kicker { margin: 0 0 4mm; color: #93d7e5; font-size: 9pt; font-weight: 700; letter-spacing: 0.15em; text-transform: uppercase; }
    .planner-ad-page h1, .planner-ad-page h2 { color: #fffaf0; }
    .planner-ad-page h1 { max-width: 145mm; font-size: 38pt; line-height: 1.02; }
    .planner-ad-hero > p:last-child { max-width: 145mm; margin: 5mm 0 0; color: #d9d2e8; font: 14pt/1.48 "Iowan Old Style", Georgia, serif; }
    .planner-ad-features { position: relative; z-index: 2; display: grid; grid-template-columns: 1fr 1fr; gap: 3.5mm; }
    .planner-ad-features article { min-height: 37mm; display: grid; grid-template-columns: 9mm 1fr; gap: 3mm; border: 0.25mm solid rgba(255,255,255,0.25); background: rgba(21,17,55,0.68); padding: 4mm; }
    .planner-ad-features article > p { margin: 1mm 0 0; color: #d9b47e; font-size: 8pt; font-weight: 700; letter-spacing: 0.08em; }
    .planner-ad-features h2 { margin: 0 0 1.5mm; font-size: 14pt; }
    .planner-ad-features article div p { margin: 0; color: #d9d2e8; font-size: 11pt; line-height: 1.35; }
    .planner-ad-cta { position: relative; z-index: 2; margin-top: 7mm; border-left: 1.2mm solid #d9b47e; background: #5135a8; padding: 5mm 6mm; }
    .planner-ad-cta > p:first-child { margin: 0 0 1.5mm; color: #bdebf3; font-size: 8pt; font-weight: 700; letter-spacing: 0.14em; }
    .planner-ad-cta h2 { margin: 0 0 2mm; font-size: 19pt; }
    .planner-ad-cta > p:not(:first-child) { margin: 0 0 3mm; color: #f0ebf6; font: 11pt/1.4 "Iowan Old Style", Georgia, serif; }
    .planner-ad-cta a { display: inline-block; color: #fffaf0; font-size: 16pt; font-weight: 700; text-decoration: underline; text-decoration-thickness: 0.35mm; text-underline-offset: 1.2mm; }
    .planner-ad-footer { position: absolute; z-index: 2; left: 14mm; right: 14mm; bottom: 10mm; display: grid; grid-template-columns: 1fr 1fr; gap: 8mm; border-top: 0.25mm solid rgba(255,255,255,0.3); padding-top: 3mm; }
    .planner-ad-footer p { margin: 0; color: #cfc8dc; font-size: 8pt; line-height: 1.35; }
    .planner-ad-orbit { position: absolute; border: 0.35mm solid rgba(217,180,126,0.28); border-radius: 50%; }
    .planner-ad-orbit-one { width: 125mm; height: 125mm; right: -58mm; top: 22mm; }
    .planner-ad-orbit-two { width: 70mm; height: 70mm; right: -10mm; top: 50mm; border-color: rgba(147,215,229,0.25); }
    .product-tour-page { background: var(--paper); }
    .product-tour-heading { margin: 9mm 0 6mm; max-width: 165mm; }
    .product-tour-heading h1 { font-size: 28pt; }
    .product-tour-heading > p:last-child { max-width: 150mm; margin: 3mm 0 0; color: var(--steel); font: 13pt/1.45 "Iowan Old Style", Georgia, serif; }
    .product-tour-figure { margin: 0; }
    .product-tour-figure img { display: block; width: 100%; max-height: 145mm; object-fit: contain; object-position: center top; border: 0.35mm solid #302743; border-radius: 2mm; background: #0a0b16; box-shadow: 0 3mm 8mm rgba(30,24,45,0.18); }
    .product-tour-figure figcaption { margin: 5mm 0 0; border-left: 1mm solid var(--violet); background: var(--violet-soft); padding: 4mm 5mm; color: var(--ink); font: 11pt/1.45 "Iowan Old Style", Georgia, serif; }
    .keepsake-page { padding: 12mm 13mm; }
    .keepsake-page::after {
      content: ""; position: absolute; inset: 8mm; border: 0.25mm solid rgba(217,180,126,0.42);
      pointer-events: none;
    }
    .keepsake-header { position: relative; z-index: 2; display: flex; align-items: baseline; justify-content: space-between; gap: 6mm; }
    .keepsake-header p:last-child { color: #a9dce7; font-size: 7.5pt; font-weight: 700; letter-spacing: 0.13em; }
    .keepsake-title-block { position: relative; z-index: 2; margin: 10mm 4mm 7mm; }
    .keepsake-title-block h1 { color: #fffaf0; font-size: 29pt; }
    .keepsake-title-block > p:not(.cover-birth) { margin: 3mm 0 0; color: #d9d2e8; font: 12pt/1.4 "Iowan Old Style", Georgia, serif; }
    .keepsake-grid { position: relative; z-index: 2; display: grid; grid-template-columns: 1fr 1fr; gap: 3.5mm; margin: 0 4mm; }
    .keepsake-card { min-height: 44mm; display: grid; grid-template-columns: 8mm 1fr; gap: 3mm; border: 0.25mm solid rgba(255,255,255,0.28); background: rgba(5,8,25,0.52); padding: 4mm; }
    .keepsake-card h2 { color: #fffaf0; font-size: 12pt; }
    .keepsake-card p { margin: 0; color: #ddd8e8; font-size: 11pt; line-height: 1.35; }
    .keepsake-card .keepsake-number { color: #d9b47e; font-size: 8pt; font-weight: 700; }
    .keepsake-uncertainty { position: relative; z-index: 2; margin: 4mm; border-left: 1mm solid #d9b47e; background: rgba(5,8,25,0.7); padding: 3mm 4mm; color: #fff2d9; font-size: 10.5pt; line-height: 1.35; }
    .keepsake-constellation { position: absolute; width: 75mm; height: 75mm; right: -18mm; top: -12mm; border: 0.3mm solid rgba(147,215,229,0.3); border-radius: 50%; }
    .sr-only { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0,0,0,0); white-space: nowrap; border: 0; }
    @media print { html, body { background: transparent; } .artifact-page { margin: 0; } }
  `;
}

export function renderAnchorPrintHtml(
  artifact: AnchorPrintArtifact,
  paperSize: AnchorPaperSize,
  documentKind: AnchorDocumentKind = "report",
): string {
  const variant = artifact.files.find(
    (file) => file.paperSize === paperSize && file.documentKind === documentKind,
  );
  if (!variant) {
    throw new RangeError(`Unsupported natal document variant: ${documentKind}/${paperSize}`);
  }
  const paperName = PAPER_NAMES[paperSize];
  const documentTitle = documentKind === "report"
    ? artifact.report.title
    : artifact.anchorPrint.title;
  const metadataTitle =
    artifact.product.name + " · " +
    (documentKind === "report" ? "Report" : "Anchor Print") + " · " +
    paperName;
  const documentBody = documentKind === "report"
    ? renderReport(artifact)
    : renderKeepsake(artifact);
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="robots" content="noindex,nofollow,noarchive" />
  <meta name="generator" content="Kairos ${escapeHtml(artifact.templateVersion)}" />
  <title>${escapeHtml(metadataTitle)}</title>
  <style>${styles(variant.pageWidthMm, variant.pageHeightMm, paperName)}</style>
</head>
<body>
  <main aria-label="${escapeHtml(documentTitle)}">
    ${documentBody}
  </main>
</body>
</html>`;
}

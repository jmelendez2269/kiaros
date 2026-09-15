import { ZODIAC_SIGNS } from "@/types/blueprint";

import {
  STAR_FAMILY_CHART_PRINT_SIZES,
  type StarFamilyChartPrintSize,
  type StarOriginArtifact,
  type StarOriginChartHighlight,
  type StarOriginChartMarker,
} from "./contract.ts";
import { resonanceRoleLabel } from "./profile.ts";

export const STAR_FAMILY_CHART_TEMPLATE_VERSION =
  "star-family-chart.plate.v2" as const;

export const STAR_FAMILY_CHART_PRINT_DIMENSIONS: Readonly<
  Record<
    StarFamilyChartPrintSize,
    { label: string; widthMm: number; heightMm: number }
  >
> = {
  "8x10": { label: "8 × 10 in", widthMm: 203.2, heightMm: 254 },
  "11x14": { label: "11 × 14 in", widthMm: 279.4, heightMm: 355.6 },
  "16x20": { label: "16 × 20 in", widthMm: 406.4, heightMm: 508 },
  a4: { label: "A4", widthMm: 210, heightMm: 297 },
  a3: { label: "A3", widthMm: 297, heightMm: 420 },
};

const SIGN_LABELS = [
  { glyph: "♈", name: "Aries" },
  { glyph: "♉", name: "Taurus" },
  { glyph: "♊", name: "Gemini" },
  { glyph: "♋", name: "Cancer" },
  { glyph: "♌", name: "Leo" },
  { glyph: "♍", name: "Virgo" },
  { glyph: "♎", name: "Libra" },
  { glyph: "♏", name: "Scorpio" },
  { glyph: "♐", name: "Sagittarius" },
  { glyph: "♑", name: "Capricorn" },
  { glyph: "♒", name: "Aquarius" },
  { glyph: "♓", name: "Pisces" },
] as const;

const MARKER_GLYPHS: Readonly<Record<string, string>> = {
  sun: "☉",
  moon: "☽",
  mercury: "☿",
  venus: "♀",
  mars: "♂",
  jupiter: "♃",
  saturn: "♄",
  uranus: "♅",
  neptune: "♆",
  pluto: "♇",
  ascendant: "ASC",
  midheaven: "MC",
  north_node: "☊",
  south_node: "☋",
};

const DECORATIVE_STARS = [
  [86, 114, 1.8], [150, 72, 1.1], [230, 126, 1.4], [322, 78, 1],
  [424, 104, 1.5], [518, 68, 1.2], [650, 128, 1.8], [704, 212, 1],
  [72, 244, 1.1], [124, 334, 1.6], [682, 326, 1.3], [66, 452, 1.7],
  [696, 474, 1.1], [118, 578, 1.2], [218, 670, 1.5], [342, 696, 1],
  [470, 682, 1.7], [594, 642, 1.1], [672, 568, 1.5], [86, 638, 1],
] as const;

function escapeHtml(value: string): string {
  return value
    .split("&").join("&amp;")
    .split("<").join("&lt;")
    .split(">").join("&gt;")
    .split('"').join("&quot;")
    .split("'").join("&#039;");
}

function round(value: number): number {
  return Math.round(value * 1_000) / 1_000;
}

function point(longitude: number, radius: number): readonly [number, number] {
  const angle = ((180 - longitude) * Math.PI) / 180;
  return [
    round(380 + radius * Math.cos(angle)),
    round(380 + radius * Math.sin(angle)),
  ];
}

function markerRadius(marker: StarOriginChartMarker): number {
  if (marker.kind === "angle") return 266;
  if (marker.kind === "node") return 204;
  return 238;
}

function rankShape(highlight: StarOriginChartHighlight): string {
  const [x, y] = point(highlight.starLongitude, 330);
  if (highlight.rank === 1) {
    return `<path d="M ${x} ${round(y - 13)} L ${round(x + 3)} ${round(y - 3)} L ${round(x + 13)} ${y} L ${round(x + 3)} ${round(y + 3)} L ${x} ${round(y + 13)} L ${round(x - 3)} ${round(y + 3)} L ${round(x - 13)} ${y} L ${round(x - 3)} ${round(y - 3)} Z" class="highlight-star highlight-star-1" />`;
  }
  if (highlight.rank === 2) {
    return `<path d="M ${x} ${round(y - 11)} L ${round(x + 4)} ${round(y - 4)} L ${round(x + 11)} ${y} L ${round(x + 4)} ${round(y + 4)} L ${x} ${round(y + 11)} L ${round(x - 4)} ${round(y + 4)} L ${round(x - 11)} ${y} L ${round(x - 4)} ${round(y - 4)} Z" class="highlight-star highlight-star-2" />`;
  }
  return `<path d="M ${x} ${round(y - 9)} L ${round(x + 9)} ${y} L ${x} ${round(y + 9)} L ${round(x - 9)} ${y} Z" class="highlight-star highlight-star-3" />`;
}

function chartDescription(artifact: StarOriginArtifact): string {
  const highlights = artifact.chartPrint.highlights
    .map(
      (highlight) =>
        highlight.displayName +
        " through " +
        highlight.starName +
        " meeting " +
        highlight.markerName +
        " at " +
        highlight.orb.toFixed(2) +
        " degrees",
    )
    .join("; ");
  return (
    "Tropical Whole Sign natal chart highlighting the three closest Star Origin resonances: " +
    highlights +
    "."
  );
}

const SVG_STYLES = `
  .star-family-wheel { --paper:#0a1028; --ink:#fff8e8; --muted:#c4bfd1; --violet:#b9a2ff; --violet-deep:#7561b4; --copper:#f4bd72; --steel:#8dd8ef; --line:#726d89; --starlight:#fff2c7; }
  .celestial-glow { fill:url(#celestial-glow); }
  .constellation-line { fill:none; stroke:#9584c8; stroke-width:.8; stroke-opacity:.34; }
  .decorative-star { fill:var(--starlight); opacity:.72; }
  .wheel-ring { fill:none; stroke:var(--line); stroke-width:1.1; }
  .wheel-ring-outer { stroke:var(--copper); stroke-width:2.4; }
  .wheel-ring-crown { stroke:var(--starlight); stroke-width:.7; stroke-dasharray:1 8; opacity:.8; }
  .wheel-ring-inner { stroke-dasharray:2 6; }
  .zodiac-division { stroke:#827b9b; stroke-width:1; }
  .zodiac-label,.house-label,.highlight-rank,.natal-marker text { text-anchor:middle; font-family:Aptos,"Segoe UI",sans-serif; }
  .zodiac-label { fill:var(--starlight); font-size:10.5px; font-weight:800; letter-spacing:.035em; }
  .zodiac-glyph { font-family:"Segoe UI Symbol","Noto Sans Symbols 2",serif; font-size:17px; }
  .house-label { fill:var(--muted); font-size:8px; font-weight:700; }
  .natal-marker circle { fill:#111936; stroke:var(--ink); stroke-width:1.25; }
  .natal-marker-angle circle { fill:var(--violet-deep); stroke:var(--starlight); }
  .natal-marker-angle text { fill:var(--paper); }
  .natal-marker-node circle { stroke:var(--steel); stroke-width:1.8; }
  .natal-marker text { fill:var(--ink); font-family:"Segoe UI Symbol","Noto Sans Symbols 2","Aptos",sans-serif; font-size:14px; font-weight:700; }
  .natal-marker-angle text { font-family:Aptos,"Segoe UI",sans-serif; font-size:7.5px; font-weight:850; }
  .highlight-line { fill:none; stroke-width:4; stroke-linecap:round; filter:url(#line-glow); }
  .highlight-halo { fill:none; stroke-width:2.5; filter:url(#line-glow); }
  .highlight-star { stroke-width:2; }
  .highlight-rank { font-size:9px; font-weight:900; }
  .highlight-1 .highlight-line,.highlight-1 .highlight-halo { stroke:var(--copper); }
  .highlight-1 .highlight-star { fill:var(--copper); stroke:var(--starlight); filter:url(#star-glow); }
  .highlight-1 .highlight-rank { fill:var(--copper); }
  .highlight-2 .highlight-line,.highlight-2 .highlight-halo { stroke:var(--violet); stroke-dasharray:12 6; }
  .highlight-2 .highlight-star { fill:var(--violet); stroke:var(--starlight); filter:url(#star-glow); }
  .highlight-2 .highlight-rank { fill:var(--violet); }
  .highlight-3 .highlight-line,.highlight-3 .highlight-halo { stroke:var(--steel); stroke-dasharray:2 7; }
  .highlight-3 .highlight-star { fill:var(--steel); stroke:var(--starlight); filter:url(#star-glow); }
  .highlight-3 .highlight-rank { fill:var(--steel); }
  .wheel-center { fill:var(--starlight); filter:url(#star-glow); }
  .center-compass { fill:none; stroke:var(--copper); stroke-width:1.1; opacity:.86; }
`;

export function renderStarFamilyChartSvg(artifact: StarOriginArtifact): string {
  if (artifact.chartPrint.highlights.length !== 3) {
    throw new RangeError(
      "A standalone Star Family chart requires three highlighted resonances.",
    );
  }

  const titleId = escapeHtml(artifact.artifactId + "-star-family-chart-title");
  const descriptionId = escapeHtml(
    artifact.artifactId + "-star-family-chart-description",
  );
  const risingIndex = artifact.chartPrint.risingSign
    ? ZODIAC_SIGNS.indexOf(artifact.chartPrint.risingSign)
    : -1;
  const divisions = SIGN_LABELS.map((sign, index) => {
    const [innerX, innerY] = point(index * 30, 278);
    const [outerX, outerY] = point(index * 30, 346);
    const [labelX, labelY] = point(index * 30 + 15, 312);
    const house = risingIndex < 0 ? null : ((index - risingIndex + 12) % 12) + 1;
    return `<g>
      <line x1="${innerX}" y1="${innerY}" x2="${outerX}" y2="${outerY}" class="zodiac-division" />
      <text x="${labelX}" y="${round(labelY - 5)}" class="zodiac-label"><tspan class="zodiac-glyph">${sign.glyph}</tspan><tspan dx="4">${sign.name}</tspan></text>
      ${house === null ? "" : `<text x="${labelX}" y="${round(labelY + 12)}" class="house-label">HOUSE ${house}</text>`}
    </g>`;
  }).join("");

  const markers = artifact.chartPrint.markers.map((marker) => {
    const radius = markerRadius(marker);
    const [x, y] = point(marker.longitude, radius);
    return `<g class="natal-marker natal-marker-${marker.kind}">
      <circle cx="${x}" cy="${y}" r="${marker.kind === "planet" ? 10 : 12}" />
      <text x="${x}" y="${round(y + 4.5)}">${escapeHtml(MARKER_GLYPHS[marker.markerId] ?? marker.abbreviation)}</text>
      <title>${escapeHtml(marker.displayName + " at " + marker.longitude.toFixed(2) + " degrees")}</title>
    </g>`;
  }).join("");

  const highlights = artifact.chartPrint.highlights.map((highlight) => {
    const marker = artifact.chartPrint.markers.find(
      (candidate) => candidate.markerId === highlight.markerId,
    );
    if (!marker) return "";
    const [starX, starY] = point(highlight.starLongitude, 330);
    const [markerX, markerY] = point(
      highlight.markerLongitude,
      markerRadius(marker),
    );
    const [rankX, rankY] = point(highlight.starLongitude, 355);
    return `<g class="highlight highlight-${highlight.rank}">
      <line x1="${starX}" y1="${starY}" x2="${markerX}" y2="${markerY}" class="highlight-line" />
      <circle cx="${markerX}" cy="${markerY}" r="17" class="highlight-halo" />
      ${rankShape(highlight)}
      <text x="${rankX}" y="${round(rankY + 4)}" class="highlight-rank">0${highlight.rank}</text>
      <title>${escapeHtml(highlight.displayName + ": " + highlight.starName + " to " + highlight.markerName + ", " + highlight.orb.toFixed(2) + " degree orb")}</title>
    </g>`;
  }).join("");

  const decorativeStars = DECORATIVE_STARS.map(
    ([x, y, radius]) =>
      `<circle cx="${x}" cy="${y}" r="${radius}" class="decorative-star" />`,
  ).join("");

  return `<svg class="star-family-wheel" viewBox="0 0 760 760" role="img" aria-labelledby="${titleId} ${descriptionId}">
    <style>${SVG_STYLES}</style>
    <title id="${titleId}">Top three Star Family birth chart</title>
    <desc id="${descriptionId}">${escapeHtml(chartDescription(artifact))}</desc>
    <defs>
      <radialGradient id="celestial-glow" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#4d3f80" stop-opacity=".30" /><stop offset=".58" stop-color="#252044" stop-opacity=".13" /><stop offset="1" stop-color="#0a1028" stop-opacity="0" /></radialGradient>
      <filter id="line-glow" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="1.5" result="blur" /><feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
      <filter id="star-glow" x="-80%" y="-80%" width="260%" height="260%"><feGaussianBlur stdDeviation="2.2" result="blur" /><feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
    </defs>
    <circle cx="380" cy="380" r="370" class="celestial-glow" />
    <g aria-hidden="true">${decorativeStars}<path d="M 86 114 L 150 72 L 230 126 L 322 78 M 518 68 L 650 128 L 704 212 M 66 452 L 118 578 L 218 670 M 470 682 L 594 642 L 672 568" class="constellation-line" /></g>
    <circle cx="380" cy="380" r="357" class="wheel-ring wheel-ring-crown" />
    <circle cx="380" cy="380" r="346" class="wheel-ring wheel-ring-outer" />
    <circle cx="380" cy="380" r="278" class="wheel-ring" />
    <circle cx="380" cy="380" r="176" class="wheel-ring wheel-ring-inner" />
    ${divisions}
    <g class="highlight-layer">${highlights}</g>
    <g class="marker-layer">${markers}</g>
    <path d="M 380 360 L 385 375 L 400 380 L 385 385 L 380 400 L 375 385 L 360 380 L 375 375 Z" class="center-compass" />
    <circle cx="380" cy="380" r="3.5" class="wheel-center" />
  </svg>`;
}

function renderLegend(artifact: StarOriginArtifact): string {
  return artifact.chartPrint.highlights.map((highlight) => {
    const role = resonanceRoleLabel(highlight.role);
    return `<li class="legend-item legend-item-${highlight.rank}">
      <span class="legend-rank">0${highlight.rank}</span>
      <span class="legend-copy">
        <strong>${escapeHtml(highlight.displayName)}</strong>
        <span>${escapeHtml(role)}</span>
        <span>${escapeHtml(highlight.starName)} to ${escapeHtml(highlight.markerName)} · ${highlight.orb.toFixed(2)}°</span>
      </span>
    </li>`;
  }).join("");
}

function renderSymbolGuide(artifact: StarOriginArtifact): string {
  return artifact.chartPrint.markers.map((marker) => {
    const glyph = MARKER_GLYPHS[marker.markerId] ?? marker.abbreviation;
    return `<span class="symbol-item"><span class="symbol-glyph">${escapeHtml(glyph)}</span><span>${escapeHtml(marker.displayName)}</span></span>`;
  }).join("");
}

function styles(
  printSize: StarFamilyChartPrintSize,
): string {
  const dimensions = STAR_FAMILY_CHART_PRINT_DIMENSIONS[printSize];
  const scale = dimensions.widthMm / 203.2;
  const chartMm = Math.min(
    dimensions.widthMm - 28 * scale,
    dimensions.heightMm * 0.515,
  );
  return `
    @page { size:${dimensions.widthMm}mm ${dimensions.heightMm}mm; margin:0; }
    * { box-sizing:border-box; }
    :root {
      --paper:#080d21;
      --paper-deep:#111936;
      --ink:#fff8e8;
      --muted:#c8c3d4;
      --violet:#b9a2ff;
      --violet-deep:#7561b4;
      --copper:#f4bd72;
      --steel:#8dd8ef;
      --line:#5f5b74;
      --starlight:#fff2c7;
      --scale:${scale};
      --chart:${chartMm}mm;
    }
    html,body { margin:0; padding:0; background:#030714; color:var(--ink); }
    body { font-family:"Aptos","Segoe UI",sans-serif; }
    .poster {
      position:relative;
      display:grid;
      grid-template-rows:auto minmax(0,1fr) auto auto auto;
      width:${dimensions.widthMm}mm;
      height:${dimensions.heightMm}mm;
      overflow:hidden;
      background:
        radial-gradient(circle at 50% 41%,rgba(112,83,190,.24),transparent 31%),
        radial-gradient(circle at 14% 18%,rgba(85,202,229,.10),transparent 18%),
        radial-gradient(circle at 88% 76%,rgba(244,189,114,.08),transparent 20%),
        linear-gradient(155deg,#0d1532 0%,#080d21 45%,#060a19 100%),
        var(--paper);
      padding:calc(8mm * var(--scale)) calc(12mm * var(--scale)) calc(6mm * var(--scale));
      border-top:calc(1.2mm * var(--scale)) solid var(--copper);
      isolation:isolate;
    }
    .poster::before {
      content:"";
      position:absolute;
      inset:calc(5mm * var(--scale));
      border:calc(.24mm * var(--scale)) solid rgba(244,189,114,.48);
      box-shadow:inset 0 0 0 calc(.65mm * var(--scale)) rgba(185,162,255,.08);
      pointer-events:none;
      z-index:2;
    }
    .poster::after {
      content:"";
      position:absolute;
      inset:0;
      background-image:
        radial-gradient(circle at 8% 12%,rgba(255,242,199,.85) 0 calc(.22mm * var(--scale)),transparent calc(.28mm * var(--scale))),
        radial-gradient(circle at 22% 28%,rgba(141,216,239,.62) 0 calc(.18mm * var(--scale)),transparent calc(.25mm * var(--scale))),
        radial-gradient(circle at 76% 14%,rgba(255,242,199,.7) 0 calc(.2mm * var(--scale)),transparent calc(.27mm * var(--scale))),
        radial-gradient(circle at 91% 42%,rgba(185,162,255,.7) 0 calc(.18mm * var(--scale)),transparent calc(.25mm * var(--scale))),
        radial-gradient(circle at 14% 72%,rgba(255,242,199,.7) 0 calc(.16mm * var(--scale)),transparent calc(.23mm * var(--scale))),
        radial-gradient(circle at 84% 88%,rgba(141,216,239,.64) 0 calc(.2mm * var(--scale)),transparent calc(.27mm * var(--scale)));
      opacity:.75;
      pointer-events:none;
      z-index:-1;
    }
    .poster-header { position:relative; z-index:1; text-align:center; }
    .brand {
      margin:0;
      color:var(--starlight);
      font-size:calc(6.8pt * var(--scale));
      font-weight:850;
      letter-spacing:.34em;
    }
    .celestial-ornament {
      display:block;
      width:calc(30mm * var(--scale));
      height:calc(6mm * var(--scale));
      margin:calc(1.7mm * var(--scale)) auto 0;
      color:var(--copper);
    }
    .kicker {
      margin:calc(1.5mm * var(--scale)) 0 0;
      color:var(--copper);
      font-size:calc(7pt * var(--scale));
      font-weight:850;
      letter-spacing:.18em;
      text-transform:uppercase;
    }
    h1 {
      margin:calc(1.5mm * var(--scale)) 0 0;
      color:var(--ink);
      font:700 calc(24pt * var(--scale))/1 "Iowan Old Style",Georgia,serif;
      letter-spacing:-.018em;
      text-shadow:0 0 calc(4mm * var(--scale)) rgba(185,162,255,.23);
    }
    .subject {
      margin:calc(2mm * var(--scale)) 0 0;
      color:var(--muted);
      font-size:calc(8pt * var(--scale));
      font-weight:650;
    }
    .chart-figure {
      display:grid;
      place-items:center;
      min-height:0;
      margin:0;
    }
    .star-family-wheel { width:var(--chart); height:var(--chart); overflow:visible; }
    .legend {
      display:grid;
      grid-template-columns:repeat(3,minmax(0,1fr));
      gap:calc(2.5mm * var(--scale));
      margin:0;
      padding:0;
      list-style:none;
    }
    .legend-item {
      display:grid;
      grid-template-columns:auto 1fr;
      gap:calc(2mm * var(--scale));
      min-width:0;
      border:calc(.22mm * var(--scale)) solid rgba(255,248,232,.18);
      border-top:calc(.7mm * var(--scale)) solid currentColor;
      border-radius:calc(1.6mm * var(--scale));
      padding:calc(2.2mm * var(--scale));
      background:rgba(255,255,255,.035);
    }
    .legend-item-1 { color:var(--copper); }
    .legend-item-2 { color:var(--violet); border-top-style:dashed; }
    .legend-item-3 { color:var(--steel); border-top-style:dotted; }
    .legend-rank { font-size:calc(7pt * var(--scale)); font-weight:900; letter-spacing:.1em; }
    .legend-copy { display:grid; align-content:start; gap:calc(.6mm * var(--scale)); min-width:0; }
    .legend-copy strong { color:var(--ink); font:700 calc(12pt * var(--scale))/1.05 "Iowan Old Style",Georgia,serif; }
    .legend-copy span { color:var(--muted); font-size:calc(6.5pt * var(--scale)); font-weight:650; line-height:1.25; }
    .symbol-guide {
      display:grid;
      grid-template-columns:repeat(7,minmax(0,1fr));
      gap:calc(1mm * var(--scale)) calc(1.5mm * var(--scale));
      margin-top:calc(3mm * var(--scale));
      border-top:calc(.22mm * var(--scale)) solid rgba(244,189,114,.38);
      border-bottom:calc(.22mm * var(--scale)) solid rgba(244,189,114,.22);
      padding:calc(1.8mm * var(--scale)) 0;
    }
    .symbol-guide-title {
      grid-column:1 / -1;
      margin:0 0 calc(.5mm * var(--scale));
      color:var(--copper);
      font-size:calc(5.8pt * var(--scale));
      font-weight:850;
      letter-spacing:.18em;
      text-align:center;
      text-transform:uppercase;
    }
    .symbol-item {
      display:flex;
      align-items:center;
      justify-content:center;
      gap:calc(.8mm * var(--scale));
      min-width:0;
      color:var(--muted);
      font-size:calc(5.4pt * var(--scale));
      font-weight:650;
      white-space:nowrap;
    }
    .symbol-glyph {
      color:var(--starlight);
      font-family:"Segoe UI Symbol","Noto Sans Symbols 2","Aptos",sans-serif;
      font-size:calc(9.2pt * var(--scale));
      line-height:1;
    }
    .poster-footer {
      display:flex;
      justify-content:space-between;
      gap:calc(6mm * var(--scale));
      margin-top:calc(2.5mm * var(--scale));
      border-top:calc(.25mm * var(--scale)) solid var(--line);
      padding-top:calc(2.5mm * var(--scale));
      color:var(--muted);
      font-size:calc(5.8pt * var(--scale));
      line-height:1.35;
    }
    .poster-footer p { margin:0; }
    .poster-footer p:last-child { text-align:right; }
    .sr-only { position:absolute; width:1px; height:1px; margin:-1px; overflow:hidden; clip:rect(0,0,0,0); white-space:nowrap; }
    @media screen {
      .poster { margin:10mm auto; box-shadow:0 24px 90px rgba(0,0,0,.55); }
    }
    @media print {
      html,body { background:transparent; }
      .poster { margin:0; box-shadow:none; }
    }
  `;
}

export function renderStarFamilyChartPrintHtml(
  artifact: StarOriginArtifact,
  printSize: StarFamilyChartPrintSize,
): string {
  if (!STAR_FAMILY_CHART_PRINT_SIZES.includes(printSize)) {
    throw new RangeError("Unsupported Star Family chart print size.");
  }
  if (!artifact.chartPrintFiles.some((file) => file.printSize === printSize)) {
    throw new RangeError("This artifact has no standalone chart-print variant.");
  }
  const birth = artifact.normalizedBirth;
  const birthLabel =
    birth.date +
    " · " +
    (birth.timeUnknown ? "birth time unknown" : birth.time) +
    " · " +
    birth.city +
    ", " +
    birth.country;
  const title = artifact.displayName
    ? artifact.displayName + " · Star Family Birth Chart"
    : "Private Star Family Birth Chart";
  return `<!doctype html>
  <html lang="en"><head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <meta name="robots" content="noindex,nofollow,noarchive" />
    <meta name="generator" content="Kairos ${STAR_FAMILY_CHART_TEMPLATE_VERSION}" />
    <title>${escapeHtml(title)}</title>
    <style>${styles(printSize)}</style>
  </head><body><main>
    <article class="poster" aria-labelledby="chart-print-title">
      <header class="poster-header">
        <p class="brand">KAIROS</p>
        <svg class="celestial-ornament" viewBox="0 0 160 32" aria-hidden="true">
          <path d="M8 16 H58 M102 16 H152" fill="none" stroke="currentColor" stroke-width="1" opacity=".65" />
          <circle cx="80" cy="16" r="9" fill="none" stroke="currentColor" stroke-width="1.3" />
          <path d="M80 1 L83 13 L95 16 L83 19 L80 31 L77 19 L65 16 L77 13 Z" fill="currentColor" />
          <circle cx="48" cy="16" r="2" fill="currentColor" /><circle cx="112" cy="16" r="2" fill="currentColor" />
        </svg>
        <p class="kicker">Top three fixed-star resonances</p>
        <h1 id="chart-print-title">Star Family Birth Chart</h1>
        <p class="subject">${escapeHtml(artifact.displayName ?? birthLabel)}</p>
      </header>
      <figure class="chart-figure">
        ${renderStarFamilyChartSvg(artifact)}
        <figcaption class="sr-only">${escapeHtml(chartDescription(artifact))}</figcaption>
      </figure>
      <ol class="legend" aria-label="Ranked Star Family contacts">
        ${renderLegend(artifact)}
      </ol>
      <section class="symbol-guide" aria-labelledby="symbol-guide-title">
        <h2 class="symbol-guide-title" id="symbol-guide-title">Celestial symbol key</h2>
        ${renderSymbolGuide(artifact)}
      </section>
      <footer class="poster-footer">
        <p>${escapeHtml(birthLabel)}</p>
        <p>Tropical zodiac · Whole Sign houses<br />Birth-year-adjusted fixed stars · ${escapeHtml(STAR_FAMILY_CHART_PRINT_DIMENSIONS[printSize].label)}</p>
      </footer>
    </article>
  </main></body></html>`;
}

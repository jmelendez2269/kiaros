import { assertYearMapDeliverable } from "./generator.ts";
import type { CelestialYearMapPrintSize, YearAheadArtifact } from "./contract.ts";

export const CELESTIAL_YEAR_MAP_DIMENSIONS: Record<CelestialYearMapPrintSize, { label: string; widthMm: number; heightMm: number }> = {
  "8x10": { label: "8 × 10 in", widthMm: 203.2, heightMm: 254 },
  "11x14": { label: "11 × 14 in", widthMm: 279.4, heightMm: 355.6 },
  "16x20": { label: "16 × 20 in", widthMm: 406.4, heightMm: 508 },
  a4: { label: "A4", widthMm: 210, heightMm: 297 },
  a3: { label: "A3", widthMm: 297, heightMm: 420 },
};

function escapeHtml(value: string): string {
  return value.replace(/[&<>'"]/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;",
  })[character] ?? character);
}

function shortDate(value: string): string {
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "UTC" })
    .format(new Date(`${value}T12:00:00Z`));
}

function dayOffset(start: string, value: string): number {
  return Math.round((new Date(`${value}T12:00:00Z`).getTime() - new Date(`${start}T12:00:00Z`).getTime()) / 86_400_000);
}

function polar(day: number, radius: number): readonly [number, number] {
  const angle = (day / 365) * Math.PI * 2 - Math.PI / 2;
  return [50 + Math.cos(angle) * radius, 50 + Math.sin(angle) * radius];
}

export function renderCelestialYearMapSvg(artifact: YearAheadArtifact): string {
  assertYearMapDeliverable(artifact);
  const start = artifact.calculation.forecastStart;
  const quarterRings = artifact.calculation.quarters.map((quarter, index) => {
    const day = dayOffset(start, quarter.startDate);
    const [x, y] = polar(day, 40);
    return `<line x1="50" y1="50" x2="${x.toFixed(2)}" y2="${y.toFixed(2)}" class="quarter"/><text x="${x.toFixed(2)}" y="${y.toFixed(2)}" class="quarter-label">Q${index + 1}</text>`;
  }).join("");
  const points = artifact.calculation.activationWindows.map((window) => {
    const day = dayOffset(start, window.peakDate);
    const [x, y] = polar(day, 32);
    return `<g><circle cx="${x.toFixed(2)}" cy="${y.toFixed(2)}" r="3.2" class="point p${window.rank}"/><text x="${x.toFixed(2)}" y="${(y + .7).toFixed(2)}" class="rank">${window.rank}</text></g>`;
  }).join("");
  return `<svg viewBox="0 0 100 100" role="img" aria-label="Circular birthday-year map with four quarters and the three ranked activation windows"><circle cx="50" cy="50" r="42" class="outer"/><circle cx="50" cy="50" r="32" class="inner"/>${quarterRings}${points}<circle cx="50" cy="50" r="16" class="core"/><text x="50" y="47" class="sun">☉</text><text x="50" y="54" class="theme">${escapeHtml(artifact.calculation.profection.theme)}</text><text x="50" y="59" class="lord">${escapeHtml(artifact.calculation.profection.lord)} · Lord of Year</text></svg>`;
}

export function renderCelestialYearMapHtml(artifact: YearAheadArtifact, size: CelestialYearMapPrintSize): string {
  assertYearMapDeliverable(artifact);
  const dimensions = CELESTIAL_YEAR_MAP_DIMENSIONS[size];
  const name = artifact.displayName ?? "Your Celestial Year";
  const windows = artifact.calculation.activationWindows.map((window) => `<li class="w${window.rank}"><span>0${window.rank}</span><div><strong>${escapeHtml(window.title)}</strong><p>${shortDate(window.startDate)} — ${shortDate(window.endDate)}</p><small>Closest ${shortDate(window.peakDate)} · ${escapeHtml(window.lifeArea)}${window.profectionRelevant ? " · profection-linked" : ""}</small></div></li>`).join("");
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${escapeHtml(`${name} Celestial Year Map`)}</title><style>
  @page{size:${dimensions.widthMm}mm ${dimensions.heightMm}mm;margin:0}*{box-sizing:border-box}html,body{margin:0;width:${dimensions.widthMm}mm;height:${dimensions.heightMm}mm;background:#120e1d;color:#fff8e9;font-family:Georgia,'Times New Roman',serif;print-color-adjust:exact;-webkit-print-color-adjust:exact}main{position:relative;width:100%;height:100%;overflow:hidden;padding:7% 8%;background:radial-gradient(circle at 50% 34%,#493363 0,#251938 34%,#120e1d 72%)}main:before{content:"";position:absolute;inset:3%;border:1px solid #b78d58;pointer-events:none}header{text-align:center;position:relative;z-index:2}.kicker{margin:0;color:#efbf80;font:800 clamp(7pt,1.1vw,12pt) Arial,sans-serif;letter-spacing:.25em;text-transform:uppercase}h1{font-size:clamp(24pt,6vw,58pt);line-height:1;margin:3% 0 1%}.span{font:600 clamp(8pt,1.4vw,14pt) Arial,sans-serif;color:#ddd0e6}.chart{width:min(70%,90mm);margin:2% auto 0}.chart svg{display:block;width:100%}.outer,.inner{fill:none;stroke:#d2aa72;stroke-width:.45}.inner{stroke:#80669b;stroke-dasharray:1.5 1.5}.quarter{stroke:#8f779f;stroke-width:.25}.quarter-label{fill:#efbf80;font:700 3px Arial;text-anchor:middle}.point{stroke:#fff5df;stroke-width:.45}.p1{fill:#bd6d3f}.p2{fill:#8e71bd}.p3{fill:#4e87a8}.rank{fill:#fff;text-anchor:middle;font:800 2.5px Arial}.core{fill:#2f2144;stroke:#d2aa72;stroke-width:.45}.sun{fill:#efbf80;font-size:8px;text-anchor:middle}.theme{fill:#fff8e9;font:700 4px Georgia;text-anchor:middle}.lord{fill:#d8c9df;font:2px Arial;text-anchor:middle}.windows{list-style:none;padding:0;margin:2% auto 0;max-width:92%;display:grid;gap:clamp(2mm,.9vw,5mm)}.windows li{display:grid;grid-template-columns:clamp(9mm,5vw,18mm) 1fr;gap:3%;padding:2.2% 3%;background:#f2e8d8;color:#21182c;border-left:clamp(1.5mm,.7vw,4mm) solid #bd6d3f}.windows .w2{border-color:#8060ad}.windows .w3{border-color:#467a9a}.windows span{color:#9d5a38;font:800 clamp(8pt,1.5vw,15pt) Arial}.windows strong{font-size:clamp(9pt,1.8vw,18pt)}.windows p,.windows small{margin:1% 0 0;font:600 clamp(7pt,1.15vw,12pt)/1.35 Arial,sans-serif;color:#554b59}.legend{margin:2.2% auto 0;max-width:92%;border-top:1px solid #8f779f;padding-top:2%;display:grid;grid-template-columns:1fr 1fr;gap:3%;font:clamp(6.5pt,1vw,10pt)/1.45 Arial,sans-serif;color:#d9cce2}.legend strong{color:#efbf80}footer{position:absolute;bottom:4.5%;left:8%;right:8%;display:flex;justify-content:space-between;font:700 clamp(6pt,.8vw,9pt) Arial,sans-serif;letter-spacing:.13em;color:#bcaac8}
  </style></head><body><main><header><p class="kicker">Kairos · Birthday-to-birthday timing</p><h1>${escapeHtml(name)}</h1><p class="span">${shortDate(artifact.calculation.forecastStart)} ${artifact.targetBirthdayYear} — ${shortDate(artifact.calculation.forecastEnd)} ${artifact.targetBirthdayYear + 1}</p></header><div class="chart">${renderCelestialYearMapSvg(artifact)}</div><ol class="windows">${windows}</ol><div class="legend"><p><strong>How to read the orbit</strong><br>The ring moves clockwise through four quarters. Numbered points mark the closest date inside each wider timing window.</p><p><strong>What the colors mean</strong><br>Terracotta is rank 1, violet rank 2, and blue rank 3. Rank numbers and written labels repeat every color cue.</p></div><footer><span>TROPICAL · WHOLE SIGN</span><span>${escapeHtml(dimensions.label)} · REFLECTIVE ASTROLOGY</span></footer></main></body></html>`;
}

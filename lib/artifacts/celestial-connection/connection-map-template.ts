import {
  CONNECTION_RELATIONSHIP_LABELS,
  type CelestialConnectionArtifact, type ConnectionMapPrintSize, type ConnectionPointName,
} from "./contract.ts";

export const CONNECTION_MAP_DIMENSIONS: Record<ConnectionMapPrintSize, { label: string; widthMm: number; heightMm: number }> = {
  "8x10": { label: "8 × 10 in", widthMm: 203.2, heightMm: 254 },
  "11x14": { label: "11 × 14 in", widthMm: 279.4, heightMm: 355.6 },
  "16x20": { label: "16 × 20 in", widthMm: 406.4, heightMm: 508 },
  a4: { label: "A4", widthMm: 210, heightMm: 297 }, a3: { label: "A3", widthMm: 297, heightMm: 420 },
};
const ABBR: Record<ConnectionPointName, string> = {
  Sun: "SUN", Moon: "MOON", Mercury: "MER", Venus: "VEN", Mars: "MAR", Jupiter: "JUP",
  Saturn: "SAT", Uranus: "URA", Neptune: "NEP", Pluto: "PLU", Ascendant: "ASC", Midheaven: "MC", NorthNode: "NODE",
};
function escapeHtml(value: string): string { return value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char] ?? char); }
function xy(longitude: number, radius: number): readonly [number, number] {
  const angle = (longitude - 90) * Math.PI / 180; return [60 + Math.cos(angle) * radius, 60 + Math.sin(angle) * radius];
}
function point(placement: { point: ConnectionPointName; longitude: number }, radius: number, className: string): string {
  const [x, y] = xy(placement.longitude, radius);
  return `<g><circle cx="${x.toFixed(2)}" cy="${y.toFixed(2)}" r="2.15" class="${className}"/><text x="${x.toFixed(2)}" y="${(y + .8).toFixed(2)}" class="point-label">${ABBR[placement.point]}</text></g>`;
}
export function renderConnectionMapSvg(artifact: CelestialConnectionArtifact): string {
  const a = artifact.calculation.personAPlacements.filter((item) => !item.timeSensitive);
  const b = artifact.calculation.personBPlacements.filter((item) => !item.timeSensitive);
  const lines = artifact.calculation.signatures.map((signature, index) => {
    const left = a.find((item) => item.point === signature.personAPoint); const right = b.find((item) => item.point === signature.personBPoint);
    if (!left || !right) return ""; const [x1, y1] = xy(left.longitude, 46); const [x2, y2] = xy(right.longitude, 35);
    return `<g><line x1="${x1.toFixed(2)}" y1="${y1.toFixed(2)}" x2="${x2.toFixed(2)}" y2="${y2.toFixed(2)}" class="sig sig-${index + 1}"/><circle cx="${((x1 + x2) / 2).toFixed(2)}" cy="${((y1 + y2) / 2).toFixed(2)}" r="2.4" class="rank-bg"/><text x="${((x1 + x2) / 2).toFixed(2)}" y="${(((y1 + y2) / 2) + .9).toFixed(2)}" class="rank">${index + 1}</text></g>`;
  }).join("");
  const zodiac = Array.from({ length: 12 }, (_, index) => { const [x1, y1] = xy(index * 30, 50); const [x2, y2] = xy(index * 30, 53); return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" class="tick"/>`; }).join("");
  return `<svg viewBox="0 0 120 120" role="img" aria-labelledby="connection-map-title connection-map-desc" xmlns="http://www.w3.org/2000/svg"><title id="connection-map-title">Celestial Connection double-orbit chart for ${escapeHtml(artifact.input.personA.displayName)} and ${escapeHtml(artifact.input.personB.displayName)}</title><desc id="connection-map-desc">Person A appears on the terracotta outer orbit, Person B on the lavender inner orbit, and the three ranked synastry signatures are numbered on their connecting lines.</desc><circle cx="60" cy="60" r="53" class="outer"/><circle cx="60" cy="60" r="46" class="orbit-a"/><circle cx="60" cy="60" r="35" class="orbit-b"/>${zodiac}${lines}${a.map((item) => point(item, 46, "person-a")).join("")}${b.map((item) => point(item, 35, "person-b")).join("")}<circle cx="60" cy="60" r="15" class="core"/><text x="60" y="57" class="core-kicker">CELESTIAL</text><text x="60" y="62" class="core-title">CONNECTION</text><text x="60" y="66" class="core-note">COMPOSITE CENTER</text></svg>`;
}
export function renderConnectionMapHtml(artifact: CelestialConnectionArtifact, size: ConnectionMapPrintSize): string {
  const dimensions = CONNECTION_MAP_DIMENSIONS[size]; const a = escapeHtml(artifact.input.personA.displayName); const b = escapeHtml(artifact.input.personB.displayName);
  const signatureItems = artifact.calculation.signatures.map((item) => `<li><span class="number">0${item.rank}</span><div><strong>${escapeHtml(`${item.personAPoint} ${item.aspect} ${item.personBPoint}`)}</strong><small>${escapeHtml(item.title)} · ${item.orb.toFixed(2)}° orb · ${escapeHtml(item.tone.replace(/_/g, " "))}</small></div></li>`).join("");
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Celestial Connection · ${a} and ${b}</title><style>
  @page{size:${dimensions.widthMm}mm ${dimensions.heightMm}mm;margin:0}*{box-sizing:border-box}html,body{margin:0;width:${dimensions.widthMm}mm;height:${dimensions.heightMm}mm;background:#120d1d;color:#fff8e9;font-family:Georgia,'Times New Roman',serif}body{print-color-adjust:exact;-webkit-print-color-adjust:exact}.poster{position:relative;width:100%;height:100%;overflow:hidden;padding:7% 8%;background:radial-gradient(circle at 50% 36%,#49365f 0,#221731 42%,#100c19 84%)}.poster:before{content:"";position:absolute;inset:3.2%;border:1px solid #bf9b69}.stars{position:absolute;inset:0;background-image:radial-gradient(#f2ca8d 0.55px,transparent .8px);background-size:19px 23px;opacity:.24}.content{position:relative;height:100%;display:flex;flex-direction:column;align-items:center}.kicker{font:800 8pt Arial,sans-serif;letter-spacing:.3em;color:#efc58c;text-transform:uppercase;margin:0}.names{font-size:clamp(22pt,4.5vw,48pt);line-height:1.05;text-align:center;margin:2.5% 0 0}.relation{font:700 8pt Arial,sans-serif;letter-spacing:.2em;text-transform:uppercase;color:#d8c8e2;margin-top:1.5%}.chart{width:min(88%,${Math.min(dimensions.widthMm, dimensions.heightMm) * .68}mm);aspect-ratio:1;margin:auto}.chart svg{width:100%;height:100%}.outer,.orbit-a,.orbit-b{fill:none}.outer{stroke:#c3a06f;stroke-width:.42}.orbit-a{stroke:#c27048;stroke-width:.55}.orbit-b{stroke:#a98acb;stroke-width:.55}.tick{stroke:#9f87af;stroke-width:.32}.person-a{fill:#c27048;stroke:#fff4dd;stroke-width:.45}.person-b{fill:#a98acb;stroke:#fff4dd;stroke-width:.45}.point-label{fill:#fffaf0;font:700 1.6px Arial,sans-serif;text-anchor:middle}.sig{fill:none;stroke-width:.6}.sig-1{stroke:#efbd72}.sig-2{stroke:#c49bd8;stroke-dasharray:2 1}.sig-3{stroke:#78a9bf;stroke-dasharray:.7 1}.rank-bg{fill:#231733;stroke:#fff4dd;stroke-width:.25}.rank{fill:#fff;font:700 1.8px Arial,sans-serif;text-anchor:middle}.core{fill:#251832;stroke:#c3a06f;stroke-width:.4}.core-kicker{fill:#eec183;font:700 1.6px Arial,sans-serif;text-anchor:middle;letter-spacing:.2px}.core-title{fill:#fff7eb;font:700 2.2px Georgia,serif;text-anchor:middle}.core-note{fill:#d7c9df;font:700 1.2px Arial,sans-serif;text-anchor:middle}.legend{width:100%;display:grid;gap:2.2mm;list-style:none;padding:0;margin:0}.legend li{display:grid;grid-template-columns:10mm 1fr;gap:3mm;border-top:1px solid #7c658f;padding-top:2mm}.number{font:800 8pt Arial;color:#efbd72}.legend strong{display:block;font-size:9pt}.legend small{display:block;margin-top:.8mm;font:7.2pt/1.35 Arial;color:#d9cce0}.key{margin:3mm 0 0;font:7pt/1.4 Arial;color:#cfc1d8;text-align:center}.method{margin-top:2.2mm;font:6.4pt/1.4 Arial;color:#a99caf;text-align:center}
  </style></head><body><main class="poster" aria-label="Celestial Connection wall print"><div class="stars"></div><div class="content"><p class="kicker">Kairos · Two skies in conversation</p><h1 class="names">${a}<br>&amp;<br>${b}</h1><p class="relation">${escapeHtml(CONNECTION_RELATIONSHIP_LABELS[artifact.input.relationshipType])}</p><div class="chart">${renderConnectionMapSvg(artifact)}</div><ol class="legend">${signatureItems}</ol><p class="key">Terracotta orbit: ${a} · Lavender orbit: ${b} · Lines 01–03: ranked relationship signatures</p><p class="method">Tropical zodiac · Whole Sign houses when time is known · Short-arc composite midpoints · ${escapeHtml(artifact.calculation.precision.note)}</p></div></main></body></html>`;
}

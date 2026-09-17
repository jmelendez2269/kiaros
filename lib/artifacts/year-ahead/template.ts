import {
  assertYearAheadReportDeliverable,
} from "./generator.ts";
import type {
  YearAheadArtifact,
  YearAheadLifeNarrative,
  YearAheadPaperSize,
  YearAheadPlacement,
  YearAheadQuarterNarrative,
  YearAheadWindowNarrative,
} from "./contract.ts";

const PAPER: Record<YearAheadPaperSize, readonly [number, number]> = {
  letter: [215.9, 279.4],
  a4: [210, 297],
};

function escapeHtml(value: string): string {
  return value.replace(/[&<>'"]/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;",
  })[character] ?? character);
}

function dateLabel(value: string): string {
  return new Intl.DateTimeFormat("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" })
    .format(new Date(`${value}T12:00:00Z`));
}

function shortDate(value: string): string {
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "UTC" })
    .format(new Date(`${value}T12:00:00Z`));
}

function page(content: string, className = ""): string {
  return `<section class="page ${className}">${content}<footer><span>KAIROS · YEAR AHEAD</span><span class="star">✦</span></footer></section>`;
}

function starField(): string {
  const stars = [
    [8, 13, 1.1], [17, 7, .7], [25, 17, .55], [35, 9, .9], [48, 15, .5], [58, 6, .8],
    [67, 18, .65], [77, 9, 1], [88, 16, .6], [94, 6, .45], [13, 34, .5], [84, 35, .55],
  ];
  return `<svg aria-hidden="true" class="stars" viewBox="0 0 100 45">${stars.map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}"/>`).join("")}</svg>`;
}

function placementTable(title: string, placements: readonly YearAheadPlacement[]): string {
  return `<div class="table-card"><h3>${escapeHtml(title)}</h3><table><thead><tr><th>Planet</th><th>Position</th><th>House</th></tr></thead><tbody>${placements.map((item) => `<tr><th>${item.planet}</th><td>${item.degree.toFixed(1)}° ${item.sign}</td><td>${item.house}</td></tr>`).join("")}</tbody></table></div>`;
}

function anchors(items: readonly string[]): string {
  return `<ol class="anchors">${items.map((item, index) => `<li><span>${String(index + 1).padStart(2, "0")}</span><p>${escapeHtml(item)}</p></li>`).join("")}</ol>`;
}

function chapterPage(eyebrow: string, block: { title: string; summary: string; paragraphs: readonly string[]; anchors: readonly string[] }): string {
  return page(`<header class="chapter-head"><p class="eyebrow">${escapeHtml(eyebrow)}</p><h2>${escapeHtml(block.title)}</h2><p class="summary">${escapeHtml(block.summary)}</p></header><div class="prose">${block.paragraphs.map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`).join("")}</div><h3 class="practice-title">Ways to work with this</h3>${anchors(block.anchors)}`, "chapter");
}

function windowPage(block: YearAheadWindowNarrative, artifact: YearAheadArtifact, index: number): string {
  const window = artifact.calculation.activationWindows[index];
  return page(`<div class="rank">0${window.rank}</div><header class="chapter-head window-head"><p class="eyebrow">Activation window · ${escapeHtml(window.lifeArea)}</p><h2>${escapeHtml(block.title)}</h2><p class="date-band">${shortDate(window.startDate)} — ${shortDate(window.endDate)} <strong>Closest ${shortDate(window.peakDate)}</strong></p><p class="summary">${escapeHtml(block.summary)}</p></header><div class="signal"><strong>${escapeHtml(window.title)}</strong><span>${window.peakOrb.toFixed(2)}° at closest approach · House ${window.natalHouse}${window.profectionRelevant ? " · profection-linked" : ""}</span></div><div class="prose">${block.paragraphs.map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`).join("")}</div><blockquote>${escapeHtml(block.invitation)}</blockquote>${anchors(block.anchors)}`, "chapter window");
}

function quarterPage(block: YearAheadQuarterNarrative, artifact: YearAheadArtifact): string {
  const quarter = artifact.calculation.quarters[block.quarter - 1];
  const windowLabels = quarter.activationIds.length
    ? quarter.activationIds.map((id) => artifact.calculation.activationWindows.find((window) => window.id === id)?.title).filter(Boolean).join(" · ")
    : "No Top 3 peak falls here; this is an integration quarter.";
  return page(`<header class="chapter-head quarter-head"><p class="eyebrow">Quarter ${block.quarter} · ${shortDate(quarter.startDate)} — ${shortDate(quarter.endDate)}</p><h2>${escapeHtml(block.title)}</h2><p class="summary">${escapeHtml(block.summary)}</p></header><div class="quarter-orbit" aria-label="Selected activation windows in this quarter"><span>Timing signal</span><strong>${escapeHtml(windowLabels)}</strong></div><div class="prose single"><p>${escapeHtml(block.paragraph)}</p></div><h3 class="practice-title">Quarter practices</h3>${anchors(block.practices)}`, "chapter quarter");
}

export function renderYearAheadReportHtml(artifact: YearAheadArtifact, paperSize: YearAheadPaperSize): string {
  assertYearAheadReportDeliverable(artifact);
  const narrative = artifact.narrative!;
  const [width, height] = PAPER[paperSize];
  const profection = artifact.calculation.profection;
  const name = artifact.displayName ?? "Your";
  const windowPages = narrative.activationWindows.map((block, index) => windowPage(block, artifact, index)).join("");
  const lifePages = narrative.lifeAreas.map((block: YearAheadLifeNarrative) => chapterPage(block.id.replace(/_/g, " "), block)).join("");
  const quarterPages = narrative.quarters.map((block) => quarterPage(block, artifact)).join("");
  const topThree = artifact.calculation.activationWindows.map((window) => `<li><span>0${window.rank}</span><div><strong>${escapeHtml(window.title)}</strong><p>${shortDate(window.startDate)}–${shortDate(window.endDate)} · closest ${shortDate(window.peakDate)}</p></div></li>`).join("");
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${escapeHtml(`${name} Year Ahead`)}</title><style>
    @page{size:${width}mm ${height}mm;margin:0}*{box-sizing:border-box}html,body{margin:0;padding:0;background:#151020;color:#211b2c;font-family:Georgia,'Times New Roman',serif}body{print-color-adjust:exact;-webkit-print-color-adjust:exact}.page{position:relative;width:${width}mm;height:${height}mm;overflow:hidden;background:#f5efe4;padding:17mm 17mm 15mm;page-break-after:always}.page:last-child{page-break-after:auto}.page:before{content:"";position:absolute;inset:6mm;border:1px solid #b89b72;pointer-events:none}.page footer{position:absolute;left:17mm;right:17mm;bottom:8.5mm;display:flex;justify-content:space-between;color:#745f54;font:700 7pt Arial,sans-serif;letter-spacing:.16em}.star{color:#a45f3b}.cover{background:radial-gradient(circle at 50% 22%,#4d396c 0,#261b3c 38%,#120e1c 82%);color:#fff9ed;padding:0}.cover:before{border-color:#b99562}.stars{position:absolute;inset:0;width:100%;height:45%;fill:#f4cf8b;opacity:.8}.cover-inner{position:absolute;inset:18mm;display:flex;flex-direction:column;justify-content:center;text-align:center;border:1px solid #a98255;padding:14mm}.seal{width:42mm;height:42mm;margin:0 auto 12mm;border:1px solid #c49a63;border-radius:50%;display:grid;place-items:center;font-size:25mm;color:#e5bd7b;box-shadow:0 0 28mm #7e55b355}.kicker,.eyebrow{font:800 8pt Arial,sans-serif;letter-spacing:.24em;text-transform:uppercase;color:#9e5d3c}.cover .kicker{color:#e8c38d}.cover h1{font-size:39pt;line-height:1.02;margin:0}.cover h2{font-size:17pt;font-style:italic;font-weight:400;color:#e8d9ef;margin:4mm 0 9mm}.cover .name{font:700 11pt Arial,sans-serif;letter-spacing:.16em;text-transform:uppercase}.cover .span{margin-top:3mm;color:#d7c7df;font:10pt Arial,sans-serif}.chapter-head{border-left:2.2mm solid #a6603c;background:#302345;color:#fff9ef;padding:7mm 8mm;margin-bottom:7mm}.chapter-head h2{font-size:27pt;line-height:1.08;margin:2.5mm 0}.chapter-head .eyebrow{color:#efc68e}.summary{font-size:12pt;line-height:1.55;font-weight:700;margin:3mm 0 0}.prose{font-size:10.7pt;line-height:1.62;columns:2;column-gap:9mm}.prose p{margin:0 0 5mm}.prose.single{columns:1;font-size:11.5pt;line-height:1.7}.practice-title{font:800 8pt Arial,sans-serif;letter-spacing:.18em;text-transform:uppercase;color:#664392;margin:7mm 0 3mm}.anchors{list-style:none;padding:0;margin:0;display:grid;gap:2.5mm}.anchors li{display:grid;grid-template-columns:10mm 1fr;align-items:start;border-top:1px solid #c5b19a;padding-top:2.5mm}.anchors span{font:800 8pt Arial,sans-serif;color:#a45f3b}.anchors p{margin:0;font:9.3pt/1.45 Arial,sans-serif}.rank{position:absolute;right:17mm;top:12mm;font:700 42pt Arial,sans-serif;color:#a6603c22}.date-band{display:flex;justify-content:space-between;gap:4mm;background:#f0d7b4;color:#302345;padding:3mm 4mm;margin:4mm -2mm 0;font:700 9pt Arial,sans-serif}.signal,.quarter-orbit{display:flex;justify-content:space-between;align-items:center;gap:5mm;border:1px solid #b89b72;background:#ece1d3;padding:4mm 5mm;margin-bottom:6mm;font:9pt Arial,sans-serif}.signal span{color:#655a62;text-align:right}.window blockquote{margin:6mm 0;padding:4mm 5mm;border-left:1.5mm solid #694e91;background:#e7dfee;font-size:11pt;font-style:italic;line-height:1.5}.intro h2,.reference h2,.reflection h2{font-size:30pt;color:#302345;margin:4mm 0 6mm}.intro .letter{font-size:12pt;line-height:1.7;max-width:72ch}.intro .letter p:first-child:first-letter{float:left;font-size:42pt;line-height:.8;color:#a45f3b;padding-right:2mm}.theme-card{margin-top:8mm;background:#302345;color:#fff;padding:7mm}.theme-card strong{display:block;font-size:22pt}.theme-card span{display:block;margin-top:2mm;color:#e8d9ef}.top-three{list-style:none;padding:0;margin:8mm 0;display:grid;gap:3mm}.top-three li{display:grid;grid-template-columns:13mm 1fr;gap:4mm;border:1px solid #b89b72;background:#ece1d3;padding:4mm}.top-three span{font:800 10pt Arial;color:#a45f3b}.top-three strong{font-size:12pt}.top-three p{margin:1mm 0 0;font:9pt Arial;color:#62565d}.tables{display:grid;grid-template-columns:1fr 1fr;gap:5mm}.table-card{border:1px solid #b89b72;padding:4mm}.table-card h3{font-size:14pt;margin:0 0 3mm;color:#4c3769}.table-card table{width:100%;border-collapse:collapse;font:8pt Arial,sans-serif}.table-card th,.table-card td{padding:1.6mm;border-bottom:1px solid #d7c9b8;text-align:left}.method{margin-top:6mm;padding:5mm;background:#302345;color:#fff;font:9pt/1.55 Arial,sans-serif}.quarter-orbit{display:grid;grid-template-columns:28mm 1fr}.quarter-orbit span{font-weight:800;text-transform:uppercase;letter-spacing:.12em;color:#a45f3b}.reflection ol{columns:2;column-gap:10mm;padding-left:7mm;font-size:11pt;line-height:1.55}.reflection li{break-inside:avoid;margin:0 0 5mm;padding-left:2mm}.scope{margin-top:7mm;border-top:1px solid #b89b72;padding-top:5mm;font:8.5pt/1.5 Arial,sans-serif;color:#5c5159}
  </style></head><body>
  ${page(`${starField()}<div class="cover-inner"><div class="seal">☉</div><p class="kicker">Kairos · Birthday-to-birthday astrology</p><h1>Year Ahead</h1><h2>Solar Return & Transit Forecast</h2><p class="name">${escapeHtml(name)}</p><p class="span">${dateLabel(artifact.calculation.forecastStart)} — ${dateLabel(artifact.calculation.forecastEnd)}</p></div>`, "cover")}
  ${page(`<div class="intro"><p class="eyebrow">A letter for the threshold</p><h2>Meeting the year with agency</h2><div class="letter">${narrative.openingLetter.map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`).join("")}</div><div class="theme-card"><span>Your profection word</span><strong>${escapeHtml(profection.theme)}</strong><span>${profection.house}${profection.house === 1 ? "st" : profection.house === 2 ? "nd" : profection.house === 3 ? "rd" : "th"} house in ${profection.sign} · ${profection.lord} as Lord of the Year</span></div></div>`, "intro")}
  ${page(`<div class="reference"><p class="eyebrow">The astronomical foundation</p><h2>Your year at a glance</h2><div class="tables">${placementTable("Natal reference", artifact.calculation.natalPlacements)}${placementTable("Solar-return chart", artifact.calculation.solarReturnPlacements)}</div><div class="method"><strong>Solar return</strong> ${escapeHtml(artifact.calculation.solarReturnExactUtc)} UTC · cast for ${escapeHtml(artifact.input.returnPlace.city)}, ${escapeHtml(artifact.input.returnPlace.country)}<br><strong>Angles</strong> ${artifact.calculation.solarReturnAngles.ascendantSign} Ascendant · ${artifact.calculation.solarReturnAngles.midheavenSign} Midheaven<br><strong>Method</strong> Tropical zodiac · Whole Sign houses · astronomia 4.2.0</div></div>`, "reference")}
  ${chapterPage("The annual threshold", narrative.annualTheme)}
  ${page(`<p class="eyebrow">The timing hierarchy</p><h2 style="font-size:31pt;color:#302345;margin:4mm 0">Your Top 3 activation windows</h2><p style="font-size:12pt;line-height:1.65;max-width:70ch">These are the three strongest distinct patterns selected from the full birthday-to-birthday transit scan. Read the whole range as a season of emphasis; the closest date marks greatest geometric precision, not a promised event.</p><ol class="top-three">${topThree}</ol><div class="method">Ranking weighs planetary duration, aspect geometry, the natal point contacted, exactness, and direct relevance to the profected house or Lord of the Year. Color is decorative; rank, dates, and labels carry the meaning.</div>`)}
  ${windowPages}${lifePages}${quarterPages}
  ${page(`<div class="reflection"><p class="eyebrow">Integration</p><h2>Questions to carry through the year</h2><ol>${narrative.reflectionPrompts.map((prompt) => `<li>${escapeHtml(prompt)}</li>`).join("")}</ol><p class="scope">${escapeHtml(artifact.scopeNote)}<br><br>This report was composed with AI assistance from a closed set of calculated chart facts and requires human review before delivery. Birth and birthday-location accuracy materially affect the calculation.</p></div>`, "reflection")}
  </body></html>`;
  return html;
}

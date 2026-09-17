import type { StarOriginArtifact, StarOriginPaperSize } from "./contract.ts";
import { resonanceRoleLabel, topThreeResonances } from "./profile.ts";

const PAPER: Record<StarOriginPaperSize, { name: string; width: number; height: number }> = {
  letter: { name: "Letter", width: 215.9, height: 279.4 },
  a4: { name: "A4", width: 210, height: 297 },
};

function escapeHtml(value: string): string {
  return value
    .split("&").join("&amp;")
    .split("<").join("&lt;")
    .split(">").join("&gt;")
    .split('"').join("&quot;")
    .split("'").join("&#039;");
}

function resultLabel(artifact: StarOriginArtifact): string {
  if (artifact.result.kind === "spread") return "A field of resonances";
  if (artifact.result.kind === "single") return artifact.result.primary.displayName;
  return `${artifact.result.primary.displayName} and ${artifact.result.secondary.displayName}`;
}

function renderCoverProfile(artifact: StarOriginArtifact): string {
  const entries = topThreeResonances(artifact.result, artifact.map);
  if (entries.length === 0) {
    return '<p class="cover-line">' + escapeHtml(resultLabel(artifact)) + "</p>";
  }
  const items = entries
    .map(
      (entry) =>
        '<li class="cover-profile-row' +
        (entry.role === "supporting_resonance" ? "" : " cover-profile-row--primary") +
        '"><span class="cover-rank">0' +
        entry.rank +
        '</span><span class="cover-profile-copy"><strong>' +
        escapeHtml(entry.row.displayName) +
        '</strong><span>' +
        escapeHtml(resonanceRoleLabel(entry.role)) +
        " · " +
        escapeHtml(entry.row.nearestStar) +
        " to " +
        escapeHtml(entry.row.nearestMarker.split("_").join(" ")) +
        " · " +
        entry.row.orb.toFixed(2) +
        "°</span></span></li>",
    )
    .join("");
  return (
    '<div class="cover-profile"><p class="cover-profile-label">Your top three</p>' +
    '<ol aria-label="Your top three star-family resonances">' +
    items +
    "</ol></div>"
  );
}

interface NarrativePage {
  section: StarOriginArtifact["sections"][number];
  sectionIndex: number;
  continuationIndex: number;
  paragraphs: readonly { text: string; sourceIndex: number }[];
}

function paragraphCost(
  section: StarOriginArtifact["sections"][number],
  paragraph: string,
): number {
  const textLines = Math.max(1, Math.ceil(paragraph.trim().length / 78));
  const isSignal =
    section.id === "your_strongest_markers" &&
    paragraph.includes(" — ") &&
    paragraph.length < 220;
  const isFamily =
    section.id === "the_twelve_families" &&
    paragraph.includes(" — ") &&
    paragraph.length < 260;
  const isProfileDivider =
    section.id === "the_twelve_families" &&
    (paragraph === "How the three work together" || paragraph === "The wider field");
  return textLines + (isSignal || isProfileDivider ? 1.8 : isFamily ? 0.7 : 1.1);
}

function paginateSection(
  section: StarOriginArtifact["sections"][number],
  sectionIndex: number,
  paperSize: StarOriginPaperSize,
): NarrativePage[] {
  const firstPageBudget = paperSize === "letter" ? 31 : 34;
  const continuationBudget = paperSize === "letter" ? 38 : 42;
  const pages: NarrativePage[] = [];
  let current: Array<{ text: string; sourceIndex: number }> = [];
  let used = 0;
  let budget = firstPageBudget;

  section.paragraphs.forEach((paragraph, sourceIndex) => {
    const cost = paragraphCost(section, paragraph);
    if (current.length > 0 && used + cost > budget) {
      pages.push({
        section,
        sectionIndex,
        continuationIndex: pages.length,
        paragraphs: current,
      });
      current = [];
      used = 0;
      budget = continuationBudget;
    }
    current.push({ text: paragraph, sourceIndex });
    used += cost;
  });

  if (current.length > 0) {
    pages.push({
      section,
      sectionIndex,
      continuationIndex: pages.length,
      paragraphs: current,
    });
  }
  return pages;
}

function emphasizedParagraph(
  section: StarOriginArtifact["sections"][number],
  paragraph: string,
  sourceIndex: number,
): string {
  const dashIndex = paragraph.indexOf(" — ");
  if (
    dashIndex > 0 &&
    (section.id === "your_strongest_markers" ||
      (section.id === "the_twelve_families" && paragraph.length < 260))
  ) {
    const lead = escapeHtml(paragraph.slice(0, dashIndex));
    let detail = escapeHtml(paragraph.slice(dashIndex));
    detail = detail.split("This is your line.").join("<strong>This is your line.</strong>");
    return "<strong>" + lead + "</strong>" + detail;
  }

  if (sourceIndex === 0) {
    const sentenceEnd = paragraph.indexOf(". ");
    if (sentenceEnd > 0 && sentenceEnd < 180) {
      return (
        "<strong>" +
        escapeHtml(paragraph.slice(0, sentenceEnd + 1)) +
        "</strong>" +
        escapeHtml(paragraph.slice(sentenceEnd + 1))
      );
    }
    if (paragraph.length < 180) return "<strong>" + escapeHtml(paragraph) + "</strong>";
  }

  if (
    section.id === "where_you_resonate" &&
    (paragraph.startsWith("On the day you were born") || paragraph.startsWith("The war ended"))
  ) {
    return "<strong>" + escapeHtml(paragraph) + "</strong>";
  }
  return escapeHtml(paragraph);
}

function paragraphClass(
  section: StarOriginArtifact["sections"][number],
  paragraph: string,
): string {
  if (
    section.id === "your_strongest_markers" &&
    paragraph.includes(" — ") &&
    paragraph.length < 220
  ) {
    return "signal-line";
  }
  if (
    section.id === "the_twelve_families" &&
    /^[1-3]\\. /.test(paragraph)
  ) {
    return "signal-line profile-rank-line";
  }
  if (
    section.id === "the_twelve_families" &&
    (paragraph === "How the three work together" || paragraph === "The wider field")
  ) {
    return "section-break";
  }
  if (
    section.id === "the_twelve_families" &&
    paragraph.includes(" — ") &&
    paragraph.length < 260
  ) {
    return "family-line";
  }
  return "";
}

function renderSection(
  section: StarOriginArtifact["sections"][number],
  index: number,
): string {
  return `<section class="report-page narrative-page" aria-labelledby="section-${index}">
    <header class="page-header">
      <p class="brand">KAIROS</p>
      <p class="folio">${String(index + 2).padStart(2, "0")}</p>
    </header>
    <div class="section-title">
      <p class="kicker">Star Origin</p>
      <h2 id="section-${index}">${escapeHtml(section.title)}</h2>
      ${section.subtitle ? `<p class="subtitle">${escapeHtml(section.subtitle)}</p>` : ""}
    </div>
    <div class="prose">
      ${section.paragraphs.map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`).join("")}
    </div>
  </section>`;
}

function renderNarrativePage(page: NarrativePage, pageNumber: number): string {
  const { section, sectionIndex, continuationIndex, paragraphs } = page;
  const headingId = "section-" + sectionIndex + "-page-" + continuationIndex;
  const continued = continuationIndex > 0;
  const subtitle =
    !continued && section.subtitle
      ? '<p class="subtitle">' + escapeHtml(section.subtitle) + "</p>"
      : "";
  const body = paragraphs
    .map(
      ({ text, sourceIndex }) =>
        '<p class="' +
        paragraphClass(section, text) +
        '">' +
        emphasizedParagraph(section, text, sourceIndex) +
        "</p>",
    )
    .join("");

  return [
    '<section class="report-page narrative-page" aria-labelledby="' + headingId + '">',
    '<header class="page-header"><p class="brand">KAIROS</p><p class="folio">' +
      String(pageNumber).padStart(2, "0") +
      "</p></header>",
    '<div class="section-title' + (continued ? " section-title--continued" : "") + '">',
    '<p class="kicker">' + (continued ? "Continued" : "Star Origin") + "</p>",
    '<h2 id="' + headingId + '">' + escapeHtml(section.title) + (continued ? " — continued" : "") + "</h2>",
    subtitle,
    "</div>",
    '<div class="prose">' + body + "</div>",
    "</section>",
  ].join("");
}

function renderWorkings(artifact: StarOriginArtifact, pageNumber: number): string {
  const rows = artifact.workings
    .map(
      (row) => `<tr>
        <th scope="row">${escapeHtml(row.star)}</th>
        <td>${escapeHtml(row.marker)}</td>
        <td>${escapeHtml(row.starPosition)}</td>
        <td>${escapeHtml(row.markerPosition)}</td>
        <td>${escapeHtml(row.separation)}</td>
        <td>${escapeHtml(row.tag)}</td>
      </tr>`,
    )
    .join("");

  return `<section class="report-page workings-page" aria-labelledby="workings-title">
    <header class="page-header">
      <p class="brand">KAIROS</p>
      <p class="folio">${String(pageNumber).padStart(2, "0")}</p>
    </header>
    <div class="section-title">
      <p class="kicker">Calculation record</p>
      <h2 id="workings-title">The workings</h2>
      <p class="subtitle">The fixed stars and chart points used in this report.</p>
    </div>
    <table>
      <caption class="sr-only">Fixed-star contacts used in the Star Origin report</caption>
      <thead><tr><th scope="col">Star</th><th scope="col">Met</th><th scope="col">Star position</th><th scope="col">Chart position</th><th scope="col">Apart</th><th scope="col">Role</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <aside class="method-note">
      <strong>Method.</strong> Tropical zodiac · Whole Sign houses · ${escapeHtml(artifact.provenance.ephemerisProvider)} ${escapeHtml(artifact.provenance.ephemerisVersion)} · baseline ${escapeHtml(artifact.provenance.baselineVersion)}.
    </aside>
    <footer class="disclosure">
      <p>This is a reflective fixed-star astrology report, not medical, legal, financial, or predictive advice.</p>
      <p>${escapeHtml(artifact.provenance.chartFingerprint)}</p>
    </footer>
  </section>`;
}

function styles(paperSize: StarOriginPaperSize): string {
  const paper = PAPER[paperSize];
  return `
    :root { --paper:#f3ede1; --paper-deep:#e8dece; --ink:#161720; --muted:#55505e; --violet:#4f367f; --copper:#8c5633; --line:#b8aa99; }
    @page { size:${paper.name}; margin:0; }
    * { box-sizing:border-box; }
    html,body { margin:0; padding:0; background:#d1cbc0; color:var(--ink); }
    body { font-family:"Aptos","Segoe UI",Arial,sans-serif; font-size:10pt; line-height:1.5; }
    .report-page { width:${paper.width}mm; height:${paper.height}mm; margin:0 auto; overflow:hidden; padding:14mm 16mm 15mm; background:var(--paper); position:relative; break-after:page; page-break-after:always; break-inside:avoid; page-break-inside:avoid; print-color-adjust:exact; -webkit-print-color-adjust:exact; }
    .report-page:last-child { break-after:auto; page-break-after:auto; }
    .report-page::before { content:""; position:absolute; inset:0 0 auto; height:4mm; background:linear-gradient(90deg,var(--violet),var(--copper)); }
    .page-header { display:flex; align-items:center; justify-content:space-between; border-bottom:.55mm solid var(--violet); padding:1mm 0 3.5mm; }
    .brand,.folio,.kicker { margin:0; font-size:8pt; font-weight:800; letter-spacing:.22em; text-transform:uppercase; }
    .brand { color:var(--violet); } .folio { color:var(--ink); }
    .cover-page { display:flex; flex-direction:column; justify-content:space-between; }
    .cover-content { margin:auto 0; max-width:145mm; }
    h1,h2 { font-family:"Iowan Old Style",Georgia,serif; font-weight:700; letter-spacing:-.025em; }
    h1 { margin:5mm 0 0; font-size:40pt; line-height:1; }
    h2 { margin:2mm 0 0; font-size:28pt; line-height:1.04; }
    .cover-line { margin:5mm 0 0; color:var(--copper); font:600 19pt/1.25 "Iowan Old Style",Georgia,serif; }
    .cover-profile { margin-top:9mm; max-width:150mm; }
    .cover-profile-label { margin:0 0 3mm; color:var(--copper); font-size:8pt; font-weight:800; letter-spacing:.2em; text-transform:uppercase; }
    .cover-profile ol { display:grid; gap:2.5mm; margin:0; padding:0; list-style:none; }
    .cover-profile-row { display:grid; grid-template-columns:11mm 1fr; align-items:center; border:.3mm solid var(--line); background:#ece2d3; padding:3.2mm 4mm; }
    .cover-profile-row--primary { border-color:var(--violet); border-left:1.6mm solid var(--copper); background:#ded2e8; }
    .cover-rank { color:var(--copper); font-size:8pt; font-weight:800; letter-spacing:.12em; }
    .cover-profile-copy { display:grid; gap:.6mm; }
    .cover-profile-copy strong { color:var(--ink); font:700 15pt/1.1 "Iowan Old Style",Georgia,serif; }
    .cover-profile-copy span { color:#4b4551; font-size:8.2pt; font-weight:650; text-transform:capitalize; }
    .cover-name { margin:12mm 0 0; font-size:12pt; font-weight:700; }
    .birth-label,.subtitle { color:var(--muted); }
    .birth-label { margin:2mm 0 0; font-size:9.5pt; }
    .cover-note { max-width:85ch; border-top:.3mm solid var(--line); padding-top:5mm; color:var(--muted); font-size:9pt; }
    .cover-content .kicker { color:var(--violet); }
    .section-title { margin:8mm 0 6mm; max-width:100%; border-left:2mm solid var(--copper); background:linear-gradient(135deg,#2e2244,#4f367f); padding:6mm 7mm 6.5mm; color:#fffaf0; }
    .section-title .kicker { color:#f0bb86; }
    .section-title h2 { color:#fffaf0; }
    .section-title--continued { margin-bottom:5mm; padding:4mm 6mm 4.5mm; }
    .section-title--continued h2 { font-size:22pt; }
    .subtitle { margin:2mm 0 0; color:#eadff2; font:600 italic 12pt/1.35 "Iowan Old Style",Georgia,serif; }
    .prose { max-width:72ch; }
    .prose p { margin:0 0 3.6mm; orphans:3; widows:3; }
    .prose strong { color:#38235e; font-weight:750; }
    .signal-line { margin:5mm 0 3.5mm !important; border-left:1.2mm solid var(--copper); background:var(--paper-deep); padding:3.2mm 4mm; font-size:10.3pt; line-height:1.4; }
    .profile-rank-line { border-left-width:1.8mm; background:#ded2e8; }
    .profile-rank-line strong { color:#2e2244; font-size:11pt; }
    .section-break { margin:7mm 0 3.5mm !important; border-bottom:.6mm solid var(--copper); padding-bottom:2mm; color:#2e2244; font:700 16pt/1.2 "Iowan Old Style",Georgia,serif; }
    .family-line { margin-bottom:2.7mm !important; border-bottom:.22mm solid #cbbdaa; padding-bottom:2.5mm; }
    .family-line strong { color:var(--violet); }
    .narrative-page { break-inside:avoid; page-break-inside:avoid; }
    table { width:100%; margin-top:8mm; border-collapse:collapse; font-size:8.5pt; line-height:1.35; font-variant-numeric:tabular-nums; }
    th,td { border-bottom:.25mm solid var(--line); padding:2.2mm 1.4mm; text-align:left; vertical-align:top; }
    thead { background:#2e2244; color:#fffaf0; }
    thead th { border-bottom-color:#2e2244; color:#fffaf0; font-size:7pt; font-weight:800; letter-spacing:.1em; text-transform:uppercase; }
    tbody th { color:var(--violet); font-weight:800; }
    .method-note { margin-top:8mm; border-left:1.5mm solid var(--copper); background:var(--paper-deep); padding:4mm 5mm; color:#332a24; }
    .method-note strong { color:var(--violet); font-weight:800; }
    .disclosure { position:absolute; left:17mm; right:17mm; bottom:10mm; border-top:.25mm solid var(--line); padding-top:3mm; color:var(--muted); font-size:7pt; overflow-wrap:anywhere; }
    .disclosure p { margin:0 0 1mm; }
    .sr-only { position:absolute; width:1px; height:1px; padding:0; margin:-1px; overflow:hidden; clip:rect(0,0,0,0); white-space:nowrap; border:0; }
    @media screen { .report-page { margin:10mm auto; box-shadow:0 18px 60px rgba(0,0,0,.2); } }
    @media print { html,body { background:transparent; } .report-page { margin:0; } }
  `;
}

export function renderStarOriginHtml(
  artifact: StarOriginArtifact,
  paperSize: StarOriginPaperSize,
): string {
  const birth = artifact.normalizedBirth;
  const birthLabel = `${birth.date} · ${birth.timeUnknown ? "birth time unknown" : birth.time} · ${birth.city}, ${birth.country}`;
  const reviewDisclosure = artifact.synthesisProvenance
    ? `The personalized lifetime section was AI-assisted with ${artifact.synthesisProvenance.model} and approved by ${artifact.review.reviewer ?? "a Kairos reviewer"}.`
    : "The interpretive text was composed from the versioned Kairos Star Origin library.";
  const narrativePages = artifact.sections.flatMap((section, sectionIndex) =>
    paginateSection(section, sectionIndex, paperSize),
  );
  const narrative = narrativePages
    .map((page, index) => renderNarrativePage(page, index + 2))
    .join("");
  const workingsPageNumber = narrativePages.length + 2;

  return `<!doctype html>
  <html lang="en"><head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <meta name="robots" content="noindex,nofollow,noarchive" />
    <meta name="generator" content="Kairos ${escapeHtml(artifact.templateVersion)}" />
    <title>${escapeHtml(`Star Origin · ${artifact.displayName ?? "Private report"}`)}</title>
    <style>${styles(paperSize)}</style>
  </head><body><main aria-label="Star Origin report">
    <section class="report-page cover-page" aria-labelledby="report-title">
      <header class="page-header"><p class="brand">KAIROS</p><p class="folio">01</p></header>
      <div class="cover-content">
        <p class="kicker">A fixed-star report</p>
        <h1 id="report-title">Star Origin</h1>
        ${renderCoverProfile(artifact)}
        ${artifact.displayName ? `<p class="cover-name">Prepared for ${escapeHtml(artifact.displayName)}</p>` : ""}
        <p class="birth-label">${escapeHtml(birthLabel)}</p>
      </div>
      <p class="cover-note">${escapeHtml(reviewDisclosure)}</p>
    </section>
    ${narrative}
    ${renderWorkings(artifact, workingsPageNumber)}
  </main></body></html>`;
}

import { mkdir, readFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import sharp from "sharp";

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(SCRIPT_DIR, "..");
const SOURCE_DIR = join(ROOT, "docs", "assets", "etsy", "anchor-print");
const OUTPUT_DIR = join(ROOT, "public", "marketing", "etsy", "anchor-print");
const WIDTH = 3000;
const HEIGHT = 2250;

const COLORS = {
  ink: "#17141e",
  inkSoft: "#383342",
  cream: "#f5efe3",
  creamBright: "#fffaf0",
  violet: "#5b35b5",
  violetDark: "#34206f",
  violetPale: "#e9e0f6",
  blue: "#2e6f8f",
  bluePale: "#d9e8ee",
  brass: "#b7842c",
  line: "#cbbfd5",
  white: "#ffffff",
};

function dataUri(buffer) {
  return `data:image/png;base64,${buffer.toString("base64")}`;
}

function esc(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function lines(values, x, y, options = {}) {
  const {
    size = 64,
    lineHeight = Math.round(size * 1.2),
    fill = COLORS.ink,
    family = "Arial, sans-serif",
    weight = 400,
    anchor = "start",
    letterSpacing = 0,
    className = "",
  } = options;
  const tspans = values
    .map((value, index) => `<tspan x="${x}" dy="${index === 0 ? 0 : lineHeight}">${esc(value)}</tspan>`)
    .join("");
  return `<text x="${x}" y="${y}" fill="${fill}" font-family="${family}" font-size="${size}" font-weight="${weight}" text-anchor="${anchor}" letter-spacing="${letterSpacing}" class="${className}">${tspans}</text>`;
}

function eyebrow(value, x, y, dark = false) {
  return `<text x="${x}" y="${y}" fill="${dark ? COLORS.violetPale : COLORS.violet}" font-family="Arial, sans-serif" font-size="34" font-weight="700" letter-spacing="8">${esc(value.toUpperCase())}</text>`;
}

function footer(index, dark = false) {
  const fill = dark ? "#cfc5df" : "#655d6d";
  return `
    <text x="180" y="2155" fill="${fill}" font-family="Arial, sans-serif" font-size="28" font-weight="700" letter-spacing="5">KAIROS · NATAL REPORT</text>
    <text x="2820" y="2155" fill="${fill}" font-family="Arial, sans-serif" font-size="28" font-weight="700" text-anchor="end" letter-spacing="4">${String(index).padStart(2, "0")} / 08</text>`;
}

function defs() {
  return `<defs>
    <filter id="paperShadow" x="-30%" y="-30%" width="170%" height="180%">
      <feDropShadow dx="0" dy="30" stdDeviation="30" flood-color="#09070d" flood-opacity="0.50"/>
    </filter>
    <filter id="softShadow" x="-30%" y="-30%" width="170%" height="180%">
      <feDropShadow dx="0" dy="16" stdDeviation="18" flood-color="#241b30" flood-opacity="0.18"/>
    </filter>
    <linearGradient id="coverShade" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#100d16" stop-opacity="0.94"/>
      <stop offset="0.40" stop-color="#15111d" stop-opacity="0.78"/>
      <stop offset="0.72" stop-color="#15111d" stop-opacity="0.12"/>
      <stop offset="1" stop-color="#15111d" stop-opacity="0"/>
    </linearGradient>
    <linearGradient id="night" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#16121e"/>
      <stop offset="0.62" stop-color="#241845"/>
      <stop offset="1" stop-color="#172f3c"/>
    </linearGradient>
    <linearGradient id="creamWash" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#fffaf0"/>
      <stop offset="1" stop-color="#eee5d9"/>
    </linearGradient>
  </defs>`;
}

function svg(body, background = COLORS.cream) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}">
    ${defs()}
    <rect width="${WIDTH}" height="${HEIGHT}" fill="${background}"/>
    ${body}
  </svg>`;
}

function pill(x, y, width, label, dark = false) {
  return `<g>
    <rect x="${x}" y="${y}" width="${width}" height="92" rx="46" fill="${dark ? "#081126dc" : COLORS.white}" stroke="${dark ? COLORS.brass : COLORS.line}" stroke-width="3"/>
    <text x="${x + width / 2}" y="${y + 59}" fill="${dark ? COLORS.white : COLORS.ink}" font-family="Arial, sans-serif" font-size="34" font-weight="700" text-anchor="middle">${esc(label)}</text>
  </g>`;
}

function checkItem(x, y, title, detail, dark = false) {
  const titleFill = dark ? COLORS.white : COLORS.ink;
  const detailFill = dark ? "#d7d0e1" : COLORS.inkSoft;
  return `<g>
    <circle cx="${x + 35}" cy="${y + 35}" r="34" fill="${dark ? COLORS.brass : COLORS.violet}"/>
    <path d="M${x + 19} ${y + 35} l12 13 l23 -28" fill="none" stroke="${COLORS.white}" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/>
    <text x="${x + 100}" y="${y + 27}" fill="${titleFill}" font-family="Arial, sans-serif" font-size="49" font-weight="700">${esc(title)}</text>
    <text x="${x + 100}" y="${y + 86}" fill="${detailFill}" font-family="Arial, sans-serif" font-size="37">${esc(detail)}</text>
  </g>`;
}

function cover({ coverBackground, pageOne, pageTwo }) {
  return svg(`
    <image href="${coverBackground}" width="3000" height="2250" preserveAspectRatio="xMidYMid slice"/>
    <rect width="3000" height="2250" fill="url(#coverShade)"/>
    <text x="180" y="145" fill="${COLORS.brass}" font-family="Georgia, serif" font-size="42" font-weight="700" letter-spacing="13">KAIROS</text>
    <rect x="180" y="185" width="118" height="12" rx="6" fill="${COLORS.brass}"/>
    ${eyebrow("Personalized astrology PDF", 180, 295, true)}
    ${lines(["Your birth chart,", "made clear"], 180, 590, { size: 122, lineHeight: 145, fill: COLORS.white, family: "Georgia, serif", weight: 700 })}
    ${lines(["A 26-page natal report + product tour,", "created from your birth details."], 185, 1010, { size: 49, lineHeight: 70, fill: "#ded7e5" })}
    <g transform="translate(2050 235) rotate(4 390 505)" filter="url(#paperShadow)">
      <rect x="-20" y="-20" width="820" height="1050" rx="10" fill="#fffaf0"/>
      <image href="${pageTwo}" width="780" height="1010" preserveAspectRatio="xMidYMid meet"/>
    </g>
    <g transform="translate(1280 310) rotate(-3 465 600)" filter="url(#paperShadow)">
      <rect x="-22" y="-22" width="974" height="1244" rx="10" fill="#fffaf0"/>
      <image href="${pageOne}" width="930" height="1200" preserveAspectRatio="xMidYMid meet"/>
    </g>
    <rect x="1305" y="1712" width="570" height="82" rx="41" fill="#081126e8" stroke="${COLORS.brass}" stroke-width="3"/>
    <text x="1590" y="1765" fill="#ffffff" font-family="Arial, sans-serif" font-size="28" font-weight="700" text-anchor="middle" letter-spacing="4">FICTIONAL SAMPLE · AVERY</text>
    ${pill(180, 1760, 340, "US Letter + A4", true)}
    ${pill(540, 1760, 320, "Made to order", true)}
    ${pill(880, 1760, 280, "4 PDF files", true)}
    ${footer(1, true)}
  `, COLORS.ink);
}

function included({ atlasBackground, pageOne, pageTwo }) {
  return svg(`
    <image href="${atlasBackground}" width="3000" height="2250" preserveAspectRatio="xMidYMid slice"/>
    <rect width="3000" height="2250" fill="#050814" opacity="0.58"/>
    ${eyebrow("Exactly what is included", 180, 210, true)}
    ${lines(["A full reading. A lasting anchor."], 180, 385, { size: 106, fill: COLORS.white, family: "Georgia, serif", weight: 700 })}
    <g filter="url(#softShadow)">
      <rect x="180" y="505" width="1280" height="1280" rx="42" fill="#081126e8" stroke="${COLORS.brass}" stroke-width="3"/>
      <rect x="1540" y="505" width="1280" height="1280" rx="42" fill="#081126e8" stroke="${COLORS.brass}" stroke-width="3"/>
    </g>
    <rect x="240" y="570" width="552" height="716" fill="#ffffff" filter="url(#softShadow)"/>
    <image href="${pageOne}" x="250" y="580" width="532" height="696" preserveAspectRatio="xMidYMid meet"/>
    <text x="850" y="650" fill="${COLORS.brass}" font-family="Arial, sans-serif" font-size="34" font-weight="700" letter-spacing="5">26-PAGE REPORT + TOUR</text>
    ${lines(["Chart + pattern synthesis", "14 chapters + anchors", "6-screen Planner tour"], 850, 790, { size: 48, lineHeight: 165, fill: COLORS.white, weight: 700 })}
    <path d="M850 890 h440 M850 1055 h440" stroke="#df9b3f66" stroke-width="3"/>
    <rect x="1600" y="570" width="552" height="716" fill="#ffffff" filter="url(#softShadow)"/>
    <image href="${pageTwo}" x="1610" y="580" width="532" height="696" preserveAspectRatio="xMidYMid meet"/>
    <text x="2210" y="650" fill="${COLORS.brass}" font-family="Arial, sans-serif" font-size="34" font-weight="700" letter-spacing="5">1-PAGE ANCHOR PRINT</text>
    <text x="2210" y="790" fill="${COLORS.white}" font-family="Arial, sans-serif" font-size="48" font-weight="700">Six distilled themes</text>
    <path d="M2210 890 h440" stroke="#df9b3f66" stroke-width="3"/>
    ${lines(["Designed to keep", "or display"], 2210, 975, { size: 47, lineHeight: 62, fill: COLORS.white, weight: 700 })}
    <path d="M2210 1125 h440" stroke="#df9b3f66" stroke-width="3"/>
    ${lines(["Letter + A4", "included"], 2210, 1210, { size: 47, lineHeight: 62, fill: COLORS.white, weight: 700 })}
    <rect x="180" y="1845" width="2640" height="190" rx="36" fill="${COLORS.brass}"/>
    <text x="1500" y="1966" fill="#080a11" font-family="Arial, sans-serif" font-size="56" font-weight="700" text-anchor="middle">Four personalized PDFs · No physical shipment</text>
    ${footer(2, true)}
  `);
}

function personalization({ lunarBackground }) {
  const cards = [
    { x: 180, y: 580, n: "01", title: "Birth date", detail: ["Use YYYY-MM-DD", "so the date is unambiguous."] },
    { x: 1540, y: 580, n: "02", title: "Exact time + source", detail: ["Include AM/PM and your source,", "or choose UNKNOWN."] },
    { x: 180, y: 1110, n: "03", title: "Birth city + country", detail: ["The location anchors the chart", "to the correct place and zone."] },
    { x: 1540, y: 1110, n: "04", title: "Optional display name", detail: ["First name, initials, pseudonym,", "or leave it blank."] },
  ];
  const cardSvg = cards.map(({ x, y, n, title, detail }) => `<g>
    <rect x="${x}" y="${y}" width="1280" height="450" rx="42" fill="#081126e6" stroke="#a98aef99" stroke-width="3"/>
    <circle cx="${x + 105}" cy="${y + 105}" r="58" fill="${COLORS.brass}"/>
    <text x="${x + 105}" y="${y + 120}" fill="${COLORS.white}" font-family="Arial, sans-serif" font-size="34" font-weight="700" text-anchor="middle">${n}</text>
    <text x="${x + 200}" y="${y + 118}" fill="${COLORS.white}" font-family="Georgia, serif" font-size="66" font-weight="700">${esc(title)}</text>
    ${lines(detail, x + 200, y + 225, { size: 42, lineHeight: 58, fill: "#d7d0e1" })}
  </g>`).join("");
  return svg(`
    <image href="${lunarBackground}" width="3000" height="2250" preserveAspectRatio="xMidYMid slice"/>
    <rect width="3000" height="2250" fill="#050714" opacity="0.57"/>
    ${eyebrow("Personalization", 180, 210, true)}
    ${lines(["Four details make it yours."], 180, 400, { size: 116, fill: COLORS.white, family: "Georgia, serif", weight: 700 })}
    ${cardSvg}
    <rect x="180" y="1670" width="2640" height="280" rx="42" fill="${COLORS.brass}"/>
    <text x="270" y="1785" fill="#35200b" font-family="Arial, sans-serif" font-size="35" font-weight="700" letter-spacing="5">LAUNCH BOUNDARY</text>
    <text x="270" y="1890" fill="${COLORS.ink}" font-family="Georgia, serif" font-size="70" font-weight="700">Self-purchase only at launch</text>
    <text x="1680" y="1884" fill="${COLORS.inkSoft}" font-family="Arial, sans-serif" font-size="39">Gifting waits until recipient-consent handling is ready.</text>
    ${footer(3, true)}
  `, COLORS.ink);
}

function knownUnknown({ lunarBackground, knownPage, unknownPage }) {
  return svg(`
    <image href="${lunarBackground}" width="3000" height="2250" preserveAspectRatio="xMidYMid slice"/>
    <rect width="3000" height="2250" fill="#050714" opacity="0.58"/>
    ${eyebrow("Known time vs. unknown time", 180, 210, true)}
    ${lines(["Honest inputs. Honest output."], 180, 390, { size: 112, fill: COLORS.white, family: "Georgia, serif", weight: 700 })}
    <rect x="180" y="530" width="1280" height="1290" rx="42" fill="#071127e8" stroke="${COLORS.brass}" stroke-width="3"/>
    <rect x="1540" y="530" width="1280" height="1290" rx="42" fill="#21164ee8" stroke="${COLORS.violetPale}" stroke-width="3"/>
    <text x="260" y="660" fill="${COLORS.brass}" font-family="Arial, sans-serif" font-size="34" font-weight="700" letter-spacing="5">WHEN TIME IS KNOWN</text>
    <text x="1620" y="660" fill="${COLORS.violetPale}" font-family="Arial, sans-serif" font-size="34" font-weight="700" letter-spacing="5">WHEN TIME IS UNKNOWN</text>
    ${lines(["Ascendant", "Midheaven", "Whole Sign houses"], 270, 850, { size: 58, lineHeight: 155, fill: COLORS.white, family: "Georgia, serif", weight: 700 })}
    ${lines(["Angles suppressed", "Houses suppressed", "Unstable Moon", "claims omitted"], 1630, 850, { size: 48, lineHeight: 135, fill: COLORS.white, family: "Georgia, serif", weight: 700 })}
    <g filter="url(#softShadow)">
      <rect x="850" y="765" width="500" height="648" fill="#fffaf0"/>
      <image href="${knownPage}" x="860" y="775" width="480" height="628" preserveAspectRatio="xMidYMid meet"/>
      <rect x="2210" y="765" width="500" height="648" fill="#fffaf0"/>
      <image href="${unknownPage}" x="2220" y="775" width="480" height="628" preserveAspectRatio="xMidYMid meet"/>
    </g>
    <text x="270" y="1590" fill="#8eeeff" font-family="Arial, sans-serif" font-size="38" font-weight="700">Uses the details you actually know.</text>
    <text x="1630" y="1590" fill="${COLORS.violetPale}" font-family="Arial, sans-serif" font-size="38" font-weight="700">Never invents a missing clock time.</text>
    <rect x="180" y="1880" width="2640" height="180" rx="36" fill="${COLORS.brass}"/>
    <text x="1500" y="1995" fill="#080a11" font-family="Georgia, serif" font-size="64" font-weight="700" text-anchor="middle">Uncertainty is labeled—not guessed away.</text>
    ${footer(4, true)}
  `);
}

function process({ atlasBackground }) {
  const steps = [
    { x: 300, number: "1", lines: ["Your", "details"] },
    { x: 900, number: "2", lines: ["Versioned chart", "calculation"] },
    { x: 1500, number: "3", lines: ["Concise", "drafting"] },
    { x: 2100, number: "4", lines: ["Human", "QA"] },
    { x: 2700, number: "5", lines: ["Four finished", "PDFs"] },
  ];
  const arrows = [600, 1200, 1800, 2400].map((x) => `<path d="M${x - 115} 1020 H${x + 90} M${x + 35} 965 l55 55 -55 55" fill="none" stroke="#9f8fc8" stroke-width="12" stroke-linecap="round" stroke-linejoin="round"/>`).join("");
  const stepSvg = steps.map((step) => `<g>
    <circle cx="${step.x}" cy="1020" r="112" fill="${step.number === "4" ? COLORS.brass : COLORS.violet}" stroke="#ffffff55" stroke-width="4"/>
    <text x="${step.x}" y="1045" fill="${COLORS.white}" font-family="Georgia, serif" font-size="70" font-weight="700" text-anchor="middle">${step.number}</text>
    ${lines(step.lines, step.x, 1240, { size: 43, lineHeight: 55, fill: COLORS.white, weight: 700, anchor: "middle" })}
  </g>`).join("");
  return svg(`
    <image href="${atlasBackground}" width="3000" height="2250" preserveAspectRatio="xMidYMid slice"/>
    <rect width="3000" height="2250" fill="#050714" opacity="0.62"/>
    ${eyebrow("How it is made", 180, 210, true)}
    ${lines(["Calculation first. Judgment throughout."], 180, 410, { size: 110, fill: COLORS.white, family: "Georgia, serif", weight: 700 })}
    <text x="185" y="520" fill="#d8d0e3" font-family="Arial, sans-serif" font-size="46">A reproducible chart becomes a developed personal report only after review.</text>
    ${arrows}
    ${stepSvg}
    <rect x="180" y="1580" width="2640" height="340" rx="42" fill="#ffffff10" stroke="#ffffff35" stroke-width="3"/>
    <text x="270" y="1710" fill="${COLORS.brass}" font-family="Arial, sans-serif" font-size="35" font-weight="700" letter-spacing="5">CLEAR DISCLOSURE</text>
    <text x="270" y="1840" fill="${COLORS.white}" font-family="Georgia, serif" font-size="68" font-weight="700">AI-assisted drafting disclosed</text>
    <text x="1760" y="1840" fill="${COLORS.white}" font-family="Arial, sans-serif" font-size="48" font-weight="700">Every order reviewed by Kairos</text>
    ${footer(5, true)}
  `, COLORS.ink);
}

function printAccessibility({ atlasBackground, letterPage, a4Page }) {
  return svg(`
    <image href="${atlasBackground}" width="3000" height="2250" preserveAspectRatio="xMidYMid slice"/>
    <rect width="3000" height="2250" fill="#050714" opacity="0.60"/>
    ${eyebrow("Print + accessibility", 180, 210, true)}
    ${lines(["Designed to be read—not decoded."], 180, 395, { size: 110, fill: COLORS.white, family: "Georgia, serif", weight: 700 })}
    <g filter="url(#paperShadow)">
      <rect x="220" y="610" width="750" height="970" fill="#fffaf0"/>
      <image href="${letterPage}" x="235" y="625" width="720" height="940" preserveAspectRatio="xMidYMid meet"/>
      <rect x="760" y="720" width="680" height="963" fill="#fffaf0"/>
      <image href="${a4Page}" x="775" y="735" width="650" height="933" preserveAspectRatio="xMidYMid meet"/>
    </g>
    ${pill(300, 1660, 420, "US Letter file", true)}
    ${pill(915, 1745, 350, "A4 file", true)}
    <rect x="1540" y="585" width="1280" height="1120" rx="42" fill="#081126e8" stroke="${COLORS.brass}" stroke-width="3"/>
    ${checkItem(1630, 720, "Separate Letter + A4 files", "Choose the page size your printer expects.", true)}
    ${checkItem(1630, 960, "Selectable text + embedded fonts", "Not a flattened image-only document.", true)}
    ${checkItem(1630, 1200, "High contrast + non-color cues", "Meaning is not carried by color alone.", true)}
    ${checkItem(1630, 1440, "Chart data repeated as text", "A complete text reference sits beside the wheel.", true)}
    <rect x="180" y="1900" width="2640" height="150" rx="32" fill="${COLORS.brass}"/>
    <text x="1500" y="1995" fill="#080a11" font-family="Arial, sans-serif" font-size="43" font-weight="700" text-anchor="middle">Accessible by design · No independent PDF/UA certification claimed</text>
    ${footer(6, true)}
  `);
}

function deliverySupport({ atlasBackground }) {
  const cards = [
    { x: 180, y: 600, n: "01", title: "Delivered through Etsy", detail: ["Your finished files stay inside", "the marketplace order flow."] },
    { x: 1540, y: 600, n: "02", title: "Three-business-day target", detail: ["The clock starts after complete,", "unambiguous inputs arrive."] },
    { x: 180, y: 1140, n: "03", title: "Clarification pauses the clock", detail: ["Questions are handled through", "Etsy Messages before generation."] },
    { x: 1540, y: 1140, n: "04", title: "Defect correction window", detail: ["Report Kairos-caused defects within 14 days;", "correction target is two business days."] },
  ];
  const cardsSvg = cards.map(({ x, y, n, title, detail }) => `<g>
    <rect x="${x}" y="${y}" width="1280" height="450" rx="42" fill="#ffffff12" stroke="#ffffff35" stroke-width="3"/>
    <text x="${x + 85}" y="${y + 115}" fill="${COLORS.brass}" font-family="Georgia, serif" font-size="68" font-weight="700">${n}</text>
    <text x="${x + 230}" y="${y + 115}" fill="${COLORS.white}" font-family="Georgia, serif" font-size="59" font-weight="700">${esc(title)}</text>
    ${lines(detail, x + 230, y + 230, { size: 39, lineHeight: 58, fill: "#d9d2e3" })}
  </g>`).join("");
  return svg(`
    <image href="${atlasBackground}" width="3000" height="2250" preserveAspectRatio="xMidYMid slice"/>
    <rect width="3000" height="2250" fill="#050714" opacity="0.62"/>
    ${eyebrow("Delivery + support", 180, 210, true)}
    ${lines(["Made to order, with a clear handoff."], 180, 410, { size: 108, fill: COLORS.white, family: "Georgia, serif", weight: 700 })}
    ${cardsSvg}
    <rect x="180" y="1745" width="2640" height="210" rx="38" fill="${COLORS.brass}"/>
    <text x="1500" y="1880" fill="${COLORS.ink}" font-family="Georgia, serif" font-size="65" font-weight="700" text-anchor="middle">Made to order · Not an instant download</text>
    ${footer(7, true)}
  `, COLORS.ink);
}

function boundaries({ lunarBackground }) {
  const items = [
    { x: 180, y: 620, label: "REFLECTIVE", title: ["Not prediction or", "professional advice"] },
    { x: 1540, y: 620, label: "STANDALONE", title: ["No account, subscription,", "or software access"] },
    { x: 180, y: 1180, label: "DIGITAL", title: ["No physical item", "will be shipped"] },
    { x: 1540, y: 1180, label: "PERSONAL LICENSE", title: ["Personal use only—", "no resale or redistribution"] },
  ];
  const itemSvg = items.map(({ x, y, label, title }) => `<g>
    <rect x="${x}" y="${y}" width="1280" height="470" rx="42" fill="#081126e8" stroke="${COLORS.brass}" stroke-width="3"/>
    <rect x="${x}" y="${y}" width="18" height="470" rx="9" fill="${label === "DIGITAL" ? "#4ee7fd" : COLORS.brass}"/>
    <text x="${x + 95}" y="${y + 105}" fill="${COLORS.brass}" font-family="Arial, sans-serif" font-size="32" font-weight="700" letter-spacing="6">${label}</text>
    ${lines(title, x + 95, y + 235, { size: 60, lineHeight: 78, fill: COLORS.white, family: "Georgia, serif", weight: 700 })}
  </g>`).join("");
  return svg(`
    <image href="${lunarBackground}" width="3000" height="2250" preserveAspectRatio="xMidYMid slice"/>
    <rect width="3000" height="2250" fill="#050714" opacity="0.62"/>
    ${eyebrow("Before you order", 180, 210, true)}
    ${lines(["Clear boundaries are part of the product."], 180, 410, { size: 105, fill: COLORS.white, family: "Georgia, serif", weight: 700 })}
    ${itemSvg}
    <rect x="180" y="1795" width="2640" height="190" rx="38" fill="${COLORS.brass}"/>
    <text x="1500" y="1915" fill="#080a11" font-family="Georgia, serif" font-size="60" font-weight="700" text-anchor="middle">A complete artifact—nothing hidden behind a membership.</text>
    ${footer(8, true)}
  `);
}

async function writeImage(filename, markup) {
  const output = join(OUTPUT_DIR, filename);
  await sharp(Buffer.from(markup)).png({ compressionLevel: 9, palette: false }).toFile(output);
  return output;
}

async function main() {
  await mkdir(OUTPUT_DIR, { recursive: true });
  const [coverBackground, atlasBackground, lunarBackground, knownLetterOne, knownLetterTwo, knownA4One, unknownLetterOne] = await Promise.all([
    readFile(join(SOURCE_DIR, "cover-celestial-brand-v2.png")),
    readFile(join(SOURCE_DIR, "celestial-atlas-brand-v2.png")),
    readFile(join(SOURCE_DIR, "lunar-map-brand-v2.png")),
    readFile(join(SOURCE_DIR, "fixture-v2-known-report-letter-cover.png")),
    readFile(join(SOURCE_DIR, "fixture-v2-known-anchor-letter.png")),
    readFile(join(SOURCE_DIR, "fixture-v2-known-report-a4-cover.png")),
    readFile(join(SOURCE_DIR, "fixture-v2-unknown-report-letter-chart.png")),
  ]);

  const assets = {
    coverBackground: dataUri(coverBackground),
    atlasBackground: dataUri(atlasBackground),
    lunarBackground: dataUri(lunarBackground),
    pageOne: dataUri(knownLetterOne),
    pageTwo: dataUri(knownLetterTwo),
    a4Page: dataUri(knownA4One),
    unknownPage: dataUri(unknownLetterOne),
  };

  const outputs = await Promise.all([
    writeImage("01-finished-personalized-product.png", cover(assets)),
    writeImage("02-exactly-what-is-included.png", included(assets)),
    writeImage("03-personalization-inputs.png", personalization(assets)),
    writeImage("04-known-time-vs-unknown-time.png", knownUnknown({ lunarBackground: assets.lunarBackground, knownPage: assets.pageOne, unknownPage: assets.unknownPage })),
    writeImage("05-how-it-is-made.png", process(assets)),
    writeImage("06-print-and-accessibility.png", printAccessibility({ atlasBackground: assets.atlasBackground, letterPage: assets.pageOne, a4Page: assets.a4Page })),
    writeImage("07-delivery-and-support.png", deliverySupport(assets)),
    writeImage("08-boundaries.png", boundaries(assets)),
  ]);

  for (const output of outputs) {
    const metadata = await sharp(output).metadata();
    if (metadata.width !== WIDTH || metadata.height !== HEIGHT) {
      throw new Error(`${output} rendered at ${metadata.width}x${metadata.height}; expected ${WIDTH}x${HEIGHT}`);
    }
  }

  console.log(`Created ${outputs.length} Etsy listing images in ${OUTPUT_DIR}`);
  for (const output of outputs) console.log(output);
}

await main();

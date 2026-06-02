/**
 * Almanac design tokens — Obsidian palette.
 *
 * Token names kept stable (K.copper, K.bg, etc.) so component code doesn't
 * have to change. Values are hex equivalents of the Obsidian theme defined
 * in app/globals.css :root, so /today and /year/month feel like the same
 * product as /year/year (CosmicCalendar) and the rest of the app.
 *
 * Why hex (not hsl()): components concatenate alpha suffixes — `${K.copper}22`,
 * `${tone}44` — which requires hex literals. If we ever migrate to Tailwind
 * classes, this file goes away.
 */
export const K = {
  // ── palette ── Obsidian-equivalent hex
  bg: "#0a0c14",        // stone-950
  bg2: "#11131e",       // stone-900
  bg3: "#181a2a",       // stone-850
  bg4: "#21243a",       // stone-800
  line: "rgba(227, 226, 237, 0.10)",
  lineHi: "rgba(227, 226, 237, 0.18)",
  ink: "#e3e2ed",       // bone — cool near-white
  inkDim: "#a4a3b1",    // bone-muted
  inkSoft: "#6e6d7c",   // pushed brighter than Warm Almanac for AA contrast
  inkFaint: "rgba(227, 226, 237, 0.4)",
  // "copper" / "brick" keep their slot names but now resolve to Obsidian's
  // hero violet — same role (primary accent) as leather-* in /calendar.
  brick: "#5a3eba",
  brickHi: "#704bd2",   // leather-500
  copper: "#a98aef",    // leather-400
  copperHi: "#c7b3f5",  // leather-300
  ember: "#df9b3f",     // ember-400 — amber, used sparingly for warm signal
  sage: "#6798cb",      // moss-400 — Obsidian's "moss" is steel blue
  plum: "#b08cdc",      // plum-400
  midnight: "#080a11",  // stone-950 darker — for gradient anchors
  starlight: "#c1dcef", // moss-200 — pale steel
  // ── brand accents ── Stelloquy / Kairos identity, anchored on leather
  kairos: "#704bd2",
  kairosHi: "#a98aef",
  kairosLo: "#5a3eba",
  prism: "#4ee7fd",     // unchanged — distinct cyan accent
  chronos: "#df9b3f",   // amber
  // ── fonts ──
  fSerif: "var(--font-almanac-serif), \"EB Garamond\", Georgia, serif",
  fBody: "var(--font-almanac-body), ui-sans-serif, system-ui, sans-serif",
  fMono: "var(--font-almanac-mono), \"IBM Plex Mono\", ui-monospace, monospace",
  fDisplay: "var(--font-almanac-display), \"Trajan Pro\", serif",
} as const;

// Unicode glyphs — astrological. Index by planet or sign name.
export const GLYPH = {
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
  northNode: "☊",
  southNode: "☋",
  chiron: "⚷",
  aries: "♈",
  taurus: "♉",
  gemini: "♊",
  cancer: "♋",
  leo: "♌",
  virgo: "♍",
  libra: "♎",
  scorpio: "♏",
  sagittarius: "♐",
  capricorn: "♑",
  aquarius: "♒",
  pisces: "♓",
  conjunction: "☌",
  opposition: "☍",
  square: "□",
  trine: "△",
  sextile: "⚹",
} as const;

export type GlyphKey = keyof typeof GLYPH;
export type AspectKind = "conjunction" | "opposition" | "square" | "trine" | "sextile";

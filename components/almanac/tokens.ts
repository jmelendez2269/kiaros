/**
 * Warm Almanac design tokens, ported from Kairos-handoff/.../tokens.jsx.
 *
 * Mirrors the CSS variables defined in app/globals.css (--almanac-*) so the
 * primitives can use inline styles without a Tailwind round-trip. Keep this
 * file in sync with the :root block in globals.css.
 */
export const K = {
  // ── palette ──
  bg: "#15100c",
  bg2: "#1f1814",
  bg3: "#2a2018",
  bg4: "#372a20",
  line: "rgba(244, 232, 212, 0.10)",
  lineHi: "rgba(244, 232, 212, 0.18)",
  ink: "#f4e8d4",
  inkDim: "#c7b69a",
  inkSoft: "#8b7a60",
  inkFaint: "rgba(244, 232, 212, 0.4)",
  brick: "#7c2d2d",
  brickHi: "#a04040",
  copper: "#c9854c",
  copperHi: "#e0a05c",
  ember: "#d97c5e",
  sage: "#7a8a6e",
  plum: "#6b3d6e",
  midnight: "#1a2240",
  starlight: "#a9b4d8",
  // ── brand accents ──
  kairos: "#9966ff",
  kairosHi: "#b58fff",
  kairosLo: "#6b3fcc",
  prism: "#4ee7fd",
  chronos: "#ff9b2b",
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

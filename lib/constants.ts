/**
 * App constants and configuration
 */

export const APP_NAME = "Kiaros";
export const APP_DESCRIPTION =
  "A personalized planning system built around your goals, timing, and natural cycles.";

// Onboarding constants
export const LIFE_CATEGORIES = [
  "Work & Career",
  "Relationships",
  "Health & Wellness",
  "Creative Projects",
  "Personal Growth",
  "Family",
  "Financial",
  "Spirituality",
];

export const ENERGY_LEVELS = ["Low", "Medium", "High"];

export const ENERGY_FRAMINGS = ["Push", "Build", "Maintain", "Rest", "Integrate"];

// Routes
export const PUBLIC_ROUTES = ["/sign-in", "/sign-up"];
export const AUTH_ROUTES = [
  "/onboarding",
  "/onboarding/goals",
  "/onboarding/study-focus",
  "/onboarding/year-focus",
  "/onboarding/cycle",
  "/onboarding/theme",
  "/onboarding/generating",
];
export const PROTECTED_ROUTES = ["/dashboard", "/blueprint"];

// URLs
export const ONBOARDING_STEPS = [
  { step: 1, path: "/onboarding", title: "Timing Foundation" },
  { step: 2, path: "/onboarding/tradition", title: "Your Tradition" },
  { step: 3, path: "/onboarding/goals", title: "Focus Layers" },
  { step: 4, path: "/onboarding/study-focus", title: "Study Layer" },
  { step: 5, path: "/onboarding/year-focus", title: "Year Customization" },
  { step: 6, path: "/onboarding/cycle", title: "Energy Layer" },
  { step: 7, path: "/onboarding/theme", title: "Your Aesthetic" },
];

export type ThemeId = "obsidian" | "celestial" | "dawn";

export const THEMES: {
  id: ThemeId;
  name: string;
  tagline: string;
  description: string;
  /** Hardcoded preview swatches — bg, accent, secondary, tertiary */
  swatches: [string, string, string, string];
}[] = [
  {
    id: "obsidian",
    name: "Obsidian",
    tagline: "Deep void & moonlit periwinkle",
    description: "Cool near-black with layered lilac, periwinkle, and powder-blue accents. Precise, calm, and more atmospheric than stark.",
    swatches: ["#0c0b1f", "#9b86f7", "#84c4f2", "#c9b7ff"],
  },
  {
    id: "celestial",
    name: "Celestial",
    tagline: "Deep navy, starlight gold & sky blue",
    description: "The color language of star charts with more starlight in the mix: navy foundation, gold navigation marks, and luminous blue-violet atmosphere.",
    swatches: ["#050e1d", "#d8b266", "#84c2f2", "#9f92f7"],
  },
  {
    id: "dawn",
    name: "Dawn",
    tagline: "Dusky stone & lavender sky",
    description: "A warmer near-black, but with dawn-sky lilac, soft orchid, and pale blue threaded through the shadows.",
    swatches: ["#0e0804", "#a995f4", "#8fc6f2", "#d8a8d9"],
  },
];

// Timing
export const ONBOARDING_TIMEOUT = 30000; // 30 seconds for blueprint generation

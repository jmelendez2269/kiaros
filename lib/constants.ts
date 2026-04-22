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
  { step: 2, path: "/onboarding/goals", title: "Focus Layers" },
  { step: 3, path: "/onboarding/study-focus", title: "Study Layer" },
  { step: 4, path: "/onboarding/year-focus", title: "Year Customization" },
  { step: 5, path: "/onboarding/cycle", title: "Energy Layer" },
  { step: 6, path: "/onboarding/theme", title: "Your Aesthetic" },
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
    tagline: "Deep void & electric violet",
    description: "Cool near-black with a single electric violet accent. Precise, clean, like reading the sky through a telescope.",
    swatches: ["#0c0b1f", "#8b78f0", "#4d8ab5", "#d4a552"],
  },
  {
    id: "celestial",
    name: "Celestial",
    tagline: "Deep navy & amber gold",
    description: "The color language of star charts and celestial navigation. Navy foundation, amber gold accent.",
    swatches: ["#050e1d", "#d4a44e", "#3a8a88", "#6054a0"],
  },
  {
    id: "dawn",
    name: "Dawn",
    tagline: "Warm amber & ancient stone",
    description: "Amber-infused near-black with a single warm gold accent. Candlelight on stone.",
    swatches: ["#0e0804", "#d4922a", "#789060", "#c07040"],
  },
];

// Timing
export const ONBOARDING_TIMEOUT = 30000; // 30 seconds for blueprint generation

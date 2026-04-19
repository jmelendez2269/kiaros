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
];

// Timing
export const ONBOARDING_TIMEOUT = 30000; // 30 seconds for blueprint generation

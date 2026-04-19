/**
 * Shared TypeScript types for Kiaros
 *
 * This file defines the core data structures across the app
 */

/**
 * User profile - stored in Supabase
 * TODO: Extend with all required fields
 */
export interface UserProfile {
  id: string; // Clerk user ID
  clerkId: string;
  email: string;
  name?: string;
  createdAt: Date;
  updatedAt: Date;
  onboardingCompleted: boolean;
}

/**
 * Onboarding data - collected through multi-step form
 * TODO: Finalize all required fields
 */
export interface OnboardingData {
  // Step 1: Birth info
  birthName?: string;
  dateOfBirth?: Date;
  timeOfBirth?: string; // HH:MM format or null if unknown

  // Step 2: Location
  birthCity?: string;
  birthCountry?: string;
  timezone?: string;

  // Step 3: Goals
  lifeCategories: string[]; // e.g., ["work", "relationships", "health"]
  primaryGoal?: string;
  goalsByCategory?: Record<string, string>;

  // Step 4: Vision
  currentSeasonDescription?: string;
  next90DaysFocus?: string;

  // Step 5: Reflection
  recentLifeEvents?: string;
  easyVsHardReflection?: string;
  energyLevel?: "low" | "medium" | "high";

  // Metadata
  collectedAt?: Date;
}

/**
 * Blueprint - the hero artifact
 * Generated from onboarding data
 * TODO: Define exact structure after deciding generation approach
 */
export interface Blueprint {
  id: string;
  userId: string;
  version: number; // Support regeneration/versioning

  // Core sections
  seasonTheme?: string;
  seasonSummary?: string;
  whatMattersNow?: string;
  energyFraming?: string; // e.g., "push", "build", "maintain", "rest", "integrate"
  whatToLeanInto?: string;
  whatNotToForce?: string;
  next90DaysOutlook?: string;

  // Sections by life category
  categoryGuidance?: Record<string, string>;

  // Support/caution guidance
  supportedAreas?: string[];
  cautionAreas?: string[];

  // Metadata
  generatedAt: Date;
  generatedWith?: string; // e.g., "template-v1", "gpt-4", "mocked"
  isPublished: boolean;
}

/**
 * Weekly/Current guidance - derived from blueprint
 * TODO: Define structure for current-time guidance
 */
export interface CurrentGuidance {
  id: string;
  userId: string;
  blueprintId: string;

  weekStartDate: Date;
  energyFraming?: string;
  focusArea?: string;
  practicalGuidance?: string;
  whatToWatch?: string;

  generatedAt: Date;
}

/**
 * Feedback - for beta learning
 * TODO: Finalize feedback capture structure
 */
export interface Feedback {
  id: string;
  userId: string;
  type: "blueprint" | "dashboard" | "onboarding" | "general";
  message: string;
  rating?: number; // 1-5
  createdAt: Date;
}

/**
 * API Response types
 */
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface OnboardingResponse {
  success: boolean;
  blueprintId?: string;
  error?: string;
}

export interface BlueprintGenerationRequest {
  userId: string;
  onboardingData: OnboardingData;
}

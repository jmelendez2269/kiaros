/**
 * Supabase client configuration
 *
 * Server-side only — all DB access goes through API routes.
 * Uses the service role key to bypass RLS since auth is handled by Clerk.
 * Never import createServerSupabase() in client components.
 *
 * Database schema: see comments below
 */

import { createClient } from "@supabase/supabase-js";

/**
 * Server-side Supabase client.
 * Call this inside API route handlers after verifying Clerk auth.
 */
export function createServerSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

/**
 * Database row types (snake_case, matching Supabase columns)
 */

export interface DbUser {
  id: string;
  clerk_id: string;
  email: string;
  name: string | null;
  onboarding_completed: boolean;
  created_at: string;
  updated_at: string;
}

export interface DbOnboardingData {
  id: string;
  user_id: string;
  birth_name: string | null;
  birth_date: string | null;
  birth_time: string | null;
  birth_city: string | null;
  birth_state: string | null;
  birth_country: string | null;
  latitude: number | null;
  longitude: number | null;
  timezone: string | null;
  life_categories: string[];
  primary_goal: string | null;
  goals_by_category: Record<string, string>;
  current_season_description: string | null;
  next_90_days_focus: string | null;
  recent_life_events: string | null;
  easy_vs_hard_reflection: string | null;
  energy_level: "low" | "medium" | "high" | null;
  created_at: string;
  updated_at: string;
}

export interface DbBlueprint {
  id: string;
  user_id: string;
  version: number;
  season_theme: string | null;
  season_summary: string | null;
  what_matters_now: string | null;
  energy_framing: string | null;
  what_to_lean_into: string | null;
  what_not_to_force: string | null;
  next_90_days_outlook: string | null;
  category_guidance: Record<string, string>;
  supported_areas: string[];
  caution_areas: string[];
  generated_at: string;
  generated_with: string | null;
  is_published: boolean;
}

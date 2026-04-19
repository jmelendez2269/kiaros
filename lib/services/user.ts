/**
 * User service (Phase 1 stub)
 *
 * Placeholder during schema migration. The webhook now handles user creation.
 * These will be properly rebuilt in Phase 2 onboarding rebuild.
 */

import { ApiResponse } from "@/lib/types";

export interface DbUser {
  id: string;
  clerk_id: string;
  email: string;
  name: string | null;
  onboarding_completed: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Stub: User creation is now handled by the Clerk webhook.
 * This exists only to prevent crashes in legacy code during Phase 1.
 */
export async function getOrCreateUser(
  _clerkId: string,
  _email: string,
  _name?: string
): Promise<ApiResponse<DbUser>> {
  return {
    success: false,
    error: "Phase 1: User creation via webhook. Use createServerSupabase() directly.",
  };
}

/**
 * Stub: Retrieve user profile from the new schema.
 * Will be properly implemented in Phase 2.
 */
export async function getUserByClerkId(_clerkId: string): Promise<ApiResponse<DbUser>> {
  return {
    success: false,
    error: "Phase 1 stub: Properly implemented in Phase 2",
  };
}

/**
 * Stub: Mark onboarding complete via Clerk metadata.
 * Will be properly implemented in Phase 2.
 */
export async function markOnboardingComplete(
  _supabaseUserId: string
): Promise<ApiResponse<{ completed: boolean }>> {
  return {
    success: false,
    error: "Phase 1 stub: Properly implemented in Phase 2",
  };
}

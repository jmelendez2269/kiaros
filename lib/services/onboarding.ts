/**
 * Onboarding service (Phase 1 stub)
 *
 * Placeholder during schema migration.
 * Full implementation in Phase 2 with Goals, Year Focus, Cycle steps.
 */

import { ApiResponse } from "@/lib/types";

/**
 * Stub: Phase 2 will implement proper step-by-step saves.
 */
export async function saveOnboardingStep(
  _userId: string,
  _step: number,
  _data: Record<string, unknown>
): Promise<ApiResponse<{ stepSaved: boolean }>> {
  return {
    success: false,
    error: "Phase 1 stub: Onboarding rebuild in Phase 2",
  };
}

/**
 * Stub: Phase 2 will implement proper data retrieval.
 */
export async function getOnboardingData(_userId: string): Promise<ApiResponse<unknown>> {
  return {
    success: false,
    error: "Phase 1 stub: Onboarding rebuild in Phase 2",
  };
}

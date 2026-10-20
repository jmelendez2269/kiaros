import "server-only";

import { featureFlagEnabled } from "@/lib/calendar/calendar-day-routes";

function enabled(value: string | undefined): boolean {
  return featureFlagEnabled(value);
}

export function isJournalConsentV2Enabled(): boolean {
  return enabled(process.env.KIAROS_JOURNAL_CONSENT_V2);
}

export function isMemoryDefaultsEnabled(): boolean {
  return enabled(process.env.KIAROS_MEMORY_DEFAULTS);
}

export function isFunnelEventsEnabled(): boolean {
  return enabled(process.env.KIAROS_FUNNEL_EVENTS);
}

export function isMonthlyBlueprintWindowEnabled(): boolean {
  return enabled(process.env.KIAROS_MONTHLY_BLUEPRINT_WINDOW);
}

export function isRelevanceMemoryEnabled(): boolean {
  return enabled(process.env.KIAROS_RELEVANCE_MEMORY);
}

export function isPaidSamplerEnabled(): boolean {
  return enabled(process.env.KIAROS_PAID_SAMPLER);
}

export function isPersonalizedWeekExperimentEnabled(): boolean {
  return enabled(process.env.KIAROS_PERSONALIZED_WEEK_EXPERIMENT);
}

export function isEtsyArtifactAdminEnabled(): boolean {
  return enabled(process.env.KIAROS_ETSY_ARTIFACT_ADMIN);
}

export function isEtsyArtifactPersistenceEnabled(): boolean {
  return enabled(process.env.KIAROS_ETSY_ARTIFACT_PERSISTENCE);
}

export function isEtsyArtifactRealIntakeEnabled(): boolean {
  return enabled(process.env.KIAROS_ETSY_ARTIFACT_REAL_INTAKE);
}

export function isMetaCapiEnabled(): boolean {
  return enabled(process.env.KIAROS_META_CAPI);
}

/** Retention lifecycle emails (week-ahead / quiet-sky cron). Off unless exactly `true`. */
export function isRetentionEmailsEnabled(): boolean {
  return process.env.KIAROS_RETENTION_EMAILS_ENABLED === "true";
}

/** Calendar Day view (planner day moved under /calendar). Off by default. */
export function isCalendarDayEnabled(): boolean {
  return enabled(process.env.KIAROS_CALENDAR_DAY);
}

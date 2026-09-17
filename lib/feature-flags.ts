import "server-only";

function enabled(value: string | undefined): boolean {
  if (!value) return false;

  return ["1", "true", "on", "yes"].includes(value.trim().toLowerCase());
}

export function isJournalConsentV2Enabled(): boolean {
  return enabled(process.env.KIAROS_JOURNAL_CONSENT_V2);
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

export function isMetaCapiEnabled(): boolean {
  return enabled(process.env.KIAROS_META_CAPI);
}

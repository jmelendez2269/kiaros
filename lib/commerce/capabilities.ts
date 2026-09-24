export type CapabilityAccessPlan = "monthly" | "yearly";
export type CapabilityEntitlementState = "active" | "read_only" | "expired" | "revoked";

export type CapabilityAccessState =
  | "anonymous"
  | "signed_in"
  | "sampler_only"
  | "active_monthly"
  | "active_annual"
  | "read_only_annual"
  | "expired"
  | "admin";

export interface CapabilityEntitlement {
  accessPlan: CapabilityAccessPlan;
  endsAt: string;
  oracleEnabled: boolean;
  plannerYear: number;
  source?: string | null;
  startsAt: string;
  status: string;
}

export interface ResolveAccessCapabilitiesInput {
  asOf: Date | string;
  authenticated: boolean;
  entitlements?: readonly CapabilityEntitlement[];
  isAdmin?: boolean;
  samplerCredits?: number;
}

export interface AccessCapabilities {
  accessState: CapabilityAccessState;
  /** Years backed by an active or read-only annual entitlement. */
  blueprintFullAccessYears: number[];
  /** Years backed only by an active monthly entitlement. */
  blueprintWindowedAccessYears: number[];
  blueprintWindowEnd: string | null;
  blueprintWindowStart: string | null;
  canExportJournal: boolean;
  canGenerateMonthBrief: boolean;
  canReadBlueprint: boolean;
  /** True only when every readable Blueprint year is full; use getBlueprintYearCapability for mixed roles. */
  canReadFullBlueprint: boolean;
  canReadJournal: boolean;
  canUsePlanner: boolean;
  canUseStelloquySampler: boolean;
  canUseStelloquySubscription: boolean;
  canWriteJournal: boolean;
  isAdmin: boolean;
  isAuthenticated: boolean;
  samplerCredits: number;
}

export interface BlueprintYearCapability {
  access: "none" | "windowed" | "full";
  windowEnd: string | null;
  windowStart: string | null;
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export function toCapabilityISODate(value: Date | string): string {
  const date = typeof value === "string" ? value.slice(0, 10) : value.toISOString().slice(0, 10);
  const parsed = new Date(`${date}T00:00:00.000Z`);
  if (
    !ISO_DATE.test(date) ||
    !Number.isFinite(parsed.getTime()) ||
    parsed.toISOString().slice(0, 10) !== date
  ) {
    throw new RangeError(`Invalid capability date: ${String(value)}`);
  }
  return date;
}

export function addCapabilityDays(date: string, days: number): string {
  const next = new Date(`${toCapabilityISODate(date)}T00:00:00.000Z`);
  next.setUTCDate(next.getUTCDate() + days);
  return next.toISOString().slice(0, 10);
}

/** Monday of the ISO week containing `asOf`, through Sunday four weeks later. */
export function getMonthlyBlueprintWindow(asOf: Date | string): {
  start: string;
  end: string;
} {
  const today = toCapabilityISODate(asOf);
  const date = new Date(`${today}T00:00:00.000Z`);
  const utcDay = date.getUTCDay();
  const daysSinceMonday = utcDay === 0 ? 6 : utcDay - 1;
  const start = addCapabilityDays(today, -daysSinceMonday);

  return { start, end: addCapabilityDays(start, 34) };
}

export function resolveCapabilityEntitlementState(
  entitlement: Pick<CapabilityEntitlement, "accessPlan" | "endsAt" | "startsAt" | "status">,
  asOf: Date | string,
): CapabilityEntitlementState {
  if (entitlement.status === "revoked") return "revoked";

  const today = toCapabilityISODate(asOf);
  const startsAt = toCapabilityISODate(entitlement.startsAt);
  const endsAt = toCapabilityISODate(entitlement.endsAt);

  if (startsAt > endsAt) return "expired";
  if (entitlement.status === "active" && today >= startsAt && today <= endsAt) return "active";
  if (today > endsAt && entitlement.accessPlan === "yearly") return "read_only";
  return "expired";
}

function normalizedCredits(value: number | undefined): number {
  if (value === undefined || !Number.isFinite(value)) return 0;
  return Math.max(0, Math.floor(value));
}

function sortedYears(values: Iterable<number>): number[] {
  return [...new Set(values)].filter(Number.isInteger).sort((left, right) => left - right);
}

/**
 * Get the roll date for a given planner year (December 1 of the previous calendar year).
 * Example: planner year 2027 rolls on 2026-12-01
 */
function getPlannerYearRollDate(plannerYear: number): string {
  return `${plannerYear - 1}-12-01`;
}

/**
 * Compute which planner years are covered by an entitlement's active window.
 * 
 * Per Kai's decision: A planner year unlocks when it BECOMES the current planner year
 * while the entitlement is active (the roll date Dec 1 falls within [starts_at, ends_at]).
 * 
 * Covered years = entitlement's own plannerYear + every planner year whose roll date
 * falls inside the paid window.
 * 
 * @param entitlement - The entitlement to check
 * @param useWindowRule - Whether to apply the roll-forward rule (false for one-time/Etsy when switch is off)
 * @returns Array of planner years covered by this entitlement
 */
function getCoveredYears(
  entitlement: Pick<CapabilityEntitlement, "plannerYear" | "startsAt" | "endsAt" | "source">,
  useWindowRule: boolean,
): number[] {
  // One-time purchases that don't roll forward: return only the purchased year
  if (!useWindowRule) {
    return [entitlement.plannerYear];
  }

  const years = new Set<number>();
  
  // Always include the entitlement's own planner year
  years.add(entitlement.plannerYear);
  
  // Check which planner year roll dates fall within the window
  const startsAt = entitlement.startsAt;
  const endsAt = entitlement.endsAt;
  
  // Check a range of potential years (current year - 1 to current year + 5)
  // This is more than enough for any reasonable subscription duration
  const startYear = entitlement.plannerYear;
  const endYear = entitlement.plannerYear + 5;
  
  for (let year = startYear; year <= endYear; year++) {
    const rollDate = getPlannerYearRollDate(year);
    
    // If the roll date falls within the entitlement window, grant access to that year
    if (rollDate >= startsAt && rollDate <= endsAt) {
      years.add(year);
    }
  }
  
  return Array.from(years).sort((a, b) => a - b);
}

export function resolveAccessCapabilities(input: ResolveAccessCapabilitiesInput): AccessCapabilities {
  const asOf = toCapabilityISODate(input.asOf);
  const isAuthenticated = input.authenticated;
  const isAdmin = isAuthenticated && input.isAdmin === true;
  const samplerCredits = isAuthenticated ? normalizedCredits(input.samplerCredits) : 0;

  if (isAdmin) {
    return {
      accessState: "admin",
      blueprintFullAccessYears: [],
      blueprintWindowedAccessYears: [],
      blueprintWindowEnd: null,
      blueprintWindowStart: null,
      canExportJournal: true,
      canGenerateMonthBrief: true,
      canReadBlueprint: true,
      canReadFullBlueprint: true,
      canReadJournal: true,
      canUsePlanner: true,
      canUseStelloquySampler: true,
      canUseStelloquySubscription: true,
      canWriteJournal: true,
      isAdmin: true,
      isAuthenticated: true,
      samplerCredits,
    };
  }

  const resolved = isAuthenticated
    ? (input.entitlements ?? []).map((entitlement) => ({
        entitlement,
        state: resolveCapabilityEntitlementState(entitlement, asOf),
      }))
    : [];
  const active = resolved.filter(({ state }) => state === "active");
  const activeAnnual = active.filter(({ entitlement }) => entitlement.accessPlan === "yearly");
  const activeMonthly = active.filter(({ entitlement }) => entitlement.accessPlan === "monthly");
  const readOnlyAnnual = resolved.filter(
    ({ entitlement, state }) => entitlement.accessPlan === "yearly" && state === "read_only",
  );

  // Import the ONE_TIME_ANNUAL_ROLLS_FORWARD config at runtime
  // Lazy import to avoid circular dependency
  const ONE_TIME_ANNUAL_ROLLS_FORWARD = process.env.ONE_TIME_ANNUAL_ROLLS_FORWARD === 'true';
  
  // Determine which entitlements should use the window rule
  const shouldUseWindowRule = (entitlement: CapabilityEntitlement): boolean => {
    // Subscribers always use the window rule
    if (entitlement.source === 'stripe' && entitlement.accessPlan === 'yearly') {
      // This is a subscription if it's from stripe with yearly access plan
      return true;
    }
    if (entitlement.accessPlan === 'monthly') {
      return true;
    }
    // One-time and Etsy purchases use the config switch
    return ONE_TIME_ANNUAL_ROLLS_FORWARD;
  };

  const fullYears = sortedYears(
    [...activeAnnual, ...readOnlyAnnual].flatMap(({ entitlement }) => 
      getCoveredYears(entitlement, shouldUseWindowRule(entitlement))
    ),
  );
  const fullYearSet = new Set(fullYears);
  const windowedYears = sortedYears(
    activeMonthly
      .flatMap(({ entitlement }) => getCoveredYears(entitlement, true))
      .filter((plannerYear) => !fullYearSet.has(plannerYear)),
  );
  const monthlyWindow = windowedYears.length > 0 ? getMonthlyBlueprintWindow(asOf) : null;
  const hasActivePlanner = active.length > 0;
  const hasExpiredEntitlement = resolved.some(({ state }) => state === "expired");
  const hasReadOnlyAnnual = readOnlyAnnual.length > 0;

  let accessState: CapabilityAccessState;
  if (!isAuthenticated) accessState = "anonymous";
  else if (activeAnnual.length > 0) accessState = "active_annual";
  else if (activeMonthly.length > 0) accessState = "active_monthly";
  else if (hasReadOnlyAnnual) accessState = "read_only_annual";
  else if (samplerCredits > 0) accessState = "sampler_only";
  else if (hasExpiredEntitlement) accessState = "expired";
  else accessState = "signed_in";

  return {
    accessState,
    blueprintFullAccessYears: fullYears,
    blueprintWindowedAccessYears: windowedYears,
    blueprintWindowEnd: monthlyWindow?.end ?? null,
    blueprintWindowStart: monthlyWindow?.start ?? null,
    canExportJournal: isAuthenticated,
    canGenerateMonthBrief: hasActivePlanner,
    canReadBlueprint: fullYears.length > 0 || windowedYears.length > 0,
    canReadFullBlueprint: fullYears.length > 0 && windowedYears.length === 0,
    canReadJournal: isAuthenticated,
    canUsePlanner: hasActivePlanner,
    canUseStelloquySampler: samplerCredits > 0,
    canUseStelloquySubscription: active.some(({ entitlement }) => entitlement.oracleEnabled),
    canWriteJournal: hasActivePlanner,
    isAdmin: false,
    isAuthenticated,
    samplerCredits,
  };
}

export function getBlueprintYearCapability(
  capabilities: AccessCapabilities,
  plannerYear: number,
): BlueprintYearCapability {
  if (capabilities.isAdmin || capabilities.blueprintFullAccessYears.includes(plannerYear)) {
    return { access: "full", windowEnd: null, windowStart: null };
  }

  if (capabilities.blueprintWindowedAccessYears.includes(plannerYear)) {
    return {
      access: "windowed",
      windowEnd: capabilities.blueprintWindowEnd,
      windowStart: capabilities.blueprintWindowStart,
    };
  }

  return { access: "none", windowEnd: null, windowStart: null };
}

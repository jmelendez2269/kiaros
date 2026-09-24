import { getPlannerYearWithOverride } from './planner-year.ts';

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
  isSubscription?: boolean;
}

export interface ResolveAccessCapabilitiesInput {
  asOf: Date | string;
  authenticated: boolean;
  entitlements?: readonly CapabilityEntitlement[];
  isAdmin?: boolean;
  samplerCredits?: number;
  oneTimeAnnualRollsForward?: boolean;
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
 * while the entitlement is active. The roll date must be <= asOf (has actually happened).
 * 
 * Covered years = entitlement's own plannerYear + every planner year whose roll date
 * falls inside the paid window AND has already occurred (rollDate <= asOf).
 * 
 * @param entitlement - The entitlement to check
 * @param useWindowRule - Whether to apply the roll-forward rule (false for one-time/Etsy when switch is off)
 * @param asOf - The date to check against (only grant years whose roll date has passed)
 * @returns Array of planner years covered by this entitlement
 */
function getCoveredYears(
  entitlement: Pick<CapabilityEntitlement, "plannerYear" | "startsAt" | "endsAt" | "source">,
  useWindowRule: boolean,
  asOf: string,
): number[] {
  // One-time purchases that don't roll forward: return only the purchased year
  if (!useWindowRule) {
    return [entitlement.plannerYear];
  }

  const years = new Set<number>();
  
  // Always include the entitlement's own planner year
  years.add(entitlement.plannerYear);
  
  // Check which planner year roll dates fall within the window AND have occurred
  const startsAt = entitlement.startsAt;
  const endsAt = entitlement.endsAt;
  
  // Check a range of potential years (current year - 1 to current year + 5)
  // This is more than enough for any reasonable subscription duration
  const startYear = entitlement.plannerYear;
  const endYear = entitlement.plannerYear + 5;
  
  for (let year = startYear; year <= endYear; year++) {
    const rollDate = getPlannerYearRollDate(year);
    
    // Grant access only if:
    // 1. Roll date falls within the entitlement window
    // 2. Roll date has actually occurred (rollDate <= asOf)
    if (rollDate >= startsAt && rollDate <= endsAt && rollDate <= asOf) {
      years.add(year);
    }
  }
  
  return Array.from(years).sort((a, b) => a - b);
}

/**
 * Determines whether a user should be sent to the rollover flow.
 * Returns true when:
 * 1. User's profile plan_year is behind the current planner year
 * 2. User has access to the current planner year (via their covered years)
 * 
 * This ensures:
 * - Subscribers are sent to renew on Dec 1 (when current planner year advances)
 * - One-time/Etsy without roll-forward are NOT sent (they don't have access to new year)
 * - After renewing, profile.plan_year is updated so they're not sent again until next roll
 */
export function shouldRollOver(input: {
  profilePlanYear: number | null;
  coveredYears: number[];
  asOf: Date | string;
}): boolean {
  const { profilePlanYear, coveredYears, asOf } = input;
  
  if (!profilePlanYear) {
    return false;
  }
  
  const currentPlannerYear = getPlannerYearWithOverride(typeof asOf === 'string' ? new Date(asOf) : asOf);
  
  // Profile is behind current planner year AND user has access to current planner year
  return profilePlanYear < currentPlannerYear && coveredYears.includes(currentPlannerYear);
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

  // Determine which entitlements should use the window rule
  const shouldUseWindowRule = (entitlement: CapabilityEntitlement): boolean => {
    // Monthly subscriptions always use the window rule
    if (entitlement.accessPlan === 'monthly') {
      return true;
    }
    // Annual subscriptions (yearly with isSubscription flag) always use the window rule
    if (entitlement.accessPlan === 'yearly' && entitlement.isSubscription === true) {
      return true;
    }
    // One-time purchases and Etsy follow the input parameter
    return input.oneTimeAnnualRollsForward ?? false;
  };

  const fullYears = sortedYears(
    [...activeAnnual, ...readOnlyAnnual].flatMap(({ entitlement }) => 
      getCoveredYears(entitlement, shouldUseWindowRule(entitlement), asOf)
    ),
  );
  const fullYearSet = new Set(fullYears);
  const windowedYears = sortedYears(
    activeMonthly
      .flatMap(({ entitlement }) => getCoveredYears(entitlement, true, asOf))
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

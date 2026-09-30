#!/usr/bin/env tsx
/**
 * Verification script for annual subscription full-year access policy.
 * 
 * Policy: Yearly subscriptions purchased on/after 2026-10-01 whose paid period
 * ends in Oct-Dec receive full access through Dec 31 of that same calendar year.
 * Covered years are still computed from the real [starts_at, ends_at] window.
 */

// Mock server-only module before any imports
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
require.cache[require.resolve('server-only')] = {
  id: 'server-only',
  exports: {},
  loaded: true,
  children: [],
  paths: [],
  filename: 'server-only',
} as any;

import {
  resolveAccessCapabilities,
  resolveCapabilityEntitlementState,
  type CapabilityEntitlement,
} from '../lib/commerce/capabilities';

// Type for ProductEntitlementRecord without importing server-only module
type ProductEntitlementRecord = {
  id: string;
  user_id: string;
  source?: string | null;
  source_order_id?: string | null;
  product_tier: string;
  planner_year: number;
  oracle_enabled: boolean;
  starts_at: string;
  ends_at: string;
  status: string;
  created_at: string;
  access_plan?: string | null;
};

interface TestCase {
  name: string;
  entitlement: CapabilityEntitlement;
  checkDates: Array<{
    date: string;
    expectedAccessState: string;
    expectedFullYears: number[];
    expectedFullAccess: boolean;
    description: string;
  }>;
}

const testCases: TestCase[] = [
  {
    name: 'Case (a): Oct 10, 2026 annual buyer, cancelled (ends 2027-10-10)',
    entitlement: {
      accessPlan: 'yearly',
      startsAt: '2026-10-10',
      endsAt: '2027-10-10',
      plannerYear: 2026,
      oracleEnabled: true,
      status: 'active',
      isSubscription: true,
    },
    checkDates: [
      {
        date: '2026-10-10',
        expectedAccessState: 'active_annual',
        expectedFullYears: [2026],
        expectedFullAccess: true,
        description: 'Purchase date: full access, year 2026',
      },
      {
        date: '2026-12-01',
        expectedAccessState: 'active_annual',
        expectedFullYears: [2026, 2027],
        expectedFullAccess: true,
        description: 'Dec 1 2026: 2027 unlocks, full access',
      },
      {
        date: '2027-10-11',
        expectedAccessState: 'active_annual',
        expectedFullYears: [2026, 2027],
        expectedFullAccess: true,
        description: 'Oct 11 2027: still FULL (extension applies), years [2026,2027]',
      },
      {
        date: '2027-12-31',
        expectedAccessState: 'active_annual',
        expectedFullYears: [2026, 2027],
        expectedFullAccess: true,
        description: 'Dec 31 2027: FULL (last day of extension)',
      },
      {
        date: '2028-01-01',
        expectedAccessState: 'read_only_annual',
        expectedFullYears: [2026, 2027],
        expectedFullAccess: false,
        description: 'Jan 1 2028: read_only_annual, years [2026,2027], never 2028',
      },
    ],
  },
  {
    name: 'Case (b): Oct 10, 2026 annual buyer, renewed (ends 2028-10-10)',
    entitlement: {
      accessPlan: 'yearly',
      startsAt: '2026-10-10',
      endsAt: '2028-10-10',
      plannerYear: 2026,
      oracleEnabled: true,
      status: 'active',
      isSubscription: true,
    },
    checkDates: [
      {
        date: '2027-12-01',
        expectedAccessState: 'active_annual',
        expectedFullYears: [2026, 2027, 2028],
        expectedFullAccess: true,
        description: 'Dec 1 2027: gets 2028 (via normal roll-forward)',
      },
      {
        date: '2028-10-11',
        expectedAccessState: 'active_annual',
        expectedFullYears: [2026, 2027, 2028],
        expectedFullAccess: true,
        description: 'Oct 11 2028: full access continues (extension applies to 2028-12-31)',
      },
      {
        date: '2028-12-31',
        expectedAccessState: 'active_annual',
        expectedFullYears: [2026, 2027, 2028],
        expectedFullAccess: true,
        description: 'Dec 31 2028: full through end of year',
      },
    ],
  },
  {
    name: 'Case (c): Mar 10, 2027 annual buyer, cancelled (ends 2028-03-10)',
    entitlement: {
      accessPlan: 'yearly',
      startsAt: '2027-03-10',
      endsAt: '2028-03-10',
      plannerYear: 2027,
      oracleEnabled: true,
      status: 'active',
      isSubscription: true,
    },
    checkDates: [
      {
        date: '2027-03-10',
        expectedAccessState: 'active_annual',
        expectedFullYears: [2027],
        expectedFullAccess: true,
        description: 'Purchase date: full access, year 2027',
      },
      {
        date: '2027-12-01',
        expectedAccessState: 'active_annual',
        expectedFullYears: [2027, 2028],
        expectedFullAccess: true,
        description: 'Dec 1 2027: 2028 unlocks',
      },
      {
        date: '2028-03-10',
        expectedAccessState: 'active_annual',
        expectedFullYears: [2027, 2028],
        expectedFullAccess: true,
        description: 'Mar 10 2028: full through ends_at (NO extension, March not Oct-Dec)',
      },
      {
        date: '2028-03-11',
        expectedAccessState: 'read_only_annual',
        expectedFullYears: [2027, 2028],
        expectedFullAccess: false,
        description: 'Mar 11 2028: read_only_annual with years [2027,2028]',
      },
    ],
  },
  {
    name: 'Case (d): Dec 15, 2026 annual buyer, cancelled (ends 2027-12-15)',
    entitlement: {
      accessPlan: 'yearly',
      startsAt: '2026-12-15',
      endsAt: '2027-12-15',
      plannerYear: 2027,
      oracleEnabled: true,
      status: 'active',
      isSubscription: true,
    },
    checkDates: [
      {
        date: '2026-12-15',
        expectedAccessState: 'active_annual',
        expectedFullYears: [2027],
        expectedFullAccess: true,
        description: 'Purchase date: full access, year 2027',
      },
      {
        date: '2027-12-01',
        expectedAccessState: 'active_annual',
        expectedFullYears: [2027, 2028],
        expectedFullAccess: true,
        description: 'Dec 1 2027: 2028 unlocks (roll date within paid window)',
      },
      {
        date: '2027-12-16',
        expectedAccessState: 'active_annual',
        expectedFullYears: [2027, 2028],
        expectedFullAccess: true,
        description: 'Dec 16 2027: still full (extension to 2027-12-31 applies)',
      },
      {
        date: '2027-12-31',
        expectedAccessState: 'active_annual',
        expectedFullYears: [2027, 2028],
        expectedFullAccess: true,
        description: 'Dec 31 2027: full through end of year',
      },
      {
        date: '2028-01-01',
        expectedAccessState: 'read_only_annual',
        expectedFullYears: [2027, 2028],
        expectedFullAccess: false,
        description: 'Jan 1 2028: read_only_annual (access extended but years unchanged)',
      },
    ],
  },
  {
    name: 'Case (e): Sep 15, 2026 annual buyer, cancelled (ends 2027-09-15)',
    entitlement: {
      accessPlan: 'yearly',
      startsAt: '2026-09-15',
      endsAt: '2027-09-15',
      plannerYear: 2026,
      oracleEnabled: true,
      status: 'active',
      isSubscription: true,
    },
    checkDates: [
      {
        date: '2026-09-15',
        expectedAccessState: 'active_annual',
        expectedFullYears: [2026],
        expectedFullAccess: true,
        description: 'Purchase date: full access',
      },
      {
        date: '2027-09-15',
        expectedAccessState: 'active_annual',
        expectedFullYears: [2026, 2027],
        expectedFullAccess: true,
        description: 'Last day: full access',
      },
      {
        date: '2027-09-16',
        expectedAccessState: 'read_only_annual',
        expectedFullYears: [2026, 2027],
        expectedFullAccess: false,
        description: 'Day after: read_only_annual (NO extension, purchased before cutoff)',
      },
    ],
  },
  {
    name: 'Case (f): Monthly Oct 2026 buyer (ends 2026-11-10)',
    entitlement: {
      accessPlan: 'monthly',
      startsAt: '2026-10-10',
      endsAt: '2026-11-10',
      plannerYear: 2026,
      oracleEnabled: true,
      status: 'active',
      isSubscription: true,
    },
    checkDates: [
      {
        date: '2026-10-10',
        expectedAccessState: 'active_monthly',
        expectedFullYears: [],
        expectedFullAccess: true,
        description: 'Monthly: windowed access, unchanged (canUsePlanner true for active monthly)',
      },
      {
        date: '2026-11-11',
        expectedAccessState: 'expired',
        expectedFullYears: [],
        expectedFullAccess: false,
        description: 'After expiry: expired (NO extension for monthly)',
      },
    ],
  },
];

function runTests() {
  console.log('='.repeat(80));
  console.log('ANNUAL FULL-YEAR ACCESS VERIFICATION');
  console.log('='.repeat(80));
  console.log();
  console.log('Policy: Yearly subscriptions purchased on/after 2026-10-01 whose paid');
  console.log('period ends in Oct-Dec receive full access through Dec 31 of that same');
  console.log('calendar year. Covered years computed from real [starts_at, ends_at].');
  console.log();
  console.log('='.repeat(80));
  console.log();

  let totalTests = 0;
  let passedTests = 0;
  let failedTests = 0;

  for (const testCase of testCases) {
    console.log(`\n${'─'.repeat(80)}`);
    console.log(`TEST: ${testCase.name}`);
    console.log(`${'─'.repeat(80)}`);
    console.log(`Entitlement: ${testCase.entitlement.accessPlan} subscription`);
    console.log(`  starts_at: ${testCase.entitlement.startsAt}`);
    console.log(`  ends_at: ${testCase.entitlement.endsAt}`);
    console.log(`  planner_year: ${testCase.entitlement.plannerYear}`);
    console.log(`  isSubscription: ${testCase.entitlement.isSubscription}`);
    console.log();

    for (const check of testCase.checkDates) {
      totalTests++;
      const capabilities = resolveAccessCapabilities({
        asOf: check.date,
        authenticated: true,
        entitlements: [testCase.entitlement],
      });

      const fullAccessYearsMatch = 
        JSON.stringify(capabilities.blueprintFullAccessYears) === JSON.stringify(check.expectedFullYears);
      const accessStateMatch = capabilities.accessState === check.expectedAccessState;
      const fullAccessMatch = capabilities.canUsePlanner === check.expectedFullAccess;

      const passed = fullAccessYearsMatch && accessStateMatch && fullAccessMatch;

      if (passed) {
        passedTests++;
        console.log(`  ✓ ${check.date}: ${check.description}`);
      } else {
        failedTests++;
        console.log(`  ✗ ${check.date}: ${check.description}`);
      }

      console.log(`    Access state: ${capabilities.accessState} (expected: ${check.expectedAccessState}) ${accessStateMatch ? '✓' : '✗'}`);
      console.log(`    Full years: ${JSON.stringify(capabilities.blueprintFullAccessYears)} (expected: ${JSON.stringify(check.expectedFullYears)}) ${fullAccessYearsMatch ? '✓' : '✗'}`);
      console.log(`    Can use planner: ${capabilities.canUsePlanner} (expected: ${check.expectedFullAccess}) ${fullAccessMatch ? '✓' : '✗'}`);
      console.log();
    }
  }

  console.log(`${'='.repeat(80)}`);
  console.log(`SUMMARY: ${passedTests}/${totalTests} tests passed`);
  if (failedTests > 0) {
    console.log(`${failedTests} tests FAILED`);
  }
  console.log(`${'='.repeat(80)}`);
  console.log();

  if (failedTests > 0) {
    process.exit(1);
  }
}

function runEntitlementStateTests() {
  console.log('='.repeat(80));
  console.log('ENTITLEMENT-LEVEL STATE TESTS');
  console.log('='.repeat(80));
  console.log();
  console.log('Testing that resolveCapabilityEntitlementState matches capabilities for');
  console.log('subscription vs non-subscription entitlements.');
  console.log();
  console.log('='.repeat(80));
  console.log();

  let totalTests = 0;
  let passedTests = 0;
  let failedTests = 0;

  // Test case (a) on 2027-11-15 - subscription should be active
  {
    totalTests++;
    const entitlement: CapabilityEntitlement = {
      accessPlan: 'yearly',
      startsAt: '2026-10-10',
      endsAt: '2027-10-10',
      plannerYear: 2026,
      oracleEnabled: true,
      status: 'active',
      isSubscription: true,
    };

    const state = resolveCapabilityEntitlementState(entitlement, '2027-11-15');
    const passed = state === 'active';

    if (passed) {
      passedTests++;
      console.log(`✓ Case (a) 2027-11-15 (subscription): entitlement state='active'`);
    } else {
      failedTests++;
      console.log(`✗ Case (a) 2027-11-15 (subscription): FAILED`);
    }
    console.log(`  State: ${state} (expected: active) ${passed ? '✓' : '✗'}`);
    console.log();
  }

  // Test case (a) on 2028-01-01 - subscription should be read_only
  {
    totalTests++;
    const entitlement: CapabilityEntitlement = {
      accessPlan: 'yearly',
      startsAt: '2026-10-10',
      endsAt: '2027-10-10',
      plannerYear: 2026,
      oracleEnabled: true,
      status: 'active',
      isSubscription: true,
    };

    const state = resolveCapabilityEntitlementState(entitlement, '2028-01-01');
    const passed = state === 'read_only';

    if (passed) {
      passedTests++;
      console.log(`✓ Case (a) 2028-01-01 (subscription): entitlement state='read_only'`);
    } else {
      failedTests++;
      console.log(`✗ Case (a) 2028-01-01 (subscription): FAILED`);
    }
    console.log(`  State: ${state} (expected: read_only) ${passed ? '✓' : '✗'}`);
    console.log();
  }

  // Test yearly entitlement NOT a subscription - should be read_only on 2027-10-11
  {
    totalTests++;
    const entitlement: CapabilityEntitlement = {
      accessPlan: 'yearly',
      startsAt: '2026-10-10',
      endsAt: '2027-10-10',
      plannerYear: 2026,
      oracleEnabled: true,
      status: 'active',
      isSubscription: false,
    };

    const state = resolveCapabilityEntitlementState(entitlement, '2027-10-11');
    const passed = state === 'read_only';

    if (passed) {
      passedTests++;
      console.log(`✓ Yearly NOT subscription (2027-10-11): entitlement state='read_only' (NO extension)`);
    } else {
      failedTests++;
      console.log(`✗ Yearly NOT subscription (2027-10-11): FAILED`);
    }
    console.log(`  State: ${state} (expected: read_only) ${passed ? '✓' : '✗'}`);
    console.log();
  }

  // Test that capabilities and entitlement state agree for active subscription
  {
    totalTests++;
    const entitlement: CapabilityEntitlement = {
      accessPlan: 'yearly',
      startsAt: '2026-10-10',
      endsAt: '2027-10-10',
      plannerYear: 2026,
      oracleEnabled: true,
      status: 'active',
      isSubscription: true,
    };

    const state = resolveCapabilityEntitlementState(entitlement, '2027-11-15');
    const capabilities = resolveAccessCapabilities({
      asOf: '2027-11-15',
      authenticated: true,
      entitlements: [entitlement],
    });

    const passed = state === 'active' && capabilities.accessState === 'active_annual';

    if (passed) {
      passedTests++;
      console.log(`✓ Subscription on 2027-11-15: entitlement state and capabilities both active`);
    } else {
      failedTests++;
      console.log(`✗ Subscription on 2027-11-15: entitlement state and capabilities mismatch`);
    }
    console.log(`  Entitlement state: ${state} (expected: active) ${state === 'active' ? '✓' : '✗'}`);
    console.log(`  Capabilities state: ${capabilities.accessState} (expected: active_annual) ${capabilities.accessState === 'active_annual' ? '✓' : '✗'}`);
    console.log();
  }

  console.log(`${'='.repeat(80)}`);
  console.log(`ENTITLEMENT STATE TESTS SUMMARY: ${passedTests}/${totalTests} tests passed`);
  if (failedTests > 0) {
    console.log(`${failedTests} tests FAILED`);
  }
  console.log(`${'='.repeat(80)}`);
  console.log();

  if (failedTests > 0) {
    process.exit(1);
  }
}

async function runUserAccessIntegrationTests() {
  console.log('='.repeat(80));
  console.log('USER ACCESS INTEGRATION TESTS');
  console.log('='.repeat(80));
  console.log();
  console.log('Testing resolveUserAccess with orderSubscriptionMap to verify');
  console.log('entitlement-level accessState matches capabilities.accessState.');
  console.log();
  console.log('='.repeat(80));
  console.log();

  // Dynamic import to avoid server-only issues
  const { resolveUserAccess } = await import('../lib/commerce/entitlements');

  let totalTests = 0;
  let passedTests = 0;
  let failedTests = 0;

  // Case (a): Oct 5, 2026 yearly-sub buyer, cancelled (ends 2027-10-05)
  // On 2027-11-15: should be active with full capabilities
  {
    totalTests++;
    const entitlement: ProductEntitlementRecord = {
      id: 'test-1',
      user_id: 'test-user',
      source: 'stripe',
      source_order_id: 'order-oct-sub',
      product_tier: 'planner_annual',
      planner_year: 2026,
      oracle_enabled: true,
      starts_at: '2026-10-05',
      ends_at: '2027-10-05',
      status: 'active',
      created_at: '2026-10-05T00:00:00Z',
      access_plan: 'yearly',
    };

    const subscriptionMap = new Map([['order-oct-sub', true]]);
    const access = resolveUserAccess([entitlement], '2027-11-15', undefined, subscriptionMap);

    const hasActiveEntitlement = access.activeEntitlements.length === 1;
    const entitlementStateMatch = access.activeEntitlements[0]?.accessState === 'active';
    const capabilitiesMatch = access.capabilities.accessState === 'active_annual';
    const statesAgree = entitlementStateMatch && capabilitiesMatch;

    const passed = hasActiveEntitlement && statesAgree;

    if (passed) {
      passedTests++;
      console.log(`✓ Case (a) Oct 5, 2026 yearly-sub, 2027-11-15: active entitlement + active_annual capabilities`);
    } else {
      failedTests++;
      console.log(`✗ Case (a) Oct 5, 2026 yearly-sub, 2027-11-15: FAILED`);
    }
    console.log(`  activeEntitlements.length: ${access.activeEntitlements.length} (expected: 1) ${hasActiveEntitlement ? '✓' : '✗'}`);
    console.log(`  activeEntitlements[0].accessState: ${access.activeEntitlements[0]?.accessState ?? 'none'} (expected: active) ${entitlementStateMatch ? '✓' : '✗'}`);
    console.log(`  capabilities.accessState: ${access.capabilities.accessState} (expected: active_annual) ${capabilitiesMatch ? '✓' : '✗'}`);
    console.log();
  }

  // Case (a) on 2028-01-01: should NOT be active
  {
    totalTests++;
    const entitlement: ProductEntitlementRecord = {
      id: 'test-1',
      user_id: 'test-user',
      source: 'stripe',
      source_order_id: 'order-oct-sub',
      product_tier: 'planner_annual',
      planner_year: 2026,
      oracle_enabled: true,
      starts_at: '2026-10-05',
      ends_at: '2027-10-05',
      status: 'active',
      created_at: '2026-10-05T00:00:00Z',
      access_plan: 'yearly',
    };

    const subscriptionMap = new Map([['order-oct-sub', true]]);
    const access = resolveUserAccess([entitlement], '2028-01-01', undefined, subscriptionMap);

    const noActiveEntitlement = access.activeEntitlements.length === 0;
    const entitlementStateMatch = access.entitlements[0]?.accessState === 'read_only';
    const capabilitiesMatch = access.capabilities.accessState === 'read_only_annual';
    const statesAgree = entitlementStateMatch && capabilitiesMatch;

    const passed = noActiveEntitlement && statesAgree;

    if (passed) {
      passedTests++;
      console.log(`✓ Case (a) Oct 5, 2026 yearly-sub, 2028-01-01: NOT active, read_only entitlement + read_only_annual capabilities`);
    } else {
      failedTests++;
      console.log(`✗ Case (a) Oct 5, 2026 yearly-sub, 2028-01-01: FAILED`);
    }
    console.log(`  activeEntitlements.length: ${access.activeEntitlements.length} (expected: 0) ${noActiveEntitlement ? '✓' : '✗'}`);
    console.log(`  entitlements[0].accessState: ${access.entitlements[0]?.accessState ?? 'none'} (expected: read_only) ${entitlementStateMatch ? '✓' : '✗'}`);
    console.log(`  capabilities.accessState: ${access.capabilities.accessState} (expected: read_only_annual) ${capabilitiesMatch ? '✓' : '✗'}`);
    console.log();
  }

  // Case (b): Same entitlement but NOT a subscription (one-time annual)
  // On 2027-11-15: should NOT be extended
  {
    totalTests++;
    const entitlement: ProductEntitlementRecord = {
      id: 'test-2',
      user_id: 'test-user',
      source: 'stripe',
      source_order_id: 'order-oct-onetime',
      product_tier: 'planner_annual',
      planner_year: 2026,
      oracle_enabled: true,
      starts_at: '2026-10-05',
      ends_at: '2027-10-05',
      status: 'active',
      created_at: '2026-10-05T00:00:00Z',
      access_plan: 'yearly',
    };

    // Map entry is false - this is NOT a subscription
    const subscriptionMap = new Map([['order-oct-onetime', false]]);
    const access = resolveUserAccess([entitlement], '2027-11-15', undefined, subscriptionMap);

    const noActiveEntitlement = access.activeEntitlements.length === 0;
    const entitlementStateMatch = access.entitlements[0]?.accessState === 'read_only';
    const capabilitiesMatch = access.capabilities.accessState === 'read_only_annual';
    const statesAgree = entitlementStateMatch && capabilitiesMatch;

    const passed = noActiveEntitlement && statesAgree;

    if (passed) {
      passedTests++;
      console.log(`✓ Case (b) Oct 5, 2026 one-time annual, 2027-11-15: NOT extended, read_only entitlement + read_only_annual capabilities`);
    } else {
      failedTests++;
      console.log(`✗ Case (b) Oct 5, 2026 one-time annual, 2027-11-15: FAILED`);
    }
    console.log(`  activeEntitlements.length: ${access.activeEntitlements.length} (expected: 0) ${noActiveEntitlement ? '✓' : '✗'}`);
    console.log(`  entitlements[0].accessState: ${access.entitlements[0]?.accessState ?? 'none'} (expected: read_only) ${entitlementStateMatch ? '✓' : '✗'}`);
    console.log(`  capabilities.accessState: ${access.capabilities.accessState} (expected: read_only_annual) ${capabilitiesMatch ? '✓' : '✗'}`);
    console.log();
  }

  // Case (c): Mar 10, 2027 yearly-sub buyer, cancelled (ends 2028-03-10)
  // On 2028-03-11: should NOT be active (no extension for March end date)
  {
    totalTests++;
    const entitlement: ProductEntitlementRecord = {
      id: 'test-3',
      user_id: 'test-user',
      source: 'stripe',
      source_order_id: 'order-mar-sub',
      product_tier: 'planner_annual',
      planner_year: 2027,
      oracle_enabled: true,
      starts_at: '2027-03-10',
      ends_at: '2028-03-10',
      status: 'active',
      created_at: '2027-03-10T00:00:00Z',
      access_plan: 'yearly',
    };

    const subscriptionMap = new Map([['order-mar-sub', true]]);
    const access = resolveUserAccess([entitlement], '2028-03-11', undefined, subscriptionMap);

    const noActiveEntitlement = access.activeEntitlements.length === 0;
    const entitlementStateMatch = access.entitlements[0]?.accessState === 'read_only';
    const capabilitiesMatch = access.capabilities.accessState === 'read_only_annual';
    const statesAgree = entitlementStateMatch && capabilitiesMatch;

    const passed = noActiveEntitlement && statesAgree;

    if (passed) {
      passedTests++;
      console.log(`✓ Case (c) Mar 10, 2027 yearly-sub, 2028-03-11: NOT active (no extension), read_only entitlement + read_only_annual capabilities`);
    } else {
      failedTests++;
      console.log(`✗ Case (c) Mar 10, 2027 yearly-sub, 2028-03-11: FAILED`);
    }
    console.log(`  activeEntitlements.length: ${access.activeEntitlements.length} (expected: 0) ${noActiveEntitlement ? '✓' : '✗'}`);
    console.log(`  entitlements[0].accessState: ${access.entitlements[0]?.accessState ?? 'none'} (expected: read_only) ${entitlementStateMatch ? '✓' : '✗'}`);
    console.log(`  capabilities.accessState: ${access.capabilities.accessState} (expected: read_only_annual) ${capabilitiesMatch ? '✓' : '✗'}`);
    console.log();
  }

  console.log(`${'='.repeat(80)}`);
  console.log(`USER ACCESS INTEGRATION TESTS SUMMARY: ${passedTests}/${totalTests} tests passed`);
  if (failedTests > 0) {
    console.log(`${failedTests} tests FAILED`);
  }
  console.log(`${'='.repeat(80)}`);
  console.log();

  if (failedTests > 0) {
    process.exit(1);
  }
}

async function main() {
  runTests();
  runEntitlementStateTests();
  await runUserAccessIntegrationTests();
}

main();

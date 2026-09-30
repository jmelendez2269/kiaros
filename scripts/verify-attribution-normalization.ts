import { parseFunnelAttribution } from "../lib/analytics/attribution.ts";
import {
  captureCheckoutFunnelContext,
  validateCheckoutFunnelContext,
} from "../lib/analytics/checkout-context.ts";

interface TestCase {
  name: string;
  utmSource: string;
  utmMedium: string;
  expectedSource: string | null;
  expectedMedium: string | null;
}

const testCases: TestCase[] = [
  {
    name: "Plus signs decode to spaces (instagram+story)",
    utmSource: "instagram+story",
    utmMedium: "social+media",
    expectedSource: "instagram_story",
    expectedMedium: "social_media",
  },
  {
    name: "Mixed case with spaces (Instagram Story)",
    utmSource: "Instagram Story",
    utmMedium: "Social Media",
    expectedSource: "instagram_story",
    expectedMedium: "social_media",
  },
  {
    name: "Space in middle (tik tok)",
    utmSource: "tik tok",
    utmMedium: "paid ads",
    expectedSource: "tik_tok",
    expectedMedium: "paid_ads",
  },
  {
    name: "Normal value without spaces (instagram)",
    utmSource: "instagram",
    utmMedium: "social",
    expectedSource: "instagram",
    expectedMedium: "social",
  },
  {
    name: "All invalid characters",
    utmSource: "!!!invalid!!!",
    utmMedium: "@@@invalid@@@",
    expectedSource: null,
    expectedMedium: null,
  },
  {
    name: "Leading/trailing spaces",
    utmSource: "  instagram  ",
    utmMedium: "  social  ",
    expectedSource: "instagram",
    expectedMedium: "social",
  },
  {
    name: "Multiple spaces collapse to single underscore",
    utmSource: "instagram    story",
    utmMedium: "social    media",
    expectedSource: "instagram_story",
    expectedMedium: "social_media",
  },
  {
    name: "Mixed valid and invalid characters",
    utmSource: "instagram!story",
    utmMedium: "social@media",
    expectedSource: null,
    expectedMedium: null,
  },
];

function testParseFunnelAttribution(): boolean {
  console.log("\n=== Testing parseFunnelAttribution ===\n");
  let allPassed = true;

  for (const testCase of testCases) {
    const url = new URL(`https://example.com?utm_source=${testCase.utmSource.replace(/ /g, "+")}&utm_medium=${testCase.utmMedium.replace(/ /g, "+")}`);
    const result = parseFunnelAttribution(url);

    const sourcePassed = result.source === testCase.expectedSource;
    const mediumPassed = result.medium === testCase.expectedMedium;
    const passed = sourcePassed && mediumPassed;

    if (!passed) {
      allPassed = false;
      console.log(`❌ FAILED: ${testCase.name}`);
      if (!sourcePassed) {
        console.log(`   Source: expected ${JSON.stringify(testCase.expectedSource)}, got ${JSON.stringify(result.source)}`);
      }
      if (!mediumPassed) {
        console.log(`   Medium: expected ${JSON.stringify(testCase.expectedMedium)}, got ${JSON.stringify(result.medium)}`);
      }
    } else {
      console.log(`✅ PASSED: ${testCase.name}`);
      console.log(`   Source: ${JSON.stringify(result.source)}, Medium: ${JSON.stringify(result.medium)}`);
    }
  }

  return allPassed;
}

function testCheckoutFunnelContextValidation(): boolean {
  console.log("\n=== Testing validateCheckoutFunnelContext ===\n");
  let allPassed = true;

  for (const testCase of testCases) {
    const context = {
      anonymous_id: "00000000-0000-4000-8000-000000000000",
      session_id: "11111111-1111-4111-8111-111111111111",
      source: testCase.expectedSource,
      medium: testCase.expectedMedium,
      campaign: null,
      referrer_host: null,
      entry_path: null,
      experiment_key: null,
      experiment_variant: null,
    };

    const result = validateCheckoutFunnelContext(context);

    if (!result.success) {
      allPassed = false;
      console.log(`❌ FAILED: ${testCase.name} - validation should succeed with valid IDs`);
      console.log(`   Error: ${result.error}`);
    } else {
      const sourceMatches = result.context.source === testCase.expectedSource;
      const mediumMatches = result.context.medium === testCase.expectedMedium;
      if (!sourceMatches || !mediumMatches) {
        allPassed = false;
        console.log(`❌ FAILED: ${testCase.name} - attribution mismatch`);
        if (!sourceMatches) {
          console.log(`   Source: expected ${JSON.stringify(testCase.expectedSource)}, got ${JSON.stringify(result.context.source)}`);
        }
        if (!mediumMatches) {
          console.log(`   Medium: expected ${JSON.stringify(testCase.expectedMedium)}, got ${JSON.stringify(result.context.medium)}`);
        }
      } else {
        console.log(`✅ PASSED: ${testCase.name}`);
      }
    }
  }

  return allPassed;
}

function testStoredContextNormalization(): boolean {
  console.log("\n=== Testing stored context normalization ===\n");
  let allPassed = true;

  const storage = new Map<string, string>();
  const mockStorage = {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => storage.set(key, value),
  };

  for (const testCase of testCases) {
    if (testCase.expectedSource === null && testCase.expectedMedium === null) {
      continue;
    }

    const storedSource = testCase.utmSource.replace(/\+/g, " ").toLowerCase();
    const storedMedium = testCase.utmMedium.replace(/\+/g, " ").toLowerCase();

    const storedContext = {
      version: 1,
      session_started_at: new Date().toISOString(),
      context: {
        anonymous_id: "00000000-0000-4000-8000-000000000000",
        session_id: "11111111-1111-4111-8111-111111111111",
        source: storedSource,
        medium: storedMedium,
        campaign: null,
        referrer_host: null,
        entry_path: null,
        experiment_key: null,
        experiment_variant: null,
      },
    };

    storage.set("kiaros_funnel_context:v1", JSON.stringify(storedContext));

    const result = captureCheckoutFunnelContext({
      entryUrl: "https://example.com/checkout",
      storage: mockStorage,
      createId: () => "22222222-2222-4222-8222-222222222222",
    });

    const anonymousIdPreserved = result.anonymous_id === "00000000-0000-4000-8000-000000000000";
    const sourceMatches = result.source === testCase.expectedSource;
    const mediumMatches = result.medium === testCase.expectedMedium;
    const passed = anonymousIdPreserved && sourceMatches && mediumMatches;

    if (!passed) {
      allPassed = false;
      console.log(`❌ FAILED: ${testCase.name}`);
      console.log(`   Stored source: ${JSON.stringify(storedSource)}, medium: ${JSON.stringify(storedMedium)}`);
      if (!anonymousIdPreserved) {
        console.log(`   Anonymous ID lost: got ${result.anonymous_id}`);
      }
      if (!sourceMatches) {
        console.log(`   Source: expected ${JSON.stringify(testCase.expectedSource)}, got ${JSON.stringify(result.source)}`);
      }
      if (!mediumMatches) {
        console.log(`   Medium: expected ${JSON.stringify(testCase.expectedMedium)}, got ${JSON.stringify(result.medium)}`);
      }
    } else {
      console.log(`✅ PASSED: ${testCase.name} - anonymous_id preserved, source/medium normalized`);
    }

    storage.clear();
  }

  return allPassed;
}

function main(): void {
  console.log("Attribution Normalization Verification");
  console.log("======================================");

  const test1Passed = testParseFunnelAttribution();
  const test2Passed = testCheckoutFunnelContextValidation();
  const test3Passed = testStoredContextNormalization();

  console.log("\n=== Summary ===\n");
  console.log(`parseFunnelAttribution: ${test1Passed ? "✅ PASSED" : "❌ FAILED"}`);
  console.log(`validateCheckoutFunnelContext: ${test2Passed ? "✅ PASSED" : "❌ FAILED"}`);
  console.log(`Stored context normalization: ${test3Passed ? "✅ PASSED" : "❌ FAILED"}`);

  if (test1Passed && test2Passed && test3Passed) {
    console.log("\n✅ All tests passed!");
    process.exit(0);
  } else {
    console.log("\n❌ Some tests failed!");
    process.exit(1);
  }
}

main();

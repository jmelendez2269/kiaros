import { validateCheckoutFunnelContext } from "../lib/analytics/checkout-context";

interface TestCase {
  name: string;
  input: unknown;
  expectSuccess: boolean;
  expectContent?: string | null;
}

const testCases: TestCase[] = [
  {
    name: "Valid context with all UTM parameters including content",
    input: {
      anonymous_id: "123e4567-e89b-12d3-a456-426614174000",
      session_id: "223e4567-e89b-12d3-a456-426614174000",
      source: "newsletter",
      medium: "email",
      campaign: "spring_launch",
      content: "header_cta",
    },
    expectSuccess: true,
    expectContent: "header_cta",
  },
  {
    name: "Valid context with content null",
    input: {
      anonymous_id: "123e4567-e89b-12d3-a456-426614174000",
      session_id: "223e4567-e89b-12d3-a456-426614174000",
      source: "google",
      medium: "cpc",
      campaign: "brand_search",
      content: null,
    },
    expectSuccess: true,
    expectContent: null,
  },
  {
    name: "Valid context with no content key",
    input: {
      anonymous_id: "123e4567-e89b-12d3-a456-426614174000",
      session_id: "223e4567-e89b-12d3-a456-426614174000",
      source: "facebook",
      medium: "social",
      campaign: "awareness",
    },
    expectSuccess: true,
    expectContent: null,
  },
  {
    name: "Valid context with content = 12345 (number should be rejected, normalized to null)",
    input: {
      anonymous_id: "123e4567-e89b-12d3-a456-426614174000",
      session_id: "223e4567-e89b-12d3-a456-426614174000",
      source: "twitter",
      medium: "social",
      campaign: "launch",
      content: 12345,
    },
    expectSuccess: true,
    expectContent: null,
  },
];

function runTests() {
  console.log("Running checkout context validation tests...\n");

  let passed = 0;
  let failed = 0;

  for (const testCase of testCases) {
    const result = validateCheckoutFunnelContext(testCase.input);

    if (result.success !== testCase.expectSuccess) {
      console.error(`❌ FAIL: ${testCase.name}`);
      console.error(`   Expected success=${testCase.expectSuccess}, got success=${result.success}`);
      if (!result.success) {
        console.error(`   Error: ${result.error}`);
      }
      failed++;
      continue;
    }

    if (result.success && testCase.expectContent !== undefined) {
      if (result.context.content !== testCase.expectContent) {
        console.error(`❌ FAIL: ${testCase.name}`);
        console.error(`   Expected content=${JSON.stringify(testCase.expectContent)}, got content=${JSON.stringify(result.context.content)}`);
        failed++;
        continue;
      }
    }

    console.log(`✅ PASS: ${testCase.name}`);
    if (result.success && testCase.expectContent !== undefined) {
      console.log(`   content=${JSON.stringify(result.context.content)}`);
    }
    passed++;
  }

  console.log(`\n${"=".repeat(60)}`);
  console.log(`Test Results: ${passed} passed, ${failed} failed`);
  console.log(`${"=".repeat(60)}`);

  if (failed > 0) {
    process.exit(1);
  }
}

runTests();

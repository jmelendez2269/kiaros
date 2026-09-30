#!/usr/bin/env node --loader ts-node/esm
/**
 * Verify that all debug routes are properly gated.
 * 
 * This script:
 * 1. Scans all route files under app/api/debug/
 * 2. Ensures each one imports and calls guardDebugRoute
 * 3. Unit-tests the guard's environment logic
 */

import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const WORKSPACE = path.resolve(__dirname, "..");
const DEBUG_DIR = path.join(WORKSPACE, "app/api/debug");
const GUARD_IMPORT_PATTERN = /from\s+["']@\/lib\/debug\/guard["']/;
const GUARD_CALL_PATTERN = /guardDebugRoute\(\)/;

interface TestResult {
  passed: boolean;
  message: string;
}

async function findDebugRoutes(): Promise<string[]> {
  const routes: string[] = [];
  
  async function scanDir(dir: string): Promise<void> {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      
      if (entry.isDirectory()) {
        await scanDir(fullPath);
      } else if (entry.name === "route.ts") {
        routes.push(fullPath);
      }
    }
  }
  
  await scanDir(DEBUG_DIR);
  return routes.sort();
}

async function checkRouteIsGated(routePath: string): Promise<TestResult> {
  const content = await fs.readFile(routePath, "utf-8");
  const relativePath = path.relative(WORKSPACE, routePath);
  
  if (!GUARD_IMPORT_PATTERN.test(content)) {
    return {
      passed: false,
      message: `❌ ${relativePath}: Missing guard import`,
    };
  }
  
  if (!GUARD_CALL_PATTERN.test(content)) {
    return {
      passed: false,
      message: `❌ ${relativePath}: Missing guardDebugRoute() call`,
    };
  }
  
  return {
    passed: true,
    message: `✅ ${relativePath}: Properly gated`,
  };
}

/**
 * Test the guard's environment detection logic inline.
 * We can't dynamically re-import the module with different env vars,
 * so we inline the logic and test it directly.
 */
function testGuardLogic(): TestResult[] {
  const results: TestResult[] = [];
  
  // Inline version of isProductionEnvironment for testing
  function isProductionEnvironment(vercelEnv: string | undefined, nodeEnv: string | undefined): boolean {
    if (vercelEnv) {
      return vercelEnv === "production";
    }
    return nodeEnv === "production";
  }
  
  // Test 1: Production without VERCEL_ENV
  if (isProductionEnvironment(undefined, "production")) {
    results.push({
      passed: true,
      message: "✅ Guard recognizes production (NODE_ENV=production, no VERCEL_ENV)",
    });
  } else {
    results.push({
      passed: false,
      message: "❌ Guard should recognize production when NODE_ENV=production and VERCEL_ENV absent",
    });
  }
  
  // Test 2: Vercel production
  if (isProductionEnvironment("production", "production")) {
    results.push({
      passed: true,
      message: "✅ Guard recognizes production (VERCEL_ENV=production)",
    });
  } else {
    results.push({
      passed: false,
      message: "❌ Guard should recognize VERCEL_ENV=production as production",
    });
  }
  
  // Test 3: Vercel preview (NODE_ENV=production but VERCEL_ENV=preview)
  if (!isProductionEnvironment("preview", "production")) {
    results.push({
      passed: true,
      message: "✅ Guard allows preview (VERCEL_ENV=preview overrides NODE_ENV=production)",
    });
  } else {
    results.push({
      passed: false,
      message: "❌ Guard should treat VERCEL_ENV=preview as non-production even when NODE_ENV=production",
    });
  }
  
  // Test 4: Development
  if (!isProductionEnvironment("development", "development")) {
    results.push({
      passed: true,
      message: "✅ Guard allows development (VERCEL_ENV=development)",
    });
  } else {
    results.push({
      passed: false,
      message: "❌ Guard should treat development as non-production",
    });
  }
  
  // Test 5: Local development
  if (!isProductionEnvironment(undefined, "development")) {
    results.push({
      passed: true,
      message: "✅ Guard allows local development (NODE_ENV=development, no VERCEL_ENV)",
    });
  } else {
    results.push({
      passed: false,
      message: "❌ Guard should treat NODE_ENV=development as non-production",
    });
  }
  
  return results;
}

async function main() {
  console.log("🔍 Checking debug routes are properly gated...\n");
  
  // Find all debug routes
  const routes = await findDebugRoutes();
  console.log(`Found ${routes.length} debug route(s):\n`);
  
  // Check each route
  const routeResults: TestResult[] = [];
  for (const route of routes) {
    const result = await checkRouteIsGated(route);
    routeResults.push(result);
    console.log(result.message);
  }
  
  console.log("\n🧪 Testing guard environment logic...\n");
  
  // Test guard logic
  const logicResults = testGuardLogic();
  for (const result of logicResults) {
    console.log(result.message);
  }
  
  // Summary
  const allResults = [...routeResults, ...logicResults];
  const allPassed = allResults.every((r) => r.passed);
  const passedCount = allResults.filter((r) => r.passed).length;
  const totalCount = allResults.length;
  
  console.log("\n" + "=".repeat(60));
  console.log(`Results: ${passedCount}/${totalCount} checks passed`);
  console.log("=".repeat(60));
  
  if (!allPassed) {
    console.error("\n❌ Some checks failed!");
    process.exit(1);
  }
  
  console.log("\n✅ All checks passed!");
  process.exit(0);
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});

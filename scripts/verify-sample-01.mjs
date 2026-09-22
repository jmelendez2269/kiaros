#!/usr/bin/env node

/**
 * SAMPLE-01 Verification Script
 * 
 * Verifies the Stelloquy Sampler product implementation without needing
 * to run against live Stripe or Supabase.
 * 
 * Run: node scripts/verify-sample-01.mjs
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

console.log('SAMPLE-01 Verification\n');
console.log('='.repeat(80));

let passed = 0;
let failed = 0;

function check(description, assertion) {
  try {
    if (assertion()) {
      console.log(`✓ ${description}`);
      passed++;
    } else {
      console.log(`✗ ${description}`);
      failed++;
    }
  } catch (error) {
    console.log(`✗ ${description}`);
    console.log(`  Error: ${error.message}`);
    failed++;
  }
}

// 1. Verify catalog includes sampler
console.log('\n1. Stripe Catalog');
console.log('-'.repeat(80));

const catalogPath = join(rootDir, 'scripts', 'sync-stripe-catalog.mjs');
const catalogSource = readFileSync(catalogPath, 'utf8');

check('Catalog includes stelloquy_sampler product', () => {
  return catalogSource.includes('stelloquy_sampler');
});

check('Sampler product has correct name', () => {
  return catalogSource.includes('Stelloquy Sampler');
});

check('Sampler price is $1 (100 cents)', () => {
  const samplerBlock = catalogSource.match(/key:\s*["']stelloquy_sampler["'][\s\S]{0,800}/);
  return samplerBlock && samplerBlock[0].includes('amount: 100');
});

check('Sampler is one-time (no recurring interval)', () => {
  const samplerBlock = catalogSource.match(/key:\s*["']stelloquy_sampler["'][\s\S]{0,500}prices:\s*\[[\s\S]{0,200}\]/);
  return samplerBlock && !samplerBlock[0].includes('recurring');
});

// 2. Verify migration structure
console.log('\n2. Database Migration');
console.log('-'.repeat(80));

const migrationPath = join(rootDir, 'supabase', 'migrations', '0048_stelloquy_sampler_purchases.sql');
const migration = readFileSync(migrationPath, 'utf8');

check('Migration creates stelloquy_sampler_purchases table', () => {
  return migration.includes('CREATE TABLE stelloquy_sampler_purchases');
});

check('Table has stripe_checkout_session_id unique constraint', () => {
  return migration.includes('stripe_checkout_session_id TEXT NOT NULL UNIQUE');
});

check('Table has credits_granted and credits_remaining columns', () => {
  return migration.includes('credits_granted') && migration.includes('credits_remaining');
});

check('Table has status check constraint', () => {
  return migration.includes("CHECK (status IN ('active','exhausted','refunded'))");
});

check('One-per-account unique index exists', () => {
  return migration.includes('idx_stelloquy_sampler_one_per_user') &&
         migration.includes("WHERE status IN ('active', 'exhausted')");
});

check('RLS is enabled', () => {
  return migration.includes('ALTER TABLE stelloquy_sampler_purchases ENABLE ROW LEVEL SECURITY');
});

// 3. Verify commerce config
console.log('\n3. Commerce Config');
console.log('-'.repeat(80));

const configPath = join(rootDir, 'lib', 'commerce', 'config.ts');
const config = readFileSync(configPath, 'utf8');

check('ProductKind type includes stelloquy_sampler', () => {
  return config.includes("ProductKind = CommerceTierKey | \"stelloquy_sampler\"");
});

check('parseProductKind function exists', () => {
  return config.includes('export function parseProductKind');
});

check('isCommerceTierKey type guard exists', () => {
  return config.includes('export function isCommerceTierKey');
});

check('Original CommerceTierKey unchanged', () => {
  return config.includes('CommerceTierKey = "planner" | "planner_oracle"');
});

// 4. Verify fulfillment branching
console.log('\n4. Stripe Fulfillment');
console.log('-'.repeat(80));

const stripePath = join(rootDir, 'lib', 'commerce', 'stripe.ts');
const stripeCode = readFileSync(stripePath, 'utf8');

check('fulfillSamplerCheckout function exists', () => {
  return stripeCode.includes('async function fulfillSamplerCheckout');
});

check('Sampler fulfillment validates product_tier metadata', () => {
  return stripeCode.includes('productKind !== "stelloquy_sampler"');
});

check('Sampler fulfillment enforces one-per-account', () => {
  const hasErrorMessage = stripeCode.includes('already purchased a Stelloquy Sampler');
  const hasStatusCheck = stripeCode.includes('"active", "exhausted"');
  const hasFromTable = stripeCode.includes('.from("stelloquy_sampler_purchases")');
  return hasErrorMessage && hasStatusCheck && hasFromTable;
});

check('Sampler fulfillment upserts to stelloquy_sampler_purchases', () => {
  const hasFromTable = stripeCode.includes('.from("stelloquy_sampler_purchases")');
  const hasUpsert = stripeCode.includes('upsert(purchasePayload');
  const hasOnConflict = stripeCode.includes('onConflict: "stripe_checkout_session_id"');
  return hasFromTable && hasUpsert && hasOnConflict;
});

check('Sampler fulfillment does NOT create product_entitlements', () => {
  const samplerFnStart = stripeCode.indexOf('async function fulfillSamplerCheckout');
  const samplerFnEnd = stripeCode.indexOf('\nasync function fulfillOneTimeCheckout');
  const samplerFnBody = stripeCode.slice(samplerFnStart, samplerFnEnd);
  return !samplerFnBody.includes('product_entitlements');
});

check('Main fulfillCheckoutSession branches on product kind', () => {
  return stripeCode.includes('parseProductKind(session.metadata?.product_tier)') &&
         stripeCode.includes('if (productKind === "stelloquy_sampler")');
});

check('createSamplerCheckoutSession function exists', () => {
  return stripeCode.includes('export async function createSamplerCheckoutSession');
});

check('Sampler checkout metadata includes product_tier and credits', () => {
  const samplerCheckoutStart = stripeCode.indexOf('export async function createSamplerCheckoutSession');
  const nextFunctionStart = stripeCode.indexOf('\nasync function fulfillSamplerCheckout', samplerCheckoutStart);
  const samplerCheckoutBody = stripeCode.slice(samplerCheckoutStart, nextFunctionStart);
  return samplerCheckoutBody.includes('product_tier: "stelloquy_sampler"') &&
         samplerCheckoutBody.includes('credits_granted');
});

// 5. Verify capabilities integration
console.log('\n5. Capabilities Integration');
console.log('-'.repeat(80));

const entitlementsPath = join(rootDir, 'lib', 'commerce', 'entitlements.ts');
const entitlements = readFileSync(entitlementsPath, 'utf8');

check('resolveUserAccess accepts samplerCredits parameter', () => {
  return entitlements.includes('samplerCredits?: number');
});

check('loadSamplerCredits helper exists', () => {
  return entitlements.includes('export async function loadSamplerCredits');
});

check('samplerCredits passed through to resolveAccessCapabilities', () => {
  return entitlements.includes('samplerCredits,') &&
         entitlements.includes('resolveAccessCapabilities');
});

// 6. Verify success page handling
console.log('\n6. Purchase Success Page');
console.log('-'.repeat(80));

const successPath = join(rootDir, 'app', 'purchase', 'success', 'page.tsx');
const success = readFileSync(successPath, 'utf8');

check('Success page handles null tier/accessPlan for sampler', () => {
  return success.includes('if (!result.tier || !result.accessPlan)');
});

check('Sampler success message mentions three conversations', () => {
  return success.includes('three Stelloquy conversations');
});

check('Sampler CTAs include /oracle and /pricing', () => {
  const samplerBlock = success.match(/if \(!result\.tier[\s\S]{0,1500}div>/);
  return samplerBlock && 
         samplerBlock[0].includes('href="/oracle"') &&
         samplerBlock[0].includes('href="/pricing"');
});

// 7. Verify roadmap tracker update
console.log('\n7. Roadmap Tracker');
console.log('-'.repeat(80));

const roadmapPath = join(rootDir, 'docs', 'planning', 'access-memory-commerce-roadmap.md');
const roadmap = readFileSync(roadmapPath, 'utf8');

check('SAMPLE-01 status updated from blocked', () => {
  return !roadmap.match(/\| SAMPLE-01[^\n]*\| blocked \|/);
});

check('SAMPLE-01 has evidence of completion', () => {
  const sample01Line = roadmap.match(/\| SAMPLE-01[^\n]*\|/);
  return sample01Line && sample01Line[0].includes('migration 0048');
});

// Summary
console.log('\n' + '='.repeat(80));
console.log(`\nResults: ${passed} passed, ${failed} failed`);

if (failed === 0) {
  console.log('\n✓ All SAMPLE-01 verification checks passed!');
  console.log('\nKey behaviors verified:');
  console.log('  • Catalog includes sampler product ($1, one-time)');
  console.log('  • Migration creates dedicated sampler_purchases table');
  console.log('  • Fulfillment branches on product kind');
  console.log('  • Sampler does NOT create product_entitlements');
  console.log('  • One-per-account enforced');
  console.log('  • Capabilities integration ready');
  console.log('  • Success page handles sampler flow');
  process.exit(0);
} else {
  console.log('\n✗ Some verification checks failed.');
  process.exit(1);
}

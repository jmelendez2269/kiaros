import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, extname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const artifactRoot = resolve(repositoryRoot, "lib/artifacts");
const generatorRoot = resolve(artifactRoot, "anchor-print");
const fulfillmentRoot = resolve(artifactRoot, "fulfillment");
const violations = [];

function walk(directory) {
  const files = [];
  for (const entry of readdirSync(directory)) {
    const path = resolve(directory, entry);
    if (statSync(path).isDirectory()) files.push(...walk(path));
    else if ([".ts", ".tsx", ".mjs", ".mts"].includes(extname(path))) files.push(path);
  }
  return files;
}

function requirePattern(path, source, pattern, message) {
  if (!pattern.test(source)) violations.push(`${path}: ${message}`);
}

function forbidPattern(path, source, pattern, message) {
  if (pattern.test(source)) violations.push(`${path}: ${message}`);
}

if (!existsSync(artifactRoot)) {
  violations.push("lib/artifacts: missing isolated artifact package");
} else {
  const files = walk(artifactRoot);
  if (files.length === 0) violations.push("lib/artifacts: no implementation files found");

  for (const absolutePath of files) {
    const path = relative(repositoryRoot, absolutePath).replaceAll("\\", "/");
    const source = readFileSync(absolutePath, "utf8");
    forbidPattern(
      path,
      source,
      /(?:from|import\s*\()\s*["'][^"']*(?:commerce|supabase|analytics|email)[^"']*["']/i,
      "artifact package must not import commerce, Supabase, analytics, or email modules",
    );
    forbidPattern(
      path,
      source,
      /\b(?:product_entitlements|marketplace_orders|activation_claims|loyalty_rewards|direct_purchase_orders)\b/i,
      "artifact package must not reference legacy commerce tables",
    );
  }

  for (const absolutePath of walk(generatorRoot)) {
    const path = relative(repositoryRoot, absolutePath).replaceAll("\\", "/");
    const source = readFileSync(absolutePath, "utf8");
    forbidPattern(
      path,
      source,
      /\b(?:fetch\s*\(|createClient\s*\(|process\.env|Date\.now\s*\(|Math\.random\s*\(|randomUUID\s*\(|resend\.|stripe\.)/,
      "artifact generation must remain pure, deterministic, and external-I/O-free",
    );
  }
}

if (!existsSync(fulfillmentRoot)) {
  violations.push("lib/artifacts/fulfillment: missing isolated fulfillment package");
} else {
  const fulfillmentFiles = walk(fulfillmentRoot);
  for (const absolutePath of fulfillmentFiles) {
    const path = relative(repositoryRoot, absolutePath).replaceAll("\\", "/");
    const source = readFileSync(absolutePath, "utf8");
    forbidPattern(
      path,
      source,
      /\b(?:product_entitlements|marketplace_orders|activation_claims|loyalty_rewards|direct_purchase_orders)\b/i,
      "artifact fulfillment must remain isolated from legacy commerce tables",
    );
    forbidPattern(
      path,
      source,
      /\b(?:etsy\.com|openapi\.etsy|api\.etsy|stripe\.|resend\.)/i,
      "local artifact fulfillment must not call Etsy, Stripe, or email services",
    );
  }

  const availabilityPath = "lib/artifacts/fulfillment/availability.ts";
  const availability = readFileSync(resolve(repositoryRoot, availabilityPath), "utf8");
  requirePattern(
    availabilityPath,
    availability,
    /process\.env\.NODE_ENV\s*!==\s*["']production["']/,
    "local workflow must fail closed in production",
  );
  requirePattern(
    availabilityPath,
    availability,
    /isEtsyArtifactAdminEnabled\(\)/,
    "local workflow must require the server-controlled flag",
  );
}

const contractPath = "lib/artifacts/anchor-print/contract.ts";
const contract = readFileSync(resolve(repositoryRoot, contractPath), "utf8");
requirePattern(contractPath, contract, /createsKairosAccount:\s*false;/, "account creation must be impossible by contract");
requirePattern(contractPath, contract, /createsProductEntitlement:\s*false;/, "entitlement creation must be impossible by contract");
requirePattern(contractPath, contract, /subscribesToMarketing:\s*false;/, "marketing subscription must be impossible by contract");
requirePattern(contractPath, contract, /requiresOffMarketplacePurchase:\s*false;/, "off-marketplace purchase must be impossible by contract");
requirePattern(contractPath, contract, /publicConformanceClaimAllowed:\s*false;/, "unverified PDF\/UA claims must be forbidden");

const templatePath = "lib/artifacts/anchor-print/template.ts";
const template = readFileSync(resolve(repositoryRoot, templatePath), "utf8");
forbidPattern(templatePath, template, /https?:\/\/|mailto:|<a\b/i, "delivered template must not contain external links");
forbidPattern(templatePath, template, /\bQR\s*code\b|qrcode/i, "delivered template must not contain QR redirection");
requirePattern(templatePath, template, /<html lang=\"en\">/, "document language must be explicit");
requirePattern(templatePath, template, /role=\"img\" aria-labelledby=/, "chart SVG must have an accessible name and description");
requirePattern(templatePath, template, /<caption class=\"sr-only\">/, "chart must have a text-table equivalent");
requirePattern(templatePath, template, /minimumBodyPointSize:\s*11|font-size:\s*11pt/, "11pt body floor must remain represented");
forbidPattern(
  templatePath,
  template,
  /<title>[^\n]*(?:displayName|artifactId)/,
  "private display names and artifact identifiers must not enter PDF title metadata",
);
for (const [pattern, label] of [
  [/figcaption\s*\{[^}]*font-size:\s*11pt/, "chart description"],
  [/table\s*\{[^}]*font-size:\s*11pt/, "placement table"],
  [/\.aspect-list li\s*\{[^}]*font-size:\s*11pt/, "aspect list"],
  [/\.uncertainty-note\s*\{[^}]*font-size:\s*11pt/, "uncertainty notice"],
  [/\.anchor-card p\s*\{[^}]*font-size:\s*11pt/, "anchor narrative"],
  [/\.reflection-panel li\s*\{[^}]*font:\s*11pt\//, "reflection prompts"],
  [/\.disclosure-footer\s*\{[^}]*font-size:\s*11pt/, "disclosures"],
]) {
  requirePattern(templatePath, template, pattern, `${label} must preserve the approved 11pt meaningful-text floor`);
}
requirePattern(templatePath, template, /color-only meaning|colorOnlyMeaningForbidden|stroke-dasharray/i, "chart semantics must not rely on color alone");

if (violations.length > 0) {
  console.error("Etsy artifact boundary check failed:\n");
  for (const violation of violations) console.error(`- ${violation}`);
  process.exitCode = 1;
} else {
  console.log(
    "Etsy artifact boundary check passed: deterministic generation, isolated local fulfillment, no legacy commerce writes, no external delivery calls, and accessible template contracts are present.",
  );
}

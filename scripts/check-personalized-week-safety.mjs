import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const violations = [];

const customerSurfaces = [
  "components/marketing/KairosHome.tsx",
  "app/preview/page.tsx",
  "app/(onboarding)/onboarding/generating-week/page.tsx",
  "app/(onboarding)/onboarding/_components/progress-bar.tsx",
];

function readRepositoryFile(relativePath) {
  const absolutePath = resolve(repositoryRoot, relativePath);
  if (!existsSync(absolutePath)) {
    violations.push(`${relativePath}: missing required personalized-week safety file`);
    return "";
  }
  return readFileSync(absolutePath, "utf8");
}

function requirePattern(relativePath, source, pattern, message) {
  if (!pattern.test(source)) violations.push(`${relativePath}: ${message}`);
}

function forbidPattern(relativePath, source, pattern, message) {
  if (pattern.test(source)) violations.push(`${relativePath}: ${message}`);
}

for (const relativePath of customerSurfaces) {
  const source = readRepositoryFile(relativePath);
  forbidPattern(
    relativePath,
    source,
    /\bfree\s+(?:personal\s+)?week\b|\bfor seven days\b|\bdays? remaining\b|\bpreview complete\b/i,
    "must not represent the dated reading as expiring access or a free product trial",
  );
}

const marketingPath = "components/marketing/KairosHome.tsx";
const marketing = readRepositoryFile(marketingPath);
requirePattern(
  marketingPath,
  marketing,
  /Personalized Birth-Chart Week Reading/,
  "must use the approved offer name",
);
requirePattern(
  marketingPath,
  marketing,
  /natal chart[\s\S]{0,180}current sky/i,
  "must state the reading's natal-chart and current-sky scope",
);
requirePattern(
  marketingPath,
  marketing,
  /does not include[\s\S]{0,260}Blueprint[\s\S]{0,260}Life Areas[\s\S]{0,260}Goals[\s\S]{0,260}journal[\s\S]{0,260}Stelloquy/i,
  "must name the major paid context and workflow omissions",
);
requirePattern(
  marketingPath,
  marketing,
  /stays in your account|keep it and return|yours to revisit/i,
  "must promise persistence without a countdown",
);

const previewPath = "app/preview/page.tsx";
const previewPage = readRepositoryFile(previewPath);
requirePattern(
  previewPath,
  previewPage,
  /Personalized Birth-Chart Week Reading/,
  "must use the approved offer name on the artifact",
);
requirePattern(
  previewPath,
  previewPage,
  /PersonalizedWeekAttribution/,
  "must preserve the reading-first entry path for downstream checkout attribution",
);
forbidPattern(
  previewPath,
  previewPage,
  /preview_access|expires_at|remainingDays|expiresAt/,
  "must not read or render the legacy seven-day access countdown",
);

const generationPath = "app/api/preview/week/generate/route.ts";
const generationRoute = readRepositoryFile(generationPath);
forbidPattern(
  generationPath,
  generationRoute,
  /preview_access|expires_at/,
  "new readings must not create an artificial access-expiry record",
);
requirePattern(
  generationPath,
  generationRoute,
  /if \(existing\)[\s\S]{0,180}return NextResponse\.json[\s\S]{0,300}\.insert\(/,
  "must return the existing artifact before any insert so generation remains one per profile",
);

const attributionPath = "components/analytics/PersonalizedWeekAttribution.tsx";
const attribution = readRepositoryFile(attributionPath);
requirePattern(
  attributionPath,
  attribution,
  /captureBrowserCheckoutFunnelContext/,
  "must use the same first-touch context consumed by checkout",
);
requirePattern(
  attributionPath,
  attribution,
  /event_name:\s*["']preview_viewed["']/,
  "must record the allowlisted reading-view event",
);
requirePattern(
  attributionPath,
  attribution,
  /product_tier:\s*["']personalized_week["']/,
  "must identify the limited reading without claiming planner access",
);

if (violations.length > 0) {
  console.error("Personalized-week safety check failed:\n");
  for (const violation of violations) console.error(`- ${violation}`);
  process.exitCode = 1;
} else {
  console.log(
    "Personalized-week safety check passed: approved name, explicit scope, persistent access, one-generation guard, and checkout attribution are present.",
  );
}

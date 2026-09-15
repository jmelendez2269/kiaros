import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const violations = [];

// These files contain the acquisition and lifecycle claims governed by ACCESS-04.
// Keep the inventory explicit: broad repository scans would confuse internal Stripe
// `trialing` state or the preserved legacy Etsy support path with customer-facing copy.
const paths = {
  pricingRoute: "app/pricing/page.tsx",
  pricing: "components/commerce/PublicPricingPage.tsx",
  home: "components/marketing/KairosHome.tsx",
  success: "app/purchase/success/page.tsx",
  settings: "app/(app)/settings/page.tsx",
  renewal: "app/(renewal)/renewing/page.tsx",
  paidOnboarding: "app/(onboarding)/onboarding/generating/page.tsx",
  limitedReadingOnboarding: "app/(onboarding)/onboarding/generating-week/page.tsx",
  emails: "lib/email/templates.ts",
};

const sources = new Map();

function readRepositoryFile(relativePath) {
  if (sources.has(relativePath)) return sources.get(relativePath);

  const absolutePath = resolve(repositoryRoot, relativePath);
  if (!existsSync(absolutePath)) {
    violations.push(`${relativePath}: missing required ACCESS-04 copy-inventory file`);
    sources.set(relativePath, "");
    return "";
  }

  const source = readFileSync(absolutePath, "utf8");
  sources.set(relativePath, source);
  return source;
}

function lineNumberAt(source, index) {
  return source.slice(0, index).split(/\r?\n/).length;
}

function requirePattern(relativePath, pattern, message) {
  const source = readRepositoryFile(relativePath);
  if (!pattern.test(source)) violations.push(`${relativePath}: ${message}`);
}

function requireAnyPattern(relativePath, patterns, message) {
  const source = readRepositoryFile(relativePath);
  if (!patterns.some((pattern) => pattern.test(source))) {
    violations.push(`${relativePath}: ${message}`);
  }
}

function reportMatches(relativePath, pattern, message, shouldIgnore = () => false) {
  const source = readRepositoryFile(relativePath);
  const flags = pattern.flags.includes("g") ? pattern.flags : `${pattern.flags}g`;
  const matcher = new RegExp(pattern.source, flags);

  for (const match of source.matchAll(matcher)) {
    const index = match.index ?? 0;
    if (shouldIgnore({ index, match, source })) continue;
    violations.push(
      `${relativePath}:${lineNumberAt(source, index)}: ${message}: ${JSON.stringify(match[0])}`,
    );
  }
}

const monthlyWindowPatterns = [
  // The two orderings allow natural copy such as either “monthly includes the
  // current week plus the next four” or “current week + next four on monthly.”
  /monthly[\s\S]{0,280}(?:current|this)\s+(?:Blueprint\s+)?week[\s\S]{0,180}(?:next|following)\s+four\s+(?:Blueprint\s+)?weeks/i,
  /(?:current|this)\s+(?:Blueprint\s+)?week[\s\S]{0,180}(?:next|following)\s+four\s+(?:Blueprint\s+)?weeks[\s\S]{0,280}monthly/i,
];

const annualBlueprintPatterns = [
  /annual[\s\S]{0,240}(?:full|complete)\s*,?\s+(?:canonical\s+)?(?:52[- ]week\s+|year(?:ly)?\s+)?Blueprint/i,
  /(?:full|complete)\s*,?\s+(?:canonical\s+)?(?:52[- ]week\s+|year(?:ly)?\s+)?Blueprint[\s\S]{0,240}annual/i,
];

// Public offer pages must state both sides of the cadence distinction. Requiring
// the affirmative contract is less error-prone than flagging every nearby use of
// “monthly,” “year,” or “Blueprint” in demonstrations and editorial copy.
for (const relativePath of [paths.pricing, paths.home]) {
  requireAnyPattern(
    relativePath,
    monthlyWindowPatterns,
    "must say active monthly access covers the current Blueprint week plus the next four weeks",
  );
  requireAnyPattern(
    relativePath,
    annualBlueprintPatterns,
    "must distinguish annual access as the full canonical Blueprint",
  );
}

// The success page branches on the purchased cadence, so each branch must tell
// the new customer what was actually unlocked rather than saying generic access.
requirePattern(
  paths.success,
  /accessPlan\s*===\s*["']monthly["'][\s\S]{0,420}(?:current|this)\s+(?:Blueprint\s+)?week[\s\S]{0,180}(?:next|following)\s+four\s+(?:Blueprint\s+)?weeks/i,
  "monthly success copy must name the current-week-plus-next-four Blueprint window",
);
requireAnyPattern(
  paths.success,
  annualBlueprintPatterns,
  "annual success copy must say it unlocks the full canonical Blueprint",
);

// Direct monthly/full-year promises are forbidden. The verb requirement keeps
// this narrow: a contrast such as “monthly window; annual full Blueprint” passes,
// while “monthly unlocks the full year” fails. The tempered monthly-to-verb span
// stops at “annual,” so the annual verb in an explicit contrast is not attributed
// to monthly; a monthly promise remains caught even if annual is mentioned later.
const directMonthlyFullPromise =
  /monthly(?:(?!\bannual\b)[^.!?\n]){0,120}(?:includes?|unlocks?|opens?|reveals?|provides?|receives?|gets?|gives?|grants?)[^.!?\n]{0,100}(?:all\s+52\s+weeks|(?:the\s+)?(?:full|complete)\s+(?:year(?:-long)?|(?:canonical\s+)?Blueprint))/i;
for (const relativePath of Object.values(paths)) {
  reportMatches(
    relativePath,
    directMonthlyFullPromise,
    "monthly must not promise the full-year/canonical Blueprint",
  );
}

// Cancellation may end paid creation/generation, but customer-authored journal
// history remains readable and exportable. The two orderings permit ordinary
// prose while still requiring all parts of the approved lifecycle contract.
requireAnyPattern(
  paths.settings,
  [
    /(?:cancel\w*|paid access (?:ends?|expires?)|subscription (?:ends?|expires?)|access lapses?)[\s\S]{0,520}journal[\s\S]{0,220}(?:read|revisit|remain)[\s\S]{0,220}export/i,
    /journal[\s\S]{0,220}(?:read|revisit|remain)[\s\S]{0,220}export[\s\S]{0,520}(?:cancel\w*|paid access (?:ends?|expires?)|subscription (?:ends?|expires?)|access lapses?)/i,
  ],
  "billing copy must say customer-authored journal history remains readable and exportable after cancellation/access end",
);
requireAnyPattern(
  paths.settings,
  [
    /(?:new|paid)[\s\S]{0,120}(?:generation|generated content|content creation|planner work)[\s\S]{0,180}(?:requires? active|requires? an active|stops?|ends?|no longer available)/i,
    /(?:requires? active|requires? an active)[\s\S]{0,180}(?:new|paid)[\s\S]{0,120}(?:generation|generated content|content creation|planner work)/i,
    /(?:cancel\w*|paid access ends?|subscription ends?|access lapses?)[\s\S]{0,260}(?:cannot|can['’]t|no longer)[\s\S]{0,160}(?:create|generate)/i,
  ],
  "billing copy must distinguish retained journal history from paid creation/generation that requires active access",
);

// Only flag affirmative deletion/loss promises. Negated reassurance such as
// “your journal is not deleted” is deliberately outside these narrow patterns.
const journalDeletionClaims = [
  /(?:cancel\w*|paid access ends?|subscription ends?)[^.!?]{0,220}(?:journal|entries?)[^.!?]{0,80}(?:will be|are|gets?|becomes?)\s+(?:deleted|removed|erased)/i,
  /(?:you(?:'ll| will)?\s+lose\s+(?:your\s+)?(?:journal|entries?))[^.!?]{0,180}(?:cancel\w*|paid access ends?|subscription ends?)/i,
];
for (const relativePath of [paths.success, paths.settings, paths.renewal, paths.emails]) {
  for (const pattern of journalDeletionClaims) {
    reportMatches(
      relativePath,
      pattern,
      "cancellation/access-end copy must not imply deletion of customer-authored journal history",
    );
  }
}

const stelloquyTierPatterns = [
  /Stelloquy[\s\S]{0,180}(?:only|tied|included|available)[\s\S]{0,160}Planner\s*\+\s*Oracle/i,
  /Planner\s*\+\s*Oracle[\s\S]{0,180}(?:only|includes?|unlocks?|adds?|has|with)[\s\S]{0,120}Stelloquy/i,
];

// Pricing, the homepage, and paid onboarding are the three places where a core
// Planner buyer could otherwise be led to expect Stelloquy. Each must qualify it
// as Planner + Oracle; generic editorial mentions elsewhere are not prohibited.
for (const relativePath of [paths.pricing, paths.home, paths.paidOnboarding]) {
  requireAnyPattern(
    relativePath,
    stelloquyTierPatterns,
    "Stelloquy claims must explicitly identify Planner + Oracle as the included tier",
  );
}

// Detect only user-visible trial/countdown promises. We intentionally do not scan
// Stripe/backend files and do not match the internal status word `trialing`.
const trialCountdownPatterns = [
  /\bfree\s+(?:(?:app|product|software|Kairos)\s+)?trial\b/i,
  /\b(?:trial|access)\s+(?:expires?|ends?)\s+(?:in|after)\s+(?:seven|7)\s+days?\b/i,
  /\b(?:seven|7)\s+days?\s+(?:of|with)\s+(?:free\s+)?(?:app|planner|Kairos|access)\b/i,
  /\b(?:days?|hours?)\s+(?:left|remaining)\b/i,
];
for (const relativePath of Object.values(paths)) {
  for (const pattern of trialCountdownPatterns) {
    reportMatches(
      relativePath,
      pattern,
      "must not represent the persistent week reading as a free trial or expiring app access",
    );
  }

  // “No countdown” and “without a countdown” are approved negative disclosures;
  // any other customer-facing countdown phrase is a regression.
  reportMatches(
    relativePath,
    /\bcountdown\b/i,
    "countdown wording must be explicitly negative",
    ({ index, source }) => /(?:\bno\b|\bnot\b|\bwithout\b)[\s\S]{0,40}$/.test(
      source.slice(Math.max(0, index - 40), index),
    ),
  );
}

// New-sale surfaces may not mention Etsy at all. Lifecycle/support surfaces are
// permitted to help an existing customer only when “legacy” and “support” appear
// locally; this excludes the intentionally preserved activation implementation.
for (const relativePath of [paths.pricingRoute, paths.pricing, paths.home]) {
  reportMatches(
    relativePath,
    /\bEtsy\b/i,
    "new-sale copy must not promote Etsy software or access",
  );
}
for (const relativePath of [
  paths.success,
  paths.settings,
  paths.renewal,
  paths.paidOnboarding,
  paths.limitedReadingOnboarding,
  paths.emails,
]) {
  reportMatches(
    relativePath,
    /\bEtsy\b/i,
    "Etsy references outside acquisition must be locally framed as legacy support",
    ({ index, source }) => {
      const nearby = source.slice(Math.max(0, index - 220), index + 220);
      return /\blegacy\b/i.test(nearby) && /\bsupport\b/i.test(nearby);
    },
  );
}

if (violations.length > 0) {
  console.error("Access/offer copy check failed:\n");
  for (const violation of violations) console.error(`- ${violation}`);
  console.error(
    "\nAlign customer copy to the enforced monthly/annual, journal-retention, Stelloquy-tier, persistent-reading, and Etsy-support boundaries.",
  );
  process.exitCode = 1;
} else {
  console.log(
    "Access/offer copy check passed: monthly and annual Blueprint scope, journal retention, paid-generation limits, Stelloquy tiering, persistent-reading language, and Etsy boundaries are explicit.",
  );
}

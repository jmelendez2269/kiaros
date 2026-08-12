import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

// These are the customer-facing surfaces that can acquire a new Kairos customer.
// New Etsy software/access language and activation links are prohibited here.
const acquisitionSurfaces = [
  "app/page.tsx",
  "app/pricing/page.tsx",
  "components/marketing/KairosHome.tsx",
  "components/commerce/PublicPricingPage.tsx",
];

// These surfaces may help an existing customer find the preserved claim flow, but
// any Etsy/activation reference must be explicitly framed as legacy support.
const legacySupportEntrySurfaces = [
  "app/contact/page.tsx",
  "app/(app)/layout.tsx",
];

// The implementation below is intentionally preserved for direct legacy support.
const legacyActivationContract = [
  {
    file: "app/activate/page.tsx",
    required: [/ActivationClaimForm/],
  },
  {
    file: "components/commerce/ActivationClaimForm.tsx",
    required: [/\/api\/activate\/claim/, /\/api\/activate\/complete/],
  },
  { file: "app/api/activate/claim/route.ts", required: [] },
  { file: "app/api/activate/complete/route.ts", required: [] },
  {
    file: "middleware.ts",
    required: [/["']\/activate\(\.\*\)["']/, /["']\/api\/activate\/\(\.\*\)["']/],
  },
];

const violations = [];

function readRepositoryFile(relativePath) {
  const absolutePath = resolve(repositoryRoot, relativePath);
  if (!existsSync(absolutePath)) {
    violations.push(`${relativePath}: missing required safety-inventory file`);
    return null;
  }

  return readFileSync(absolutePath, "utf8");
}

function lineNumberAt(source, index) {
  return source.slice(0, index).split(/\r?\n/).length;
}

function reportMatches(relativePath, source, pattern, message) {
  const flags = pattern.flags.includes("g") ? pattern.flags : `${pattern.flags}g`;
  const matcher = new RegExp(pattern.source, flags);

  for (const match of source.matchAll(matcher)) {
    violations.push(
      `${relativePath}:${lineNumberAt(source, match.index ?? 0)}: ${message}: ${JSON.stringify(match[0])}`,
    );
  }
}

for (const relativePath of acquisitionSurfaces) {
  const source = readRepositoryFile(relativePath);
  if (source === null) continue;

  reportMatches(
    relativePath,
    source,
    /\bEtsy\b/i,
    "new-sale acquisition surfaces must not promote Etsy software or access",
  );
  reportMatches(
    relativePath,
    source,
    /(?:href\s*=\s*["'{`]\/activate\b|href\s*=\s*{["'`]\/activate\b)/i,
    "new-sale acquisition surfaces must not link to the legacy activation flow",
  );
}

for (const relativePath of legacySupportEntrySurfaces) {
  const source = readRepositoryFile(relativePath);
  if (source === null) continue;

  const lines = source.split(/\r?\n/);
  for (const [index, line] of lines.entries()) {
    if (!/\bEtsy\b|href\s*=\s*["'{`]\/activate\b/i.test(line)) continue;

    const nearbyCopy = lines.slice(Math.max(0, index - 3), index + 4).join("\n");
    if (!/\blegacy\b/i.test(nearbyCopy)) {
      violations.push(
        `${relativePath}:${index + 1}: Etsy/activation support must be locally labeled \"legacy\" so it cannot read as a new-sale path`,
      );
    }
  }
}

for (const { file, required } of legacyActivationContract) {
  const source = readRepositoryFile(file);
  if (source === null) continue;

  for (const pattern of required) {
    if (!pattern.test(source)) {
      violations.push(`${file}: preserved legacy activation contract is missing ${pattern}`);
    }
  }
}

if (violations.length > 0) {
  console.error("Commerce safety check failed:\n");
  for (const violation of violations) console.error(`- ${violation}`);
  console.error(
    "\nRemove Etsy software/access promotion from acquisition surfaces; keep /activate only as a clearly labeled legacy-support path.",
  );
  process.exitCode = 1;
} else {
  console.log(
    `Commerce safety check passed: ${acquisitionSurfaces.length} acquisition surfaces contain no Etsy software/access promotion.`,
  );
  console.log(
    `Legacy activation remains available through /activate (${legacyActivationContract.length} contract files verified).`,
  );
}

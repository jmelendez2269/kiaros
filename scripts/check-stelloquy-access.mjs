import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, extname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const violations = [];

const generationRoutes = [
  {
    file: "app/api/oracle/chat/route.ts",
    generationMarker: /\bstreamText\s*\(/,
  },
  {
    file: "app/api/oracle/explain/route.ts",
    generationMarker: /\bstreamText\s*\(/,
  },
  {
    file: "app/api/oracle/captures/route.ts",
    generationMarker: /\btagCaptureInBackground\s*\(\s*{/,
  },
];

const qualifyingAccessChecks = [
  { pattern: /\bauth\s*\(\s*\)/, description: "authenticated user check" },
  { pattern: /\.from\(\s*["']product_entitlements["']\s*\)/, description: "entitlement query" },
  { pattern: /\bresolveUserAccess\s*\(/, description: "resolved entitlement state" },
  {
    pattern: /if\s*\(\s*!\s*access\.hasOracleAccess\s*\)/,
    description: "active Planner + Oracle denial guard",
  },
  { pattern: /status\s*:\s*403/, description: "403 denial response" },
];

function readRepositoryFile(relativePath) {
  const absolutePath = resolve(repositoryRoot, relativePath);
  if (!existsSync(absolutePath)) {
    violations.push(`${relativePath}: missing required Stelloquy safety file`);
    return null;
  }
  return readFileSync(absolutePath, "utf8");
}

function lineNumberAt(source, index) {
  return source.slice(0, index).split(/\r?\n/).length;
}

function firstMatchIndex(source, pattern) {
  return source.search(pattern);
}

for (const { file, generationMarker } of generationRoutes) {
  const source = readRepositoryFile(file);
  if (source === null) continue;

  const generationIndex = firstMatchIndex(source, generationMarker);
  if (generationIndex < 0) {
    violations.push(`${file}: expected generation entrypoint ${generationMarker} was not found`);
    continue;
  }

  for (const check of qualifyingAccessChecks) {
    const checkIndex = firstMatchIndex(source, check.pattern);
    if (checkIndex < 0) {
      violations.push(`${file}: missing ${check.description} before generation`);
    } else if (checkIndex > generationIndex) {
      violations.push(
        `${file}:${lineNumberAt(source, checkIndex)}: ${check.description} occurs after generation is dispatched`,
      );
    }
  }
}

const oraclePagePath = "app/(app)/oracle/page.tsx";
const oraclePage = readRepositoryFile(oraclePagePath);
if (oraclePage !== null) {
  const pageGuardIndex = firstMatchIndex(oraclePage, /if\s*\(\s*!\s*access\.hasOracleAccess\s*\)/);
  const chatRenderIndex = firstMatchIndex(oraclePage, /return\s+<OracleChat\b/);
  if (pageGuardIndex < 0 || chatRenderIndex < 0 || pageGuardIndex > chatRenderIndex) {
    violations.push(`${oraclePagePath}: upgrade state must be returned before OracleChat can render`);
  }
}

function walkSourceFiles(relativeDirectory) {
  const absoluteDirectory = resolve(repositoryRoot, relativeDirectory);
  const files = [];

  for (const entry of readdirSync(absoluteDirectory, { withFileTypes: true })) {
    const absolutePath = join(absoluteDirectory, entry.name);
    if (entry.isDirectory()) {
      files.push(...walkSourceFiles(relative(repositoryRoot, absolutePath)));
    } else if ([".ts", ".tsx", ".js", ".jsx"].includes(extname(entry.name))) {
      files.push(relative(repositoryRoot, absolutePath).replaceAll("\\", "/"));
    }
  }

  return files;
}

const allowanceAuditFiles = [
  ...walkSourceFiles("app"),
  ...walkSourceFiles("components"),
  ...walkSourceFiles("lib"),
];

const prohibitedAllowanceRules = [
  {
    pattern: /\bORACLE_EXPLAIN_MONTHLY_LIMIT\b/g,
    message: "the retired free/core Planner explain allowance must not return",
  },
  {
    pattern: /\b(?:up to\s+)?20\s+(?:contextual\s+)?Stelloquy\s+(?:questions|messages)\b/gi,
    message: "signed-in/core Planner copy must not promise 20 Stelloquy questions or messages",
  },
  {
    pattern: /\bfree\s+(?:Stelloquy\s+)?(?:questions|messages|replies)\b/gi,
    message: "Stelloquy has no free signed-in message allowance",
  },
];

for (const file of allowanceAuditFiles) {
  const source = readRepositoryFile(file);
  if (source === null) continue;

  for (const rule of prohibitedAllowanceRules) {
    for (const match of source.matchAll(rule.pattern)) {
      violations.push(
        `${file}:${lineNumberAt(source, match.index ?? 0)}: ${rule.message}: ${JSON.stringify(match[0])}`,
      );
    }
  }
}

const marketingPath = "components/marketing/StelloquyMarketingPage.tsx";
const marketing = readRepositoryFile(marketingPath);
if (marketing !== null) {
  const misleadingCorePromise = /\bcore Planner\b[\s\S]{0,220}\b(?:ask|question|reading)/i.exec(marketing);
  if (misleadingCorePromise?.index !== undefined) {
    violations.push(
      `${marketingPath}:${lineNumberAt(marketing, misleadingCorePromise.index)}: core Planner copy must not promise Stelloquy generation`,
    );
  }
}

if (violations.length > 0) {
  console.error("Stelloquy access check failed:\n");
  for (const violation of violations) console.error(`- ${violation}`);
  console.error(
    "\nAll generation dispatches require an active Planner + Oracle entitlement. A future sampler must add a separate purchased-credit guard before this check is changed.",
  );
  process.exitCode = 1;
} else {
  console.log(
    `Stelloquy access check passed: ${generationRoutes.length} generation entrypoints deny users without active Planner + Oracle access before model dispatch.`,
  );
  console.log(
    `No retired free/core Planner Stelloquy allowance was found across ${allowanceAuditFiles.length} app, component, and library source files.`,
  );
}

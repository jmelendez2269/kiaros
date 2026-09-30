import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));

function cronEmailsAuthorized(
  authorization: string | null,
  cronSecret: string | undefined,
): boolean {
  if (!cronSecret || authorization !== `Bearer ${cronSecret}`) return false;
  return true;
}

assert.equal(
  cronEmailsAuthorized("Bearer undefined", undefined),
  false,
  "unset CRON_SECRET must reject Bearer undefined",
);
assert.equal(
  cronEmailsAuthorized("Bearer undefined", "real-secret"),
  false,
  "wrong bearer must reject",
);
assert.equal(
  cronEmailsAuthorized("Bearer real-secret", "real-secret"),
  true,
  "valid secret must authorize",
);

const emailsRoute = readFileSync(
  `${root}/app/api/cron/emails/route.ts`,
  "utf8",
);
assert.match(
  emailsRoute,
  /const secret = process\.env\.CRON_SECRET/,
  "emails cron must read CRON_SECRET into a variable before comparing",
);
assert.match(
  emailsRoute,
  /!secret \|\| request\.headers\.get\('authorization'\) !== `Bearer \$\{secret\}`/,
  "emails cron must fail closed when CRON_SECRET is missing",
);

const reflectionsRoute = readFileSync(
  `${root}/app/api/cron/reflections/route.ts`,
  "utf8",
);
assert.doesNotMatch(
  reflectionsRoute,
  /isRetentionEmailsEnabled/,
  "reflections cron must not depend on retention email flag",
);

console.log(
  "cron emails guards passed: fail-closed CRON_SECRET auth and reflections isolation",
);

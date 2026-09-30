import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  KIT_FIELD_NOTES_FORM_ID,
  getKitFieldNotesSubscribeActionUrl,
} from "../lib/marketing/kit-field-notes.ts";
import { PUBLIC_ROUTE_PATTERNS } from "../lib/marketing/public-routes.ts";

const root = join(fileURLToPath(new URL(".", import.meta.url)), "..");

function testFormConfig(): void {
  assert.equal(KIT_FIELD_NOTES_FORM_ID, "9985738");
  assert.equal(
    getKitFieldNotesSubscribeActionUrl(),
    "https://app.kit.com/forms/9985738/subscriptions",
  );
}

function testPublicRoutes(): void {
  assert.ok(
    PUBLIC_ROUTE_PATTERNS.some((pattern) => pattern.startsWith("/field-notes")),
    "PUBLIC_ROUTE_PATTERNS must include /field-notes",
  );

  const middleware = readFileSync(join(root, "middleware.ts"), "utf8");
  assert.match(middleware, /PUBLIC_ROUTE_PATTERNS/);
  assert.doesNotMatch(middleware, /\/field-notes\(\.\*\)/, {
    message: "field-notes route should be defined only in public-routes.ts",
  });
}

function testFormMarkup(): void {
  const formSource = readFileSync(
    join(root, "components/marketing/FieldNotesKitSubscribeForm.tsx"),
    "utf8",
  );
  assert.match(formSource, /getKitFieldNotesSubscribeActionUrl\(\)/);
  assert.match(formSource, /method="post"/);
  assert.match(formSource, /name="email_address"/);
  assert.doesNotMatch(formSource, /fetch\(/);
}

function run(): void {
  testFormConfig();
  testPublicRoutes();
  testFormMarkup();
  console.log("check-field-notes-signup: passed");
}

run();

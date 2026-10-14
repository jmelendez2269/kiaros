import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  KIT_FIELD_NOTES_FORM_ID,
  getKitFieldNotesSubscribeActionUrl,
} from "../lib/marketing/kit-field-notes.ts";
import {
  FIELD_NOTES_FOOTER_TAGLINE,
  FIELD_NOTES_NEWSLETTER_BODY,
} from "../lib/marketing/field-notes-copy.ts";
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
  assert.match(formSource, />\s*Subscribe\s*</);
  assert.match(formSource, /source\?: FieldNotesSignupSource/);
  assert.match(formSource, /fieldNotesInitialUtm/);
}

function testCopy(): void {
  const footerSource = readFileSync(
    join(root, "components/marketing/FieldNotesFooterSignup.tsx"),
    "utf8",
  );
  assert.match(footerSource, /FIELD_NOTES_FOOTER_TAGLINE/);
  assert.equal(FIELD_NOTES_FOOTER_TAGLINE, "Field Notes, Jack's email newsletter.");

  const pageSource = readFileSync(
    join(root, "components/marketing/FieldNotesPageContent.tsx"),
    "utf8",
  );
  assert.match(pageSource, /FIELD_NOTES_NEWSLETTER_BODY/);
  assert.match(
    FIELD_NOTES_NEWSLETTER_BODY,
    /Jack's email newsletter, with essays on timing and rest and notes from building/,
  );
  assert.match(pageSource, /Check your inbox to confirm\./);
  assert.match(pageSource, /Read a recent one/);
  assert.doesNotMatch(pageSource, /Want a look first/);
  assert.doesNotMatch(pageSource, /in his own words/i);
  assert.doesNotMatch(pageSource, /FieldNotesFooterSignup/);

  const metaSource = readFileSync(join(root, "app/field-notes/page.tsx"), "utf8");
  assert.match(
    metaSource,
    /Field Notes is Jack's email newsletter, with essays on timing and rest and notes from building Kairos\./,
  );
  assert.match(metaSource, /Field Notes: Jack's email newsletter \| Kairos/);
}

function testSurfaceSources(): void {
  const homeSource = readFileSync(join(root, "components/marketing/KairosHome.tsx"), "utf8");
  assert.match(homeSource, /FieldNotesHeroSignup source="home_hero"/);
  assert.match(homeSource, /FieldNotesFooterSignup variant="almanac" source="home_footer"/);

  const pricingSource = readFileSync(
    join(root, "components/commerce/PublicPricingPage.tsx"),
    "utf8",
  );
  assert.match(pricingSource, /FieldNotesFooterSignup variant="shell" source="pricing"/);

  const samplerSource = readFileSync(join(root, "app/purchase/success/page.tsx"), "utf8");
  assert.match(samplerSource, /FieldNotesSamplerSuccessSignup/);

  const onboardingSource = readFileSync(
    join(root, "app/(onboarding)/onboarding/page.tsx"),
    "utf8",
  );
  assert.match(onboardingSource, /field_notes_subscribe/);
  assert.match(onboardingSource, /source: "onboarding"/);

  const sourceLib = readFileSync(join(root, "lib/marketing/field-notes-source.ts"), "utf8");
  assert.match(sourceLib, /"home_hero"/);
  assert.match(sourceLib, /"home_footer"/);
  assert.match(sourceLib, /"pricing"/);
  assert.match(sourceLib, /"sampler_success"/);
  assert.match(sourceLib, /"onboarding"/);
  assert.match(sourceLib, /utm_content: source/);
}

function run(): void {
  testFormConfig();
  testPublicRoutes();
  testFormMarkup();
  testCopy();
  testSurfaceSources();
  console.log("check-field-notes-signup: passed");
}

run();

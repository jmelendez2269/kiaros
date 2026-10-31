/**
 * Unit checks for Clerk auth appearance tokens (PR #70).
 * Run: npx tsx scripts/check-clerk-appearance.mts
 */

import assert from "node:assert/strict";

import { clerkAppearance } from "../components/auth/clerkAppearance.ts";

const FOCUS_KEY = "&:focus, &:focus-visible";
const FOCUS_SHADOW = "0 0 0 2px #090911, 0 0 0 4px #A98AEF !important";

function assertMethodRowFocus(elementKey: string) {
  const el = clerkAppearance.elements[elementKey as keyof typeof clerkAppearance.elements];
  assert.equal(typeof el, "object");
  assert.notEqual(el, null);
  const styles = el as Record<string, unknown>;
  const focus = styles[FOCUS_KEY] as { boxShadow?: string; outline?: string } | undefined;
  assert.ok(focus, `${elementKey} missing ${FOCUS_KEY}`);
  assert.equal(focus.boxShadow, FOCUS_SHADOW, `${elementKey} focus boxShadow`);
  assert.equal(focus.outline, "none", `${elementKey} focus outline`);
}

for (const key of [
  "socialButtonsBlockButton",
  "socialButtonsIconButton",
  "alternativeMethodsBlockButton",
]) {
  assertMethodRowFocus(key);
}

const footer = clerkAppearance.elements.footer as Record<string, unknown>;
assert.equal(footer.color, "#A4A3B1");
assert.ok(footer["& :not(a)"], "footer must scope muted color away from anchors");
assert.equal(
  footer['& [class*="cl-internal"]'],
  undefined,
  "footer must not blanket cl-internal (regresses links)",
);

const actionLink = clerkAppearance.elements.footerActionLink as { color?: string };
const pagesLink = clerkAppearance.elements.footerPagesLink as { color?: string };
assert.match(actionLink.color ?? "", /A98AEF/i);
assert.match(pagesLink.color ?? "", /A98AEF/i);

console.log("check-clerk-appearance: ok");

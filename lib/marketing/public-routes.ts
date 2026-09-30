/** Clerk middleware public route patterns (keep in sync with middleware.ts). */
export const PUBLIC_ROUTE_PATTERNS: readonly string[] = [
  "/",
  "/stelloquy(.*)",
  "/pricing(.*)",
  "/field-notes(.*)",
  "/activate(.*)",
  "/contact(.*)",
  "/privacy(.*)",
  "/terms(.*)",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/api/commerce/etsy-ingest",
  "/api/commerce/(.*)",
  "/api/activate/(.*)",
  "/api/webhooks/(.*)",
  "/api/cron/(.*)",
  "/api/email/(.*)",
];

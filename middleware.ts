import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const isPublicRoute = createRouteMatcher([
  "/",
  "/pricing(.*)",
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
]);

export default clerkMiddleware(async (auth, req) => {
  if (isPublicRoute(req)) return;

  const { userId, redirectToSignIn } = await auth();
  if (!userId) {
    return redirectToSignIn({ returnBackUrl: req.url });
  }

  // Onboarding gate is handled in the app/onboarding layouts via the DB,
  // not here - avoids Clerk JWT staleness causing redirect loops after
  // publicMetadata is updated server-side.

  // Admin route guard is handled in app/(admin)/layout.tsx via currentUser(),
  // not here — sessionClaims does not include publicMetadata by default in
  // Clerk v7 without a custom JWT template, so middleware checks are unreliable.
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};

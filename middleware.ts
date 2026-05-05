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

const isOnboardingRoute = createRouteMatcher(["/onboarding(.*)"]);
const isApiRoute = createRouteMatcher(["/api/(.*)"]);
const isAdminRoute = createRouteMatcher(["/admin(.*)"]);

export default clerkMiddleware(async (auth, req) => {
  if (isPublicRoute(req)) return;

  const { userId, sessionClaims, redirectToSignIn } = await auth();
  if (!userId) {
    return redirectToSignIn({ returnBackUrl: req.url });
  }

  // Onboarding gate is handled in the app/onboarding layouts via the DB,
  // not here - avoids Clerk JWT staleness causing redirect loops after
  // publicMetadata is updated server-side.

  // Admin route guard - redirect non-admins to home
  if (isAdminRoute(req) && !isApiRoute(req)) {
    const isAdmin =
      (sessionClaims?.publicMetadata as { isAdmin?: boolean } | undefined)
        ?.isAdmin === true;
    if (!isAdmin) {
      return NextResponse.redirect(new URL("/", req.url));
    }
  }
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};

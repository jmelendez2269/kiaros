import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import { PUBLIC_ROUTE_PATTERNS } from "@/lib/marketing/public-routes";

const isPublicRoute = createRouteMatcher([...PUBLIC_ROUTE_PATTERNS]);

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
}, {
  signInUrl: "/sign-in",
  signUpUrl: "/sign-up",
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};

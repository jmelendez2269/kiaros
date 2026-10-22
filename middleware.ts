import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { featureFlagEnabled } from "@/lib/calendar/calendar-day-routes";
import { PUBLIC_ROUTE_PATTERNS } from "@/lib/marketing/public-routes";

const isPublicRoute = createRouteMatcher([...PUBLIC_ROUTE_PATTERNS]);

function iaJournalInsightsMapRedirect(req: NextRequest): NextResponse | null {
  if (!featureFlagEnabled(process.env.NEXT_PUBLIC_IA_JOURNAL)) return null;
  if (req.nextUrl.pathname !== "/insights/map") return null;

  const tab = req.nextUrl.searchParams.get("tab");
  if (tab === "journal") {
    return NextResponse.redirect(new URL("/journal/entries", req.url), 307);
  }
  if (tab === "map") {
    return NextResponse.redirect(new URL("/journal/patterns?view=map", req.url), 307);
  }
  if (tab === "captures") {
    return NextResponse.redirect(new URL("/journal/patterns?view=captures", req.url), 307);
  }
  return NextResponse.redirect(new URL("/journal/patterns", req.url), 307);
}

export default clerkMiddleware(async (auth, req) => {
  const iaJournalRedirect = iaJournalInsightsMapRedirect(req);
  if (iaJournalRedirect) return iaJournalRedirect;

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

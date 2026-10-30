import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { featureFlagEnabled } from "@/lib/calendar/calendar-day-routes";
import { ia5LegacyOnboardingRedirect } from "@/lib/onboarding/ia-onboarding-routes";
import { PUBLIC_ROUTE_PATTERNS } from "@/lib/marketing/public-routes";

const isPublicRoute = createRouteMatcher([...PUBLIC_ROUTE_PATTERNS]);

function iaOnboarding5LegacyRedirect(req: NextRequest): NextResponse | null {
  const destination = ia5LegacyOnboardingRedirect(
    req.nextUrl.pathname,
    featureFlagEnabled(process.env.NEXT_PUBLIC_IA_ONBOARDING5),
  );
  if (!destination) return null;
  return NextResponse.redirect(new URL(destination, req.url), 307);
}

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

function calendarDayPlannerRedirects(req: NextRequest): NextResponse | null {
  if (!featureFlagEnabled(process.env.KIAROS_CALENDAR_DAY)) return null;

  const { pathname, searchParams } = req.nextUrl;

  if (pathname === "/planner") {
    const view = searchParams.get("view");
    if (view === "week") {
      const date = searchParams.get("date");
      const url = new URL("/calendar/week", req.url);
      if (date && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
        url.searchParams.set("date", date);
      }
      return NextResponse.redirect(url, 307);
    }
    if (view === "month") {
      const date = searchParams.get("date");
      const url = new URL("/calendar/month", req.url);
      if (date && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
        url.searchParams.set("month", date.slice(0, 7));
      }
      return NextResponse.redirect(url, 307);
    }
  }

  if (pathname === "/year") {
    const view = searchParams.get("view");
    if (view === "week") {
      const date = searchParams.get("date");
      const url = new URL("/calendar/week", req.url);
      if (date && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
        url.searchParams.set("date", date);
      }
      return NextResponse.redirect(url, 307);
    }
    if (view === "month") {
      const month = searchParams.get("month");
      const url = new URL("/calendar/month", req.url);
      if (month && /^\d{4}-\d{2}$/.test(month)) {
        url.searchParams.set("month", month);
      }
      return NextResponse.redirect(url, 307);
    }
    const url = new URL("/calendar/year", req.url);
    for (const [key, value] of searchParams.entries()) {
      url.searchParams.set(key, value);
    }
    return NextResponse.redirect(url, 307);
  }

  if (pathname === "/blueprint") {
    const url = new URL("/calendar/blueprint", req.url);
    for (const [key, value] of searchParams.entries()) {
      url.searchParams.set(key, value);
    }
    return NextResponse.redirect(url, 307);
  }

  return null;
}

export default clerkMiddleware(async (auth, req) => {
  const iaOnboardingRedirect = iaOnboarding5LegacyRedirect(req);
  if (iaOnboardingRedirect) return iaOnboardingRedirect;

  const iaJournalRedirect = iaJournalInsightsMapRedirect(req);
  if (iaJournalRedirect) return iaJournalRedirect;

  const calendarDayRedirect = calendarDayPlannerRedirects(req);
  if (calendarDayRedirect) return calendarDayRedirect;

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

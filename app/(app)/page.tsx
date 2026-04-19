import { redirect } from "next/navigation";

/**
 * App root — middleware handles onboarding vs dashboard routing.
 * Users who are unauthenticated are redirected to /sign-in by middleware.
 * Users who haven't completed onboarding are redirected to /onboarding by middleware.
 */
export default function AppRootPage() {
  redirect("/dashboard");
}

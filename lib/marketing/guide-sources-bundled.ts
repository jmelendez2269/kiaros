import type { GuideSlug } from "@/lib/marketing/guides-constants";

import natalChartYearPlanner from "@/content/guides/natal-chart-year-planner.md";
import newMoonFullMoonJournaling from "@/content/guides/new-moon-full-moon-journaling.md";
import planningRestWithPersonalTiming from "@/content/guides/planning-rest-with-personal-timing.md";
import quarterlyReviewWithTimingReflection from "@/content/guides/quarterly-review-with-timing-reflection.md";

/** Verbatim Stella markdown per slug — bundled into Next server/edge output via webpack `asset/source`. */
export const GUIDE_MARKDOWN_BY_SLUG: Record<GuideSlug, string> = {
  "natal-chart-year-planner": natalChartYearPlanner,
  "new-moon-full-moon-journaling": newMoonFullMoonJournaling,
  "quarterly-review-with-timing-reflection": quarterlyReviewWithTimingReflection,
  "planning-rest-with-personal-timing": planningRestWithPersonalTiming,
};

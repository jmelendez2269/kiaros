import { auth } from "@clerk/nextjs/server";
import type { Metadata } from "next";

import { StelloquyMarketingPage } from "@/components/marketing/StelloquyMarketingPage";

export const metadata: Metadata = {
  title: "Stelloquy — A conversation with your year | Kairos",
  description:
    "Meet Stelloquy, the context-aware Oracle inside Kairos, grounded in your natal chart, live transits, goals, blueprint, and chosen journal memory.",
  openGraph: {
    title: "Stelloquy — A conversation with your year",
    description:
      "The premium reflective layer inside Kairos: your chart, timing, plan, and chosen memory in one ongoing conversation.",
    type: "website",
  },
};

export default async function StelloquyPage() {
  const { userId } = await auth();

  return <StelloquyMarketingPage isSignedIn={Boolean(userId)} />;
}

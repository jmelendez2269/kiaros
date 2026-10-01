import type { Metadata } from "next";

import { FieldNotesPageContent } from "@/components/marketing/FieldNotesPageContent";
import { fieldNotesUtmFromSearchParams } from "@/lib/marketing/field-notes-utm";

export const metadata: Metadata = {
  title: "Field Notes: Jack's email newsletter | Kairos",
  description:
    "Field Notes is Jack's email newsletter, with essays on timing and rest and notes from building Kairos.",
  alternates: {
    canonical: "https://www.kairosplanner.xyz/field-notes",
  },
};

interface Props {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}

export default async function FieldNotesPage({ searchParams }: Props) {
  const params = (await searchParams) ?? {};
  const joinedParam = params.joined;
  const joinedValue = Array.isArray(joinedParam) ? joinedParam[0] : joinedParam;
  const joined = joinedValue === "1";
  const initialUtm = fieldNotesUtmFromSearchParams(params);

  return <FieldNotesPageContent joined={joined} initialUtm={initialUtm} />;
}

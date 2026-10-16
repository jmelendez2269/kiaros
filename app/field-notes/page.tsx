import { FieldNotesPageContent } from "@/components/marketing/FieldNotesPageContent";
import { fieldNotesUtmFromSearchParams } from "@/lib/marketing/field-notes-utm";
import { fieldNotesMarketingMetadata } from "@/lib/marketing/public-page-metadata";

export const metadata = fieldNotesMarketingMetadata;

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

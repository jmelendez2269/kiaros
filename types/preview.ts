import type { EnergyType, EphemerisDay } from "@/types/blueprint";

export interface PreviewDay {
  date: string;
  dayName: string;
  title: string;
  invitation: string;
  skyNote: string;
  energyType: EnergyType;
}

export interface WeekPreviewContent {
  weekTheme: string;
  weekSummary: string;
  intentions: string[];
  reflectionPrompt: string;
  days: PreviewDay[];
  sky: Pick<EphemerisDay, "date" | "moon" | "moonPhaseEvent" | "retrogrades">[];
}

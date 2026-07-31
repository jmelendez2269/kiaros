import { generateText } from "ai";
import { anthropic } from "@ai-sdk/anthropic";

import { createAdminSupabase } from "@/lib/supabase/admin";
import { computeYearEphemeris } from "@/lib/ephemeris";
import type { NatalChart, PlanetPosition } from "@/types/blueprint";
import type { WeekPreviewContent } from "@/types/preview";

const MODEL_ID = "claude-sonnet-4-6";

function formatPlacement(label: string, value: PlanetPosition) {
  return `${label}: ${value.degree.toFixed(1)}° ${value.sign}, house ${value.house}`;
}

function compactNatal(chart: NatalChart) {
  return [
    formatPlacement("Sun", chart.sun),
    formatPlacement("Moon", chart.moon),
    formatPlacement("Mercury", chart.mercury),
    formatPlacement("Venus", chart.venus),
    formatPlacement("Mars", chart.mars),
    formatPlacement("Jupiter", chart.jupiter),
    formatPlacement("Saturn", chart.saturn),
    `Rising: ${chart.rising}`,
  ].join("\n");
}

function getUtcWeek() {
  const today = new Date();
  const day = today.getUTCDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  const monday = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
  monday.setUTCDate(monday.getUTCDate() + mondayOffset);
  const sunday = new Date(monday);
  sunday.setUTCDate(sunday.getUTCDate() + 6);
  return {
    startDate: monday.toISOString().slice(0, 10),
    endDate: sunday.toISOString().slice(0, 10),
    year: monday.getUTCFullYear(),
  };
}

function assertPreview(value: unknown): asserts value is Omit<WeekPreviewContent, "sky"> {
  if (!value || typeof value !== "object") throw new Error("Preview response was not an object.");
  const preview = value as Partial<WeekPreviewContent>;
  if (
    typeof preview.weekTheme !== "string" ||
    typeof preview.weekSummary !== "string" ||
    !Array.isArray(preview.intentions) ||
    typeof preview.reflectionPrompt !== "string" ||
    !Array.isArray(preview.days) ||
    preview.days.length !== 7
  ) {
    throw new Error("Preview response did not match the required seven-day shape.");
  }
}

export async function runWeekPreviewGeneration(input: {
  previewId: string;
  userId: string;
}) {
  const admin = createAdminSupabase();
  const { startDate, endDate, year } = getUtcWeek();

  try {
    const [{ data: profile, error: profileError }, { data: goals }] = await Promise.all([
      admin
        .from("user_profiles")
        .select(
          "display_name, natal_chart, year_vision, word_of_year, what_to_release, tradition"
        )
        .eq("id", input.userId)
        .single(),
      admin
        .from("goal_categories")
        .select("name, description, success, sort_order")
        .eq("user_id", input.userId)
        .order("sort_order", { ascending: true }),
    ]);

    if (profileError || !profile?.natal_chart) {
      throw new Error("Complete birth details are required before generating a personal week.");
    }

    const natalChart = profile.natal_chart as unknown as NatalChart;
    const ephemeris = computeYearEphemeris({
      userId: input.userId,
      natalChart,
      startDate: `${year}-01-01`,
      year,
    });
    const weekDays = ephemeris.days.filter(
      (day) => day.date >= startDate && day.date <= endDate
    );

    const skyText = weekDays
      .map((day) => {
        const transits = day.transits
          .slice(0, 4)
          .map((transit) => `${transit.planet} ${transit.aspect} natal ${transit.natalPlanet}`)
          .join(", ");
        return `${day.date}: Moon in ${day.moon.sign} (${day.moon.lunarPhase}); ${
          transits || "no close personal transit"
        }; retrograde: ${day.retrogrades.join(", ") || "none"}`;
      })
      .join("\n");

    const prompt = `Create a spacious, grounded personal preview for ${profile.display_name ?? "this person"} covering ${startDate} through ${endDate}.

This is an invitation, not an instruction. Avoid certainty, commands, identity claims, productivity language, and promises. Prefer "may," "might," "you could notice," and "an invitation to." Keep the astrology specific but readable.

Interpretive lens: ${profile.tradition ?? "synthesis"}
Year vision: ${profile.year_vision ?? "not provided"}
Word of the year: ${profile.word_of_year ?? "not chosen"}
What they are releasing: ${profile.what_to_release ?? "not provided"}
Focus areas:
${(goals ?? []).map((goal) => `- ${goal.name}: ${goal.description ?? ""}`).join("\n") || "- not provided"}

Natal foundation:
${compactNatal(natalChart)}

Actual sky for these seven days:
${skyText}

Return valid JSON only:
{
  "weekTheme": "6 words or fewer",
  "weekSummary": "2-3 short sentences",
  "intentions": ["three first-person, non-prescriptive invitations"],
  "reflectionPrompt": "one open question",
  "days": [
    {
      "date": "YYYY-MM-DD",
      "dayName": "Monday",
      "title": "5 words or fewer",
      "invitation": "one short, spacious sentence",
      "skyNote": "one short sentence naming the real moon or transit",
      "energyType": "push|rest|reflect|initiate"
    }
  ]
}

Include exactly seven days in chronological order.`;

    const { text, usage } = await generateText({
      model: anthropic(MODEL_ID),
      prompt,
      maxOutputTokens: 2200,
      temperature: 0.6,
      abortSignal: AbortSignal.timeout(120_000),
    });

    const parsed = JSON.parse(
      text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/i, "").trim()
    ) as unknown;
    assertPreview(parsed);

    const content: WeekPreviewContent = {
      ...parsed,
      sky: weekDays.map((day) => ({
        date: day.date,
        moon: day.moon,
        moonPhaseEvent: day.moonPhaseEvent,
        retrogrades: day.retrogrades,
      })),
    };

    await admin
      .from("week_previews")
      .update({
        start_date: startDate,
        end_date: endDate,
        status: "ready",
        content: content as unknown as Record<string, unknown>,
        error_message: null,
        model_used: MODEL_ID,
        input_tokens: usage.inputTokens ?? 0,
        output_tokens: usage.outputTokens ?? 0,
        generated_at: new Date().toISOString(),
      })
      .eq("id", input.previewId);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await admin
      .from("week_previews")
      .update({ status: "error", error_message: message.slice(0, 1000) })
      .eq("id", input.previewId);
  }
}

export function buildPlanImportSystemPrompt(): string {
  return `You read arbitrary, often messy text describing a personal plan (a workout program, a study schedule, a project timeline, anything structured across days or weeks) and convert it into a simple day-by-day task list.

Output ONLY valid JSON, no markdown fences, matching this shape exactly:
{
  "planTitle": "short title, optional",
  "items": [ { "dayOffset": 0, "title": "short actionable line" }, ... ],
  "warning": "optional note if the input wasn't really a plan"
}

Rules:
- "dayOffset" is a 0-indexed integer day count from the plan's own start (day 1 of the plan = dayOffset 0, day 2 = dayOffset 1, etc.). Never output real calendar dates — the caller resolves dayOffset against a start date the user chooses separately.
- If the source gives daily detail ("Day 3: ..."), use exact day offsets.
- If the source only gives weekly detail ("Week 2: build volume"), emit ONE item for that week at dayOffset = (weekNumber - 1) * 7, using the week's focus as the title. Do not invent daily detail that isn't in the source.
- Keep each "title" short and actionable (under ~100 characters) — trim explanatory prose, keep the actual instruction.
- Cap output at 120 items. If the source describes more than that, keep the earliest ones and note the truncation in "warning".
- If the input doesn't actually contain a structured plan (e.g. it's an article, lyrics, unrelated text), return "items": [] and a "warning" explaining that, rather than inventing a schedule.
- Never wrap the JSON in markdown code fences or add any commentary before/after it.`
}

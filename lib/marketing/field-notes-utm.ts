export type FieldNotesUtmFieldKey =
  | "utm_source"
  | "utm_medium"
  | "utm_campaign"
  | "utm_content";

export const FIELD_NOTES_UTM_KEYS: readonly FieldNotesUtmFieldKey[] = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_content",
];

const URL_PARAM_ALIASES: Record<FieldNotesUtmFieldKey, readonly string[]> = {
  utm_source: ["utm_source", "kiaros_source"],
  utm_medium: ["utm_medium", "kiaros_medium"],
  utm_campaign: ["utm_campaign", "kiaros_campaign"],
  utm_content: ["utm_content", "kiaros_content"],
};

const FUNNEL_STORAGE_KEY = "kiaros_funnel_context:v1";

const CONTEXT_KEY_BY_UTM: Record<FieldNotesUtmFieldKey, string> = {
  utm_source: "source",
  utm_medium: "medium",
  utm_campaign: "campaign",
  utm_content: "content",
};

function pickFromSearchParams(
  searchParams: URLSearchParams,
  key: FieldNotesUtmFieldKey,
): string | null {
  for (const param of URL_PARAM_ALIASES[key]) {
    const value = searchParams.get(param)?.trim();
    if (value) return value;
  }
  return null;
}

export function fieldNotesUtmFromSearchParams(
  searchParams: URLSearchParams | Record<string, string | string[] | undefined>,
): Partial<Record<FieldNotesUtmFieldKey, string>> {
  const params =
    searchParams instanceof URLSearchParams
      ? searchParams
      : new URLSearchParams(
          Object.entries(searchParams).flatMap(([key, value]) => {
            if (value === undefined) return [];
            if (Array.isArray(value)) return value.map((item) => [key, item]);
            return [[key, value]];
          }),
        );

  const result: Partial<Record<FieldNotesUtmFieldKey, string>> = {};
  for (const key of FIELD_NOTES_UTM_KEYS) {
    const value = pickFromSearchParams(params, key);
    if (value) result[key] = value;
  }
  return result;
}

export function fieldNotesUtmFromFunnelStorage(
  storage: Pick<Storage, "getItem">,
): Partial<Record<FieldNotesUtmFieldKey, string>> {
  const result: Partial<Record<FieldNotesUtmFieldKey, string>> = {};
  try {
    const raw = storage.getItem(FUNNEL_STORAGE_KEY);
    if (!raw) return result;
    const parsed = JSON.parse(raw) as { context?: Record<string, unknown> };
    const context = parsed?.context;
    if (!context || typeof context !== "object") return result;
    for (const utmKey of FIELD_NOTES_UTM_KEYS) {
      const contextKey = CONTEXT_KEY_BY_UTM[utmKey];
      const value = context[contextKey];
      if (typeof value === "string" && value.trim()) {
        result[utmKey] = value.trim();
      }
    }
  } catch {
    // ignore invalid storage
  }
  return result;
}

export function mergeFieldNotesUtm(
  ...sources: Array<Partial<Record<FieldNotesUtmFieldKey, string>> | undefined>
): Partial<Record<FieldNotesUtmFieldKey, string>> {
  const merged: Partial<Record<FieldNotesUtmFieldKey, string>> = {};
  for (const source of sources) {
    if (!source) continue;
    for (const key of FIELD_NOTES_UTM_KEYS) {
      if (!merged[key] && source[key]) {
        merged[key] = source[key];
      }
    }
  }
  return merged;
}

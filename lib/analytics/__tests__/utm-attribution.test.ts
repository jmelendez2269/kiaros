import { parseFunnelAttribution, preserveFirstTouchAttribution } from "../attribution";

describe("UTM Attribution", () => {
  it("parses UTM parameters from URL", () => {
    const url = new URL(
      "https://kairosplanner.xyz/stelloquy?utm_source=twitter&utm_medium=social&utm_campaign=kairos_planner_season_2026q4&utm_content=hero_cta"
    );

    const attribution = parseFunnelAttribution(url);

    expect(attribution.source).toBe("twitter");
    expect(attribution.medium).toBe("social");
    expect(attribution.campaign).toBe("kairos_planner_season_2026q4");
  });

  it("preserves first-touch attribution", () => {
    const original = {
      source: "instagram",
      medium: "social",
      campaign: "fall_2026",
      referrer_host: null,
      entry_path: "/",
      experiment_key: null,
      experiment_variant: null,
    };

    const incoming = {
      source: "direct",
      medium: null,
      campaign: null,
      referrer_host: null,
      entry_path: "/pricing",
      experiment_key: null,
      experiment_variant: null,
    };

    const result = preserveFirstTouchAttribution(original, incoming);

    // Should keep original UTMs
    expect(result.source).toBe("instagram");
    expect(result.medium).toBe("social");
    expect(result.campaign).toBe("fall_2026");
    // But update entry path to new one
    expect(result.entry_path).toBe("/pricing");
  });

  it("sanitizes campaign values with proper length limit", () => {
    const longCampaign = "a".repeat(150);
    const url = new URL(
      `https://kairosplanner.xyz/?utm_source=test&utm_campaign=${longCampaign}`
    );

    const attribution = parseFunnelAttribution(url);

    expect(attribution.source).toBe("test");
    // Campaign length is limited to 120 chars in boundedQueryValue
    expect(attribution.campaign).toBe(null);
  });
});

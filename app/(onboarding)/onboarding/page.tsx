"use client";

import { useRouter } from "next/navigation";
import { useState, useCallback, useRef, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const STORAGE_KEY = "kiaros_onboarding_step1";

const schema = z.object({
  display_name: z.string().min(1, "Name is required"),
  birth_date: z.string().min(1, "Date of birth is required"),
  birth_time: z.string().optional(),
  birth_time_unknown: z.boolean().default(false),
  birth_city: z.string().min(1, "Please select a birth city"),
  birth_state: z.string().optional(),
  birth_country: z.string().min(1, "Country is required"),
  birth_lat: z.number(),
  birth_lng: z.number(),
  birth_tz: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

interface NominatimResult {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
  address: {
    city?: string;
    town?: string;
    village?: string;
    municipality?: string;
    state?: string;
    province?: string;
    region?: string;
    country?: string;
  };
}

export default function OnboardingBirthPage() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<NominatimResult[]>([]);
  const [selected, setSelected] = useState<NominatimResult | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState(false);
  const [saveError, setSaveError] = useState("");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { birth_time_unknown: false },
  });

  const birthTimeUnknown = watch("birth_time_unknown");
  const birthCity = watch("birth_city");

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return;
    try {
      const data = JSON.parse(saved) as Partial<FormValues>;
      (Object.keys(data) as Array<keyof FormValues>).forEach((k) => {
        if (data[k] !== undefined) setValue(k, data[k] as never);
      });
      if (data.birth_city) {
        setQuery(
          `${data.birth_city}${data.birth_state ? `, ${data.birth_state}` : ""}, ${data.birth_country ?? ""}`
        );
        setSelected({} as NominatimResult);
      }
    } catch {}
  }, [setValue]);

  const searchCities = useCallback((value: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!value || value.length < 2) {
      setResults([]);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      setIsSearching(true);
      try {
        setSearchError(false);
        const res = await fetch(`/api/geocode?q=${encodeURIComponent(value)}`);
        if (!res.ok) throw new Error("Search failed");
        const data: NominatimResult[] = await res.json();
        const filtered = data.filter(
          (r) => r.address.city || r.address.town || r.address.village || r.address.municipality
        );
        setResults(filtered);
        if (filtered.length === 0 && data.length > 0) {
          setResults(data.slice(0, 6));
        }
      } catch {
        setResults([]);
        setSearchError(true);
      } finally {
        setIsSearching(false);
      }
    }, 350);
  }, []);

  const handleSelect = (result: NominatimResult) => {
    const city =
      result.address.city ||
      result.address.town ||
      result.address.village ||
      result.address.municipality ||
      "";
    const state = result.address.state || result.address.province || result.address.region || "";
    const country = result.address.country || "";
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    setValue("birth_city", city, { shouldValidate: true });
    setValue("birth_state", state);
    setValue("birth_country", country, { shouldValidate: true });
    setValue("birth_lat", parseFloat(result.lat), { shouldValidate: true });
    setValue("birth_lng", parseFloat(result.lon), { shouldValidate: true });
    setValue("birth_tz", tz);
    setSelected(result);
    setQuery(`${city}${state ? `, ${state}` : ""}, ${country}`);
    setResults([]);
  };

  const handleClearCity = () => {
    setSelected(null);
    setQuery("");
    setResults([]);
    setValue("birth_city", "");
    setValue("birth_state", "");
    setValue("birth_country", "");
    setValue("birth_lat", undefined as unknown as number);
    setValue("birth_lng", undefined as unknown as number);
  };

  const onSubmit = async (values: FormValues) => {
    if (values.birth_time_unknown) values.birth_time = undefined;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(values));

    const res = await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        display_name: values.display_name,
        birth_date: values.birth_date,
        birth_time: values.birth_time || null,
        birth_time_unknown: values.birth_time_unknown,
        birth_city: values.birth_city,
        birth_lat: values.birth_lat,
        birth_lng: values.birth_lng,
        birth_tz: values.birth_tz || null,
      }),
    });

    if (!res.ok) {
      setSaveError("Something went wrong saving your details. Please try again.");
      return;
    }

    router.push("/onboarding/tradition");
  };

  return (
    <div className="space-y-8">
      <div className="space-y-3">
        <p className="shell-kicker">Step 1</p>
        <h2 className="font-serif text-3xl text-bone">Set the timing foundation</h2>
        <p className="leading-relaxed text-bone-muted">
          Let&apos;s start with your timing foundation. This planner is built around your birth
          chart, which is why Kiaros begins with the date, time, and place you were born. This is
          what allows it to create something more personal than a generic planner or astrology app.
        </p>
        <p className="text-sm italic text-bone-muted/80">
          Your answers are private and used only to generate your personal blueprint.
        </p>
        <div className="flex w-fit items-center gap-2 rounded-full border border-leather-500/25 bg-leather-500/8 px-3 py-1.5 text-xs text-leather-200/80">
          <span className="h-1.5 w-1.5 rounded-full bg-leather-300/70" />
          Builds Stelloquy&apos;s permanent chart foundation
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="space-y-2">
          <label className="block text-sm font-medium text-bone">What would you like to be called?</label>
          <input
            type="text"
            placeholder="Your name"
            {...register("display_name")}
            disabled={isSubmitting}
            className="w-full rounded-xl border border-border/80 bg-stone-950/70 px-4 py-3 text-bone placeholder:text-bone-muted/45 focus:outline-none focus:ring-2 focus:ring-leather-400"
          />
          {errors.display_name && <p className="text-xs text-destructive">{errors.display_name.message}</p>}
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-bone">Date of birth</label>
          <input
            type="date"
            {...register("birth_date")}
            disabled={isSubmitting}
            className="w-full rounded-xl border border-border/80 bg-stone-950/70 px-4 py-3 text-bone focus:outline-none focus:ring-2 focus:ring-leather-400"
          />
          {errors.birth_date && <p className="text-xs text-destructive">{errors.birth_date.message}</p>}
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-bone">
            Time of birth <span className="font-normal text-bone-muted">(optional)</span>
          </label>
          <input
            type="time"
            {...register("birth_time")}
            disabled={isSubmitting || birthTimeUnknown}
            className="w-full rounded-xl border border-border/80 bg-stone-950/70 px-4 py-3 text-bone focus:outline-none focus:ring-2 focus:ring-leather-400 disabled:opacity-40"
          />
          <label className="flex cursor-pointer items-center gap-2 text-sm text-bone-muted">
            <input type="checkbox" {...register("birth_time_unknown")} className="rounded" />
            I don&apos;t know my birth time
          </label>
          <p className="text-xs text-bone-muted">
            If known, this unlocks a more precise shell by adding your rising sign and house placements.
          </p>
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-bone">Birth city</label>
          <div className="relative">
            <input
              type="text"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                if (selected) handleClearCity();
                searchCities(e.target.value);
              }}
              placeholder="Search for a city..."
              disabled={isSubmitting}
              className="w-full rounded-xl border border-border/80 bg-stone-950/70 px-4 py-3 text-bone placeholder:text-bone-muted/45 focus:outline-none focus:ring-2 focus:ring-leather-400"
            />
            {selected && (
              <button
                type="button"
                onClick={handleClearCity}
                aria-label="Clear selected city"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-lg leading-none text-bone-muted hover:text-bone"
              >
                x
              </button>
            )}
            {isSearching && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-bone-muted">
                Searching...
              </div>
            )}
            {searchError && !isSearching && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-destructive">
                Search unavailable
              </div>
            )}
            {results.length > 0 && (
              <ul className="absolute z-10 mt-1 max-h-60 w-full overflow-y-auto rounded-xl border border-border/80 bg-stone-900 shadow-panel">
                {results.map((result) => {
                  const city =
                    result.address.city ||
                    result.address.town ||
                    result.address.village ||
                    result.address.municipality ||
                    "";
                  const state = result.address.state || result.address.province || result.address.region || "";
                  const country = result.address.country || "";
                  return (
                    <li key={result.place_id}>
                      <button
                        type="button"
                        onClick={() => handleSelect(result)}
                        className="w-full px-4 py-3 text-left text-sm text-bone hover:bg-stone-800"
                      >
                        <span className="font-medium">{city}</span>
                        {state && <span className="text-bone-muted">, {state}</span>}
                        <span className="text-bone-muted">, {country}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
          {selected && birthCity && (
            <div className="flex items-center gap-2 rounded-xl border border-leather-400/30 bg-leather-500/10 px-3 py-3 text-sm text-bone">
              <span className="text-leather-300">Selected</span>
              <span>
                {watch("birth_city")}
                {watch("birth_state") ? `, ${watch("birth_state")}` : ""}, {watch("birth_country")}
              </span>
              <span className="ml-auto text-xs text-bone-muted">
                {(watch("birth_lat") ?? 0).toFixed(4)}, {(watch("birth_lng") ?? 0).toFixed(4)}
              </span>
            </div>
          )}
          {errors.birth_city && <p className="text-xs text-destructive">{errors.birth_city.message}</p>}
        </div>

        {saveError && <p className="text-sm text-destructive">{saveError}</p>}
        <button
          type="submit"
          disabled={isSubmitting || !birthCity}
          className="w-full rounded-2xl border border-leather-400/50 bg-leather-500/35 px-4 py-3 font-medium text-bone shadow-glow hover:bg-leather-500/45 disabled:opacity-50"
        >
          {isSubmitting ? "Saving..." : "Continue"}
        </button>
      </form>
    </div>
  );
}

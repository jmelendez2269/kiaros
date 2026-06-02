"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const STORAGE_KEY = "kiaros_onboarding_step3_study_focus";

const schema = z.object({
  study_focus: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

export default function OnboardingStudyFocusPage() {
  const router = useRouter();

  const [saveError, setSaveError] = useState("");

  const {
    register,
    handleSubmit,
    setValue,
    formState: { isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  useEffect(() => {
    const saved = sessionStorage.getItem(STORAGE_KEY);
    if (!saved) return;
    try {
      const data = JSON.parse(saved) as Partial<FormValues>;
      if (data.study_focus) setValue("study_focus", data.study_focus);
    } catch {}
  }, [setValue]);

  const onSubmit = async (values: FormValues) => {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(values));

    const res = await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        study_focus: values.study_focus || null,
      }),
    });

    if (!res.ok) {
      setSaveError("Something went wrong saving your details. Please try again.");
      return;
    }

    router.push("/onboarding/year-focus");
  };

  return (
    <div className="space-y-8">
      <div className="space-y-3">
        <p className="shell-kicker">Step 3</p>
        <h2 className="font-serif text-3xl text-bone">Name your study layer</h2>
        <p className="leading-relaxed text-bone-muted">
          What are you learning, deepening, or becoming? This can include topics you&apos;re
          studying, skills you want to build, books you want to move through, or larger themes
          that are shaping this season of your life.
        </p>
        <p className="text-sm italic text-bone-muted/80">This can stay loose. A few threads are enough.</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="space-y-2">
          <label className="block text-sm font-medium text-bone">
            What themes, books, skills, or outcomes do you want this planner to support?
          </label>
          <p className="text-xs text-bone-muted">
            You can list topics to study, books to move through, skills to strengthen, or longer
            arcs you want Kiaros to keep in view.
          </p>
          <textarea
            placeholder="e.g., Depth psychology, astrology fundamentals, music theory, a reading rhythm for The Secret Doctrine, writing practice, and steadier long-form learning..."
            {...register("study_focus")}
            disabled={isSubmitting}
            rows={6}
            className="w-full resize-none rounded-xl border border-border/80 bg-stone-950/70 px-4 py-3 text-bone placeholder:text-bone-muted/45 focus:outline-none focus:ring-2 focus:ring-leather-400"
          />
        </div>

        {saveError && <p className="text-sm text-destructive">{saveError}</p>}
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full rounded-2xl border border-leather-400/50 bg-leather-500/35 px-4 py-3 font-medium text-bone shadow-glow hover:bg-leather-500/45 disabled:opacity-50"
        >
          {isSubmitting ? "Saving..." : "Continue"}
        </button>
      </form>
    </div>
  );
}

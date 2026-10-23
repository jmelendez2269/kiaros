"use client";

import { BRAND } from "@/lib/brand";

export type CycleFormState = {
  enabled: boolean;
  cycleLength: number;
  periodLength: number;
  lastPeriodStart: string;
};

type Props = {
  state: CycleFormState;
  onChange: (next: CycleFormState) => void;
  disabled?: boolean;
};

export function OnboardingCycleFields({ state, onChange, disabled }: Props) {
  const { enabled, cycleLength, periodLength, lastPeriodStart } = state;

  return (
    <div className="space-y-6 border-t border-border/50 pt-6">
      <div className="space-y-2">
        <p className="text-sm font-medium text-bone">Optional energy layer</p>
        <p className="text-xs leading-relaxed text-bone-muted">
          If it supports you, {BRAND.product} can take your cycle into account as part of your planning
          rhythm. You can change this later in Settings.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 text-sm">
        {[
          { phase: "Menstrual", days: "Days 1-5", desc: "Rest, reflect, release" },
          { phase: "Follicular", days: "Days 6-13", desc: "Plan, initiate, explore" },
          { phase: "Ovulatory", days: "Days 14-17", desc: "Connect, lead, communicate" },
          { phase: "Luteal", days: "Days 18-28", desc: "Focus, refine, complete" },
        ].map(({ phase, days, desc }) => (
          <div key={phase} className="rounded-xl border border-border/70 bg-stone-950/55 p-3">
            <p className="font-medium text-bone">{phase}</p>
            <p className="text-xs text-bone-muted">
              {days} - {desc}
            </p>
          </div>
        ))}
      </div>

      <label className="flex cursor-pointer items-center gap-3">
        <div
          onClick={() => !disabled && onChange({ ...state, enabled: !enabled })}
          className={`relative h-6 w-11 rounded-full transition-colors ${enabled ? "bg-leather-400" : "bg-stone-700"}`}
        >
          <span
            className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${enabled ? "translate-x-5" : ""}`}
          />
        </div>
        <span className="text-sm font-medium text-bone">Track my cycle with {BRAND.product}</span>
      </label>

      {enabled && (
        <div className="space-y-5 pl-1">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <label className="font-medium text-bone">Average cycle length</label>
              <span className="text-bone-muted">{cycleLength} days</span>
            </div>
            <input
              type="range"
              min={21}
              max={35}
              value={cycleLength}
              disabled={disabled}
              onChange={(e) => onChange({ ...state, cycleLength: Number(e.target.value) })}
              className="w-full accent-[#b8a07b]"
            />
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <label className="font-medium text-bone">Average period length</label>
              <span className="text-bone-muted">{periodLength} days</span>
            </div>
            <input
              type="range"
              min={2}
              max={8}
              value={periodLength}
              disabled={disabled}
              onChange={(e) => onChange({ ...state, periodLength: Number(e.target.value) })}
              className="w-full accent-[#b8a07b]"
            />
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-bone">
              First day of your last period <span className="font-normal text-bone-muted">(optional)</span>
            </label>
            <input
              type="date"
              value={lastPeriodStart}
              disabled={disabled}
              onChange={(e) => onChange({ ...state, lastPeriodStart: e.target.value })}
              className="w-full rounded-xl border border-border/80 bg-stone-950/70 px-4 py-3 text-bone focus:outline-none focus:ring-2 focus:ring-leather-400"
            />
          </div>
        </div>
      )}
    </div>
  );
}

export function cycleStateToProfilePayload(state: CycleFormState) {
  return {
    cycle_enabled: state.enabled,
    avg_cycle_length: state.enabled ? state.cycleLength : null,
    avg_period_length: state.enabled ? state.periodLength : null,
    last_period_start: state.enabled && state.lastPeriodStart ? state.lastPeriodStart : null,
  };
}

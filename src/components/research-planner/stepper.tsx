"use client";

import { Check } from "lucide-react";
import { NativeSelect } from "@/components/ui/native-select";
import { PLAN_STEPS } from "@/lib/research-planner/constants";
import { cn } from "@/lib/utils";

export function Stepper({
  current,
  reached,
  done,
  onSelect,
}: {
  current: number;
  /** Furthest step the user has reached; only steps up to here can show as complete. */
  reached: number;
  done: ReadonlySet<number>;
  onSelect: (step: number) => void;
}) {
  const step = PLAN_STEPS[current - 1];
  return (
    <div className="mb-6">
      {/* Compact version for phones and small tablets */}
      <div className="md:hidden">
        <div className="mb-2 flex items-baseline justify-between gap-3">
          <p className="text-sm font-semibold">
            Step {current} of {PLAN_STEPS.length}
            <span className="font-normal text-muted-foreground"> · {step.title}</span>
          </p>
        </div>
        <div
          role="progressbar"
          aria-label="Plan progress"
          aria-valuemin={1}
          aria-valuemax={PLAN_STEPS.length}
          aria-valuenow={current}
          aria-valuetext={`Step ${current} of ${PLAN_STEPS.length}: ${step.title}`}
          className="mb-3 h-1.5 overflow-hidden rounded-full bg-border"
        >
          <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${(current / PLAN_STEPS.length) * 100}%` }} />
        </div>
        <NativeSelect aria-label="Jump to step" value={current} onChange={(e) => onSelect(Number(e.target.value))}>
          {PLAN_STEPS.map((s) => (
            <option key={s.id} value={s.id}>
              {s.id}. {s.title}
              {done.has(s.id) ? " ✓" : ""}
            </option>
          ))}
        </NativeSelect>
      </div>

      {/* Full stepper from md up */}
      <nav aria-label="Plan steps" className="hidden md:block">
        <ol className="flex items-start">
          {PLAN_STEPS.map((s, i) => {
            const active = s.id === current;
            const complete = done.has(s.id);
            return (
              <li key={s.id} className="relative flex flex-1 flex-col items-center">
                {i > 0 && (
                  <span
                    aria-hidden
                    className={cn("absolute top-4 right-1/2 h-0.5 w-full -translate-y-1/2", s.id <= Math.max(current, reached) ? "bg-primary" : "bg-border")}
                  />
                )}
                <button
                  type="button"
                  onClick={() => onSelect(s.id)}
                  aria-current={active ? "step" : undefined}
                  className="group relative z-10 flex flex-col items-center gap-2 rounded-md px-1 outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <span
                    className={cn(
                      "flex size-8 items-center justify-center rounded-full border-2 text-sm font-bold transition-colors",
                      active && "border-primary bg-primary text-primary-foreground",
                      !active && complete && "border-primary bg-primary-soft text-primary-text",
                      !active && !complete && "border-border bg-background text-muted-foreground group-hover:border-border-strong",
                    )}
                  >
                    {complete && !active ? <Check aria-hidden className="size-4" /> : s.id}
                  </span>
                  <span className={cn("text-center text-xs font-semibold", active ? "text-foreground" : "text-muted-foreground")}>
                    {s.short}
                    {complete && !active && <span className="sr-only"> (complete)</span>}
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
      </nav>
    </div>
  );
}

import { Check, FileDown } from "lucide-react";
import { AppWindow, Tag } from "@/components/marketing/mockups/parts";
import { cn } from "@/lib/utils";

const STEPS = ["Context", "Goals", "Methods", "Participants", "Materials", "Logistics", "Review"];

export function PlannerPreview() {
  return (
    <AppWindow title="Research Planner · Pantry onboarding study">
      <div className="grid sm:grid-cols-[150px_1fr]">
        <ol className="hidden space-y-0.5 border-r border-border p-3 sm:block">
          {STEPS.map((step, i) => (
            <li
              key={step}
              className={cn(
                "flex items-center gap-2 rounded-md px-2 py-1.5 text-xs font-semibold",
                i === 2 ? "bg-primary-soft text-primary-text" : "text-muted-foreground",
              )}
            >
              <span
                className={cn(
                  "flex size-4 items-center justify-center rounded-full text-[9px]",
                  i < 2 ? "bg-primary text-primary-foreground" : "ring-1 ring-border-strong",
                )}
              >
                {i < 2 ? <Check className="size-2.5" /> : i + 1}
              </span>
              {step}
            </li>
          ))}
        </ol>
        <div className="space-y-3 p-4">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[13px] font-bold">Methods</p>
            <Tag tone="success">Saved just now</Tag>
          </div>
          <div className="rounded-lg border border-border-strong p-3">
            <p className="text-[12px] font-bold">Goal: learn why new users stop before their first plan</p>
            <p className="mt-1 text-xs text-muted-foreground">Suggested for this goal. Optional, nothing is selected for you.</p>
            <div className="mt-2.5 flex flex-wrap gap-1.5">
              <Tag tone="primary">✓ User interviews · 8</Tag>
              <Tag tone="primary">✓ Usability test · 5</Tag>
              <Tag tone="outline">Diary study</Tag>
            </div>
          </div>
          <div className="rounded-lg border border-dashed border-border-strong p-3 text-xs text-muted-foreground">
            <p className="font-semibold text-foreground">Starter discussion guide</p>
            <p className="mt-1">Tell me about the last time you planned meals for [a typical week]…</p>
          </div>
          <div className="flex gap-1.5 text-xs font-semibold">
            {["PDF", "Word", "Markdown"].map((f) => (
              <span key={f} className="inline-flex items-center gap-1 rounded-md border border-border-strong px-2 py-1">
                <FileDown className="size-3" />
                {f}
              </span>
            ))}
          </div>
        </div>
      </div>
    </AppWindow>
  );
}

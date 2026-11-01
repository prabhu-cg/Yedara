import { AppWindow, ObsChip, Tag } from "@/components/marketing/mockups/parts";
import { cn } from "@/lib/utils";

const TABS = ["Research material", "Affinity board", "Insights", "Report"];

export function SynthesizerPreview() {
  return (
    <AppWindow title="Research Synthesizer · Pantry onboarding study">
      <div className="flex gap-1 border-b border-border px-3 pt-2">
        {TABS.map((tab) => (
          <span
            key={tab}
            className={cn(
              "border-b-2 px-2.5 pb-2 text-xs font-semibold",
              tab === "Insights" ? "border-primary text-foreground" : "hidden border-transparent text-muted-foreground sm:block",
            )}
          >
            {tab}
          </span>
        ))}
      </div>
      <div className="space-y-3 p-4">
        <div className="rounded-xl border border-border-strong p-3.5">
          <div className="flex flex-wrap gap-1.5">
            <Tag tone="warning">Research interpretation</Tag>
            <Tag tone="outline">Confidence: medium</Tag>
          </div>
          <p className="mt-2 text-[13px] leading-snug font-bold">New users stall before they build their first plan.</p>
          <dl className="mt-2.5 grid gap-1 text-xs text-muted-foreground">
            <div>
              <dt className="inline font-semibold text-foreground">Theme: </dt>
              <dd className="inline">Unclear first step</dd>
            </div>
            <div>
              <dt className="inline font-semibold text-foreground">Recommended action: </dt>
              <dd className="inline">Test a guided first screen</dd>
            </div>
          </dl>
          <div className="mt-3 flex items-center gap-1.5 text-xs">
            <span className="font-semibold text-muted-foreground">Evidence</span>
            <ObsChip id="O3" />
            <ObsChip id="O7" hot />
          </div>
        </div>
        <div className="rounded-xl border border-dashed border-warning/60 bg-warning-soft/60 p-3 text-xs">
          <span className="font-bold text-warning">No evidence linked</span>
          <span className="text-foreground/80"> · “Price estimates feel unreliable” can&apos;t be saved as an insight until it cites an observation.</span>
        </div>
      </div>
    </AppWindow>
  );
}

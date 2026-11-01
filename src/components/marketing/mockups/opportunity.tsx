import { AppWindow, ObsChip, Tag } from "@/components/marketing/mockups/parts";

/** Concept preview only: this tool is not built yet, so the frame says so and shows no scores. */
export function OpportunityPreview() {
  return (
    <AppWindow title="Opportunity Analyzer · Concept">
      <div className="p-4">
        <div className="flex items-center gap-2">
          <Tag tone="primary">In development</Tag>
          <span className="text-xs text-muted-foreground">Not available yet</span>
        </div>
        <p className="mt-4 text-xs font-bold">Waiting to be scored</p>
        <div className="mt-2 rounded-lg border border-border-strong p-3.5">
          <p className="text-[13px] font-bold">Blank screen, no sense of where to begin.</p>
          <p className="mt-1 text-xs text-muted-foreground">Flagged from Journey Mapper · stage: First plan</p>
          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
            <span className="font-semibold text-muted-foreground">Evidence</span>
            <ObsChip id="O7" hot />
            <Tag tone="outline">Impact: not scored</Tag>
            <Tag tone="outline">Effort: not scored</Tag>
          </div>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          Opportunities you flag in the Journey Mapper are saved now and will appear here.
        </p>
      </div>
    </AppWindow>
  );
}

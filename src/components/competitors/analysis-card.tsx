import Link from "next/link";
import { Clock, FolderKanban, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { AnalysisActionsMenu } from "@/components/competitors/analysis-actions-menu";
import { COMPETITOR_TOTAL_STEPS } from "@/lib/competitors/constants";
import type { AnalysisListItem } from "@/lib/competitors/queries";
import { formatRelativeTime } from "@/lib/format";

export function AnalysisCard({ analysis }: { analysis: AnalysisListItem }) {
  const completed = analysis.status === "completed";
  return (
    <article className="relative flex flex-col rounded-card border border-border bg-card shadow-card transition-[border-color,box-shadow] focus-within:border-primary focus-within:shadow-raised focus-within:ring-[3px] focus-within:ring-ring/50 hover:border-primary hover:shadow-raised">
      <div className="flex flex-1 flex-col gap-3 p-5">
        <div className="flex flex-wrap items-center gap-2 pr-10">
          <Badge variant={completed ? "default" : "secondary"}>{completed ? "Completed" : "Draft"}</Badge>
        </div>
        <h3 className="text-base font-semibold [overflow-wrap:anywhere]">
          <Link href={`/tools/competitor-analyzer/${analysis.id}`} className="outline-none after:absolute after:inset-0 after:rounded-card hover:text-primary-text">
            {analysis.title}
          </Link>
        </h3>
        <div className="mt-auto flex flex-wrap items-center gap-x-4 gap-y-1 pt-1 text-xs text-muted-foreground">
          {analysis.project_name && (
            <span className="inline-flex items-center gap-1.5"><FolderKanban aria-hidden className="size-3.5" />{analysis.project_name}</span>
          )}
          <span className="inline-flex items-center gap-1.5"><Users aria-hidden className="size-3.5" />{analysis.competitor_count} {analysis.competitor_count === 1 ? "competitor" : "competitors"}</span>
          <span className="inline-flex items-center gap-1.5"><Clock aria-hidden className="size-3.5" />Edited {formatRelativeTime(analysis.updated_at)}</span>
          {!completed && <span className="tabular-nums">Step {analysis.current_step} of {COMPETITOR_TOTAL_STEPS}</span>}
        </div>
      </div>
      <div className="absolute top-3 right-3 z-10">
        <AnalysisActionsMenu analysisId={analysis.id} title={analysis.title} />
      </div>
    </article>
  );
}

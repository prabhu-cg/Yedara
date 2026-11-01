import Link from "next/link";
import { Clock, FolderKanban, Lightbulb, Quote } from "lucide-react";
import { WorkKindTag } from "@/components/projects/work-kind-tag";
import { Badge } from "@/components/ui/badge";
import { SynthesisActionsMenu } from "@/components/synthesizer/synthesis-actions-menu";
import type { SynthesisListItem } from "@/lib/synthesizer/queries";
import { formatRelativeTime } from "@/lib/format";

export function SynthesisCard({ synthesis, showTool }: { synthesis: SynthesisListItem; showTool?: boolean }) {
  const completed = synthesis.status === "completed";
  return (
    <article className="relative flex h-full w-full flex-col rounded-card border border-border bg-card shadow-card transition-[border-color,box-shadow] focus-within:border-primary focus-within:shadow-raised focus-within:ring-[3px] focus-within:ring-ring/50 hover:border-primary hover:shadow-raised">
      <div className="flex flex-1 flex-col gap-3 p-5">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 pr-10">
          {showTool && <WorkKindTag kind="synthesis" />}
          <Badge variant={completed ? "default" : "secondary"}>{completed ? "Completed" : "Draft"}</Badge>
        </div>
        <h3 className="text-base font-semibold [overflow-wrap:anywhere]">
          <Link href={`/tools/research-synthesizer/${synthesis.id}`} className="outline-none after:absolute after:inset-0 after:rounded-card hover:text-primary-text">
            {synthesis.title}
          </Link>
        </h3>
        <div className="mt-auto flex flex-wrap items-center gap-x-4 gap-y-1 pt-1 text-xs text-muted-foreground">
          {synthesis.project_name && (
            <span className="inline-flex items-center gap-1.5"><FolderKanban aria-hidden className="size-3.5" />{synthesis.project_name}</span>
          )}
          <span className="inline-flex items-center gap-1.5"><Quote aria-hidden className="size-3.5" />{synthesis.observation_count} {synthesis.observation_count === 1 ? "observation" : "observations"}</span>
          <span className="inline-flex items-center gap-1.5"><Lightbulb aria-hidden className="size-3.5" />{synthesis.insight_count} {synthesis.insight_count === 1 ? "insight" : "insights"}</span>
          <span className="inline-flex items-center gap-1.5"><Clock aria-hidden className="size-3.5" />Edited {formatRelativeTime(synthesis.updated_at)}</span>
        </div>
      </div>
      <div className="absolute top-3 right-3 z-10">
        <SynthesisActionsMenu synthesisId={synthesis.id} title={synthesis.title} />
      </div>
    </article>
  );
}

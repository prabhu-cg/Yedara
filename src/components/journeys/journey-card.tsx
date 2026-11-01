import Link from "next/link";
import { Clock, FolderKanban, Layers3, UserRound } from "lucide-react";
import { WorkKindTag } from "@/components/projects/work-kind-tag";
import { Badge } from "@/components/ui/badge";
import { JourneyActionsMenu } from "@/components/journeys/journey-actions-menu";
import { JOURNEY_STATE_LABELS } from "@/lib/journeys/constants";
import type { JourneyListItem } from "@/lib/journeys/queries";
import { formatRelativeTime } from "@/lib/format";

export function JourneyCard({ journey, showTool }: { journey: JourneyListItem; showTool?: boolean }) {
  const completed = journey.status === "completed";
  return (
    <article className="relative flex h-full w-full flex-col rounded-card border border-border bg-card shadow-card transition-[border-color,box-shadow] focus-within:border-primary focus-within:shadow-raised focus-within:ring-[3px] focus-within:ring-ring/50 hover:border-primary hover:shadow-raised">
      <div className="flex flex-1 flex-col gap-3 p-5">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 pr-10">
          {showTool && <WorkKindTag kind="journey" />}
          <Badge variant={completed ? "default" : "secondary"}>{completed ? "Completed" : "Draft"}</Badge>
          <Badge variant="outline">{JOURNEY_STATE_LABELS[journey.state]}</Badge>
        </div>
        <h3 className="text-base font-semibold [overflow-wrap:anywhere]">
          <Link href={`/tools/journey-mapper/${journey.id}`} className="outline-none after:absolute after:inset-0 after:rounded-card hover:text-primary-text">
            {journey.name}
          </Link>
        </h3>
        <div className="mt-auto flex flex-wrap items-center gap-x-4 gap-y-1 pt-1 text-xs text-muted-foreground">
          {journey.project_name && (
            <span className="inline-flex items-center gap-1.5"><FolderKanban aria-hidden className="size-3.5" />{journey.project_name}</span>
          )}
          <span className="inline-flex items-center gap-1.5"><Layers3 aria-hidden className="size-3.5" />{journey.stage_count} {journey.stage_count === 1 ? "stage" : "stages"}</span>
          {journey.persona_name && <span className="inline-flex items-center gap-1.5"><UserRound aria-hidden className="size-3.5" />{journey.persona_name}</span>}
          <span className="inline-flex items-center gap-1.5"><Clock aria-hidden className="size-3.5" />Edited {formatRelativeTime(journey.updated_at)}</span>
        </div>
      </div>
      <div className="absolute top-3 right-3 z-10">
        <JourneyActionsMenu journeyId={journey.id} title={journey.name} />
      </div>
    </article>
  );
}

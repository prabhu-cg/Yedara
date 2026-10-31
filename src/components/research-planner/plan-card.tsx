import Link from "next/link";
import { Clock, FolderKanban } from "lucide-react";
import { WorkKindTag } from "@/components/projects/work-kind-tag";
import { Badge } from "@/components/ui/badge";
import { PlanActionsMenu } from "@/components/research-planner/plan-actions-menu";
import { TOTAL_STEPS } from "@/lib/research-planner/constants";
import type { PlanListItem } from "@/lib/research-planner/queries";
import { formatRelativeTime } from "@/lib/format";

export function PlanCard({ plan, showTool }: { plan: PlanListItem; showTool?: boolean }) {
  const completed = plan.status === "completed";
  return (
    <article className="relative flex h-full w-full flex-col rounded-card border border-border bg-card shadow-card transition-[border-color,box-shadow] hover:border-primary hover:shadow-raised focus-within:border-primary focus-within:shadow-raised focus-within:ring-[3px] focus-within:ring-ring/50">
      <div className="flex flex-1 flex-col gap-3 p-5">
        <div className="flex items-center justify-between gap-2 pr-10">
          <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
            {showTool && <WorkKindTag kind="plan" />}
            <Badge variant={completed ? "default" : "secondary"}>{completed ? "Completed" : "Draft"}</Badge>
          </div>
          {!completed && (
            <span className="text-xs text-muted-foreground">
              Step {plan.current_step} of {TOTAL_STEPS}
            </span>
          )}
        </div>
        <h3 className="text-base font-semibold [overflow-wrap:anywhere]">
          <Link href={`/tools/research-planner/${plan.id}`} className="outline-none after:absolute after:inset-0 after:rounded-card hover:text-primary-text">
            {plan.title}
          </Link>
        </h3>
        <div className="mt-auto flex flex-wrap items-center gap-x-4 gap-y-1 pt-1 text-xs text-muted-foreground">
          {plan.project_name && (
            <span className="inline-flex items-center gap-1.5">
              <FolderKanban aria-hidden className="size-3.5" />
              {plan.project_name}
            </span>
          )}
          <span className="inline-flex items-center gap-1.5">
            <Clock aria-hidden className="size-3.5" />
            Edited {formatRelativeTime(plan.updated_at)}
          </span>
        </div>
      </div>
      <div className="absolute top-3 right-3 z-10">
        <PlanActionsMenu planId={plan.id} title={plan.title} />
      </div>
    </article>
  );
}

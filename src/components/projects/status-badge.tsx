import { Badge } from "@/components/ui/badge";
import { STATUS_LABELS } from "@/lib/projects/constants";
import type { ProjectStatus } from "@/lib/supabase/database.types";

/** Status colours come from the semantic soft tokens, so they hold in dark mode too. */
const STATUS_VARIANT: Record<ProjectStatus, "info" | "default" | "warning" | "success" | "secondary"> = {
  planning: "info",
  in_progress: "default",
  review: "warning",
  completed: "success",
  archived: "secondary",
};

export function StatusBadge({ status, className }: { status: ProjectStatus; className?: string }) {
  return (
    <Badge variant={STATUS_VARIANT[status]} className={className} data-status={status}>
      {STATUS_LABELS[status]}
    </Badge>
  );
}

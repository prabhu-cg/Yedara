import { Badge } from "@/components/ui/badge";
import { STATUS_LABELS } from "@/lib/projects/constants";
import type { ProjectStatus } from "@/lib/supabase/database.types";
import { cn } from "@/lib/utils";

const STATUS_CLASSES: Record<ProjectStatus, string> = {
  planning: "bg-status-planning text-status-planning-foreground",
  in_progress: "bg-status-in-progress text-status-in-progress-foreground",
  review: "bg-status-review text-status-review-foreground",
  completed: "bg-status-completed text-status-completed-foreground",
  archived: "bg-status-archived text-status-archived-foreground",
};

export function StatusBadge({ status, className }: { status: ProjectStatus; className?: string }) {
  return (
    <Badge className={cn("border-0", STATUS_CLASSES[status], className)} data-status={status}>
      {STATUS_LABELS[status]}
    </Badge>
  );
}

import Link from "next/link";
import { Building2, Clock } from "lucide-react";
import { StatusBadge } from "@/components/projects/status-badge";
import { ProjectActionsMenu } from "@/components/projects/project-actions-menu";
import { projectTypeLabel } from "@/lib/projects/constants";
import { formatRelativeTime } from "@/lib/format";
import type { Project } from "@/lib/projects/queries";

export function ProjectCard({ project }: { project: Project }) {
  const archived = project.status === "archived";
  return (
    <article className="relative flex flex-col rounded-xl border border-border bg-card transition-colors focus-within:ring-2 focus-within:ring-ring hover:border-input">
      <div className="flex flex-1 flex-col gap-3 p-5">
        <div className="flex items-start justify-between gap-2 pr-10">
          <StatusBadge status={project.status} />
          <span className="text-xs text-muted-foreground">{projectTypeLabel(project.project_type)}</span>
        </div>
        <div className="space-y-1">
          <h3 className="text-base font-semibold [overflow-wrap:anywhere]">
            {/* The stretched link makes the whole card clickable without nesting interactive elements. */}
            <Link
              href={`/projects/${project.id}`}
              className="outline-none after:absolute after:inset-0 after:rounded-xl hover:text-primary"
            >
              {project.name}
            </Link>
          </h3>
          {project.description && (
            <p className="line-clamp-2 text-sm text-muted-foreground">{project.description}</p>
          )}
        </div>
        <div className="mt-auto flex flex-wrap items-center gap-x-4 gap-y-1 pt-1 text-xs text-muted-foreground">
          {project.client && (
            <span className="inline-flex items-center gap-1.5">
              <Building2 aria-hidden className="size-3.5" />
              {project.client}
            </span>
          )}
          <span className="inline-flex items-center gap-1.5">
            <Clock aria-hidden className="size-3.5" />
            Edited {formatRelativeTime(project.updated_at)}
          </span>
        </div>
      </div>
      <div className="absolute top-3 right-3 z-10">
        <ProjectActionsMenu projectId={project.id} projectName={project.name} archived={archived} />
      </div>
    </article>
  );
}

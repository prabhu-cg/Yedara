import Link from "next/link";
import { FolderOpen } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * The parent project of a piece of research, as a link back to it. Every tool page shows it beside its back
 * link, so it is always clear which project a plan, persona, analysis, synthesis or journey belongs to, and one
 * click returns to that project's page.
 */
export function ProjectChip({ project, className }: { project: { id: string; name: string } | null | undefined; className?: string }) {
  if (!project) return null;
  return (
    <Link
      href={`/projects/${project.id}`}
      title={`Back to project: ${project.name}`}
      className={cn(
        "inline-flex max-w-full items-center gap-1.5 rounded-full border border-border-strong bg-background py-1 pr-3 pl-2.5 text-sm transition-colors outline-none hover:bg-muted focus-visible:ring-[3px] focus-visible:ring-ring/40",
        className,
      )}
    >
      <FolderOpen aria-hidden className="size-4 shrink-0 text-primary-text" />
      <span className="shrink-0 text-muted-foreground">Project</span>
      <span className="min-w-0 truncate font-semibold text-foreground">{project.name}</span>
    </Link>
  );
}

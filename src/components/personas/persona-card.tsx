import Link from "next/link";
import { Clock, FolderKanban, Quote } from "lucide-react";
import { WorkKindTag } from "@/components/projects/work-kind-tag";
import { Badge } from "@/components/ui/badge";
import { PersonaAvatar } from "@/components/personas/persona-avatar";
import { PersonaActionsMenu } from "@/components/personas/persona-actions-menu";
import { PersonaTypeBadge } from "@/components/personas/persona-type";
import { PERSONA_TOTAL_STEPS } from "@/lib/personas/constants";
import type { PersonaListItem } from "@/lib/personas/queries";
import { formatRelativeTime } from "@/lib/format";

export function PersonaCard({ persona, showTool }: { persona: PersonaListItem; showTool?: boolean }) {
  const completed = persona.status === "completed";
  return (
    <article className="relative flex h-full w-full flex-col rounded-card border border-border bg-card shadow-card transition-[border-color,box-shadow] focus-within:border-primary focus-within:shadow-raised focus-within:ring-[3px] focus-within:ring-ring/50 hover:border-primary hover:shadow-raised">
      <div className="flex flex-1 flex-col gap-3 p-5">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 pr-10">
          {showTool && <WorkKindTag kind="persona" />}
          <PersonaTypeBadge type={persona.persona_type} />
          <Badge variant={completed ? "default" : "secondary"}>{completed ? "Completed" : "Draft"}</Badge>
        </div>
        <div className="flex items-center gap-3">
          <PersonaAvatar avatarId={persona.avatar} name={persona.name} decorative className="size-11 text-sm" />
          <h3 className="min-w-0 text-base font-semibold [overflow-wrap:anywhere]">
            <Link href={`/tools/persona-builder/${persona.id}`} className="outline-none after:absolute after:inset-0 after:rounded-card hover:text-primary-text">
              {persona.name}
            </Link>
          </h3>
        </div>
        <div className="mt-auto flex flex-wrap items-center gap-x-4 gap-y-1 pt-1 text-xs text-muted-foreground">
          {persona.project_name && (
            <span className="inline-flex items-center gap-1.5"><FolderKanban aria-hidden className="size-3.5" />{persona.project_name}</span>
          )}
          <span className="inline-flex items-center gap-1.5"><Quote aria-hidden className="size-3.5" />{persona.evidence_count} evidence {persona.evidence_count === 1 ? "item" : "items"}</span>
          <span className="inline-flex items-center gap-1.5"><Clock aria-hidden className="size-3.5" />Edited {formatRelativeTime(persona.updated_at)}</span>
          {!completed && <span className="tabular-nums">Step {persona.current_step} of {PERSONA_TOTAL_STEPS}</span>}
        </div>
      </div>
      <div className="absolute top-3 right-3 z-10">
        <PersonaActionsMenu personaId={persona.id} name={persona.name} />
      </div>
    </article>
  );
}

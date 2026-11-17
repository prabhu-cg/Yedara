import Link from "next/link";
import { Clock, FolderKanban, Link2, StickyNote, UserRound } from "lucide-react";
import { EmpathyActionsMenu } from "@/components/empathy/empathy-actions-menu";
import { PersonaAvatar } from "@/components/personas/persona-avatar";
import { WorkKindTag } from "@/components/projects/work-kind-tag";
import { Badge } from "@/components/ui/badge";
import type { EmpathyListItem } from "@/lib/empathy/queries";
import { formatRelativeTime } from "@/lib/format";

export function EmpathyCard({ map, showTool }: { map: EmpathyListItem; showTool?: boolean }) {
  const completed = map.status === "completed";
  const subject = map.persona_name ?? map.subject;
  return (
    <article className="relative flex h-full w-full flex-col rounded-card border border-border bg-card transition-[border-color,box-shadow] focus-within:border-primary focus-within:shadow-raised focus-within:ring-[3px] focus-within:ring-ring/50 hover:border-primary hover:shadow-raised">
      <div className="flex flex-1 flex-col gap-3 p-5">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 pr-10">
          {showTool && <WorkKindTag kind="empathy" />}
          <Badge variant={completed ? "default" : "secondary"}>{completed ? "Completed" : "Draft"}</Badge>
        </div>
        <h3 className="text-base font-semibold [overflow-wrap:anywhere]">
          <Link href={`/tools/empathy-mapper/${map.id}`} className="outline-none after:absolute after:inset-0 after:rounded-card hover:text-primary-text">
            {map.title}
          </Link>
        </h3>
        {subject && (
          <p className="inline-flex items-center gap-2 text-sm text-muted-foreground">
            {map.persona_name ? <PersonaAvatar avatarId={map.persona_avatar} name={map.persona_name} decorative className="size-5 text-[9px]" /> : <UserRound aria-hidden className="size-4" />}
            {subject}
          </p>
        )}
        <div className="mt-auto flex flex-wrap items-center gap-x-4 gap-y-1 pt-1 text-xs text-muted-foreground">
          {map.project_name && <span className="inline-flex items-center gap-1.5"><FolderKanban aria-hidden className="size-3.5" />{map.project_name}</span>}
          <span className="inline-flex items-center gap-1.5 tabular-nums"><StickyNote aria-hidden className="size-3.5" />{map.note_count} {map.note_count === 1 ? "note" : "notes"}</span>
          <span className="inline-flex items-center gap-1.5 tabular-nums"><Link2 aria-hidden className="size-3.5" />{map.evidence_count} with evidence</span>
          <span className="inline-flex items-center gap-1.5"><Clock aria-hidden className="size-3.5" />Edited {formatRelativeTime(map.updated_at)}</span>
        </div>
      </div>
      <div className="absolute top-3 right-3 z-10">
        <EmpathyActionsMenu mapId={map.id} title={map.title} />
      </div>
    </article>
  );
}

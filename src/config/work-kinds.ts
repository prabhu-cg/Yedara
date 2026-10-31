import { ClipboardList, FolderKanban, Target, UserRound, type LucideIcon } from "lucide-react";

/** The things a person creates in Yedara, as the workspace lists them. */
export type WorkKind = "project" | "plan" | "persona" | "analysis";

export const WORK_KINDS: Record<
  WorkKind,
  { label: string; /** Short label for tight columns. */ short: string; icon: LucideIcon; basePath: string; newPath: string | null }
> = {
  project: { label: "Project", short: "Project", icon: FolderKanban, basePath: "/projects", newPath: "/projects/new" },
  plan: { label: "Research plan", short: "Plan", icon: ClipboardList, basePath: "/tools/research-planner", newPath: "/tools/research-planner/new" },
  persona: { label: "Persona", short: "Persona", icon: UserRound, basePath: "/tools/persona-builder", newPath: "/tools/persona-builder/new" },
  analysis: { label: "Competitor analysis", short: "Analysis", icon: Target, basePath: "/tools/competitor-analyzer", newPath: "/tools/competitor-analyzer/new" },
};

export const workHref = (kind: WorkKind, id: string) => `${WORK_KINDS[kind].basePath}/${id}`;

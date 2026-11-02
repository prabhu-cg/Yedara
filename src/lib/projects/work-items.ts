import { workHref, type WorkKind } from "@/config/work-kinds";
import { PERSONA_TOTAL_STEPS } from "@/lib/personas/constants";
import { COMPETITOR_TOTAL_STEPS } from "@/lib/competitors/constants";
import { TOTAL_STEPS } from "@/lib/research-planner/constants";

export type ProjectWorkKind = Exclude<WorkKind, "project">;

/** One row of a project's research, whichever tool made it. */
export type WorkItem = {
  kind: ProjectWorkKind;
  id: string;
  title: string;
  href: string;
  completed: boolean;
  /** Where an unfinished item is up to, e.g. "Step 3 of 7". Null when completed. */
  progress: string | null;
  createdAt: string;
  updatedAt: string;
  /** Personas only: the chosen portrait id, empty for initials. */
  avatar?: string;
};

type Source = { id: string; status: string; current_step?: number; created_at: string; updated_at: string };

const toItem = (kind: ProjectWorkKind, title: string, total: number | null, s: Source): WorkItem => {
  const completed = s.status === "completed";
  return {
    kind,
    id: s.id,
    title,
    href: workHref(kind, s.id),
    completed,
    progress: completed || total === null || s.current_step === undefined ? null : `Step ${s.current_step} of ${total}`,
    createdAt: s.created_at,
    updatedAt: s.updated_at,
  };
};

export function buildWorkItems(input: {
  plans: (Source & { title: string })[];
  personas: (Source & { name: string; avatar?: string })[];
  analyses: (Source & { title: string })[];
  syntheses?: (Source & { title: string })[];
  journeys?: (Source & { name: string })[];
}): WorkItem[] {
  return [
    ...input.plans.map((p) => toItem("plan", p.title, TOTAL_STEPS, p)),
    ...input.personas.map((p) => ({ ...toItem("persona", p.name, PERSONA_TOTAL_STEPS, p), avatar: p.avatar ?? "" })),
    ...input.analyses.map((a) => toItem("analysis", a.title, COMPETITOR_TOTAL_STEPS, a)),
    ...(input.syntheses ?? []).map((s) => toItem("synthesis", s.title, null, s)),
    ...(input.journeys ?? []).map((j) => toItem("journey", j.name, null, j)),
  ].sort((a, b) => a.createdAt.localeCompare(b.createdAt)); // oldest first: the order the work was started, so editing never reshuffles it
}

export const WORK_VIEWS = ["cards", "table"] as const;
export type WorkView = (typeof WORK_VIEWS)[number];

export const WORK_FILTERS = ["all", "plan", "persona", "analysis", "synthesis", "journey"] as const;
export type WorkFilter = (typeof WORK_FILTERS)[number];

/** Read `?view=` and `?type=` defensively: anything unknown falls back to the default. */
export function parseWorkParams(params: Record<string, string | string[] | undefined>): { view: WorkView; type: WorkFilter } {
  const one = (v: string | string[] | undefined) => (typeof v === "string" ? v : undefined);
  const view = WORK_VIEWS.find((v) => v === one(params.view)) ?? "cards";
  const type = WORK_FILTERS.find((t) => t === one(params.type)) ?? "all";
  return { view, type };
}

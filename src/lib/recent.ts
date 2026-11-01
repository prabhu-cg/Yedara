import "server-only";
import { requireUser } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import { workHref, type WorkKind } from "@/config/work-kinds";

export type RecentItem = {
  kind: WorkKind;
  id: string;
  title: string;
  href: string;
  /** The project it belongs to, for items that are not projects themselves. */
  project: string | null;
  updatedAt: string;
};

/** Merge per-table results into one most-recent-first list. */
export function mergeRecent(items: RecentItem[], limit: number): RecentItem[] {
  return [...items].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, limit);
}

/**
 * What the person touched last across projects, plans, personas and analyses, for the Recent page.
 * `limit` caps the merged list; each table is read to that same depth so one busy tool cannot
 * crowd the others out of a filtered view. RLS scopes every table to the signed-in owner.
 */
export async function getRecentItems(limit = 100): Promise<RecentItem[]> {
  try {
    await requireUser();
    const supabase = await createClient();
    const [projects, plans, personas, analyses, syntheses, journeys] = await Promise.all([
      supabase.from("projects").select("id, name, updated_at").neq("status", "archived").order("updated_at", { ascending: false }).limit(limit),
      supabase.from("research_plans").select("id, title, project_id, updated_at").order("updated_at", { ascending: false }).limit(limit),
      supabase.from("personas").select("id, name, project_id, updated_at").order("updated_at", { ascending: false }).limit(limit),
      supabase.from("competitor_analyses").select("id, title, project_id, updated_at").order("updated_at", { ascending: false }).limit(limit),
      supabase.from("research_syntheses").select("id, title, project_id, updated_at").order("updated_at", { ascending: false }).limit(limit),
      supabase.from("journeys").select("id, name, project_id, updated_at").order("updated_at", { ascending: false }).limit(limit),
    ]);

    const projectIds = [
      ...new Set([...(plans.data ?? []), ...(personas.data ?? []), ...(analyses.data ?? []), ...(syntheses.data ?? []), ...(journeys.data ?? [])].map((r) => r.project_id)),
    ];
    const names = new Map<string, string>();
    if (projectIds.length) {
      const { data } = await supabase.from("projects").select("id, name").in("id", projectIds);
      for (const p of data ?? []) names.set(p.id, p.name);
    }

    const item = (kind: WorkKind, id: string, title: string, updatedAt: string, projectId?: string): RecentItem => ({
      kind,
      id,
      title,
      href: workHref(kind, id),
      project: projectId ? (names.get(projectId) ?? null) : null,
      updatedAt,
    });

    return mergeRecent(
      [
        ...(projects.data ?? []).map((r) => item("project", r.id, r.name, r.updated_at)),
        ...(plans.data ?? []).map((r) => item("plan", r.id, r.title, r.updated_at, r.project_id)),
        ...(personas.data ?? []).map((r) => item("persona", r.id, r.name, r.updated_at, r.project_id)),
        ...(analyses.data ?? []).map((r) => item("analysis", r.id, r.title, r.updated_at, r.project_id)),
        ...(syntheses.data ?? []).map((r) => item("synthesis", r.id, r.title, r.updated_at, r.project_id)),
        ...(journeys.data ?? []).map((r) => item("journey", r.id, r.name, r.updated_at, r.project_id)),
      ],
      limit,
    );
  } catch (error) {
    console.error("[recent] lookup failed:", error instanceof Error ? error.message : "unknown");
    throw new Error("We couldn't load your recent work.");
  }
}

import "server-only";
import { notFound } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/database.types";
import { SECTION_KEYS, isSectionKey, type SectionKey } from "@/lib/research-planner/constants";
import { normalizeContent, type AnySectionContent } from "@/lib/research-planner/schemas";

export type PlanRow = Database["public"]["Tables"]["research_plans"]["Row"];

const PLAN_COLUMNS = "id, owner_id, project_id, title, status, current_step, completed_at, created_at, updated_at";

export type LoadedSection = {
  content: AnySectionContent;
  position: number;
  source: "manual" | "template" | "ai";
  updatedAt: string;
};

export type PlanBundle = {
  plan: PlanRow;
  project: { id: string; name: string; client: string | null; industry: string | null } | null;
  sections: Partial<Record<SectionKey, LoadedSection>>;
  preparedBy: string | null;
};

/**
 * Loads a plan with its sections and project. Everything is read through the
 * caller's RLS-bound client, so a plan owned by someone else simply returns
 * `null`, exactly like one that does not exist.
 */
export async function loadPlanBundle(planId: string): Promise<PlanBundle | null> {
  if (!z.uuid().safeParse(planId).success) return null;
  const supabase = await createClient();

  const { data: plan, error } = await supabase
    .from("research_plans")
    .select(PLAN_COLUMNS)
    .eq("id", planId)
    .maybeSingle();
  if (error) {
    console.error("[planner] load plan failed:", error.code ?? error.message);
    throw new Error("We couldn't load this research plan.");
  }
  if (!plan) return null;

  const [sectionsRes, projectRes, profileRes] = await Promise.all([
    supabase
      .from("research_plan_sections")
      .select("key, position, content, source, updated_at")
      .eq("plan_id", planId)
      .order("position", { ascending: true }),
    supabase.from("projects").select("id, name, client, industry").eq("id", plan.project_id).maybeSingle(),
    supabase.from("profiles").select("full_name").eq("id", plan.owner_id).maybeSingle(),
  ]);
  if (sectionsRes.error) {
    console.error("[planner] load sections failed:", sectionsRes.error.code ?? sectionsRes.error.message);
    throw new Error("We couldn't load this research plan.");
  }

  const sections: PlanBundle["sections"] = {};
  for (const row of sectionsRes.data ?? []) {
    if (!isSectionKey(row.key)) continue;
    sections[row.key] = {
      content: normalizeContent(row.key, row.content),
      position: row.position,
      source: row.source,
      updatedAt: row.updated_at,
    };
  }

  return {
    plan,
    project: projectRes.data ?? null,
    sections,
    preparedBy: profileRes.data?.full_name ?? null,
  };
}

export async function getPlanBundle(planId: string) {
  await requireUser();
  const bundle = await loadPlanBundle(planId);
  if (!bundle) notFound();
  return bundle;
}

export type PlanListItem = PlanRow & { project_name: string | null };

export async function listPlans(options: { projectId?: string } = {}): Promise<PlanListItem[]> {
  await requireUser();
  const supabase = await createClient();

  let query = supabase.from("research_plans").select(PLAN_COLUMNS).order("updated_at", { ascending: false }).limit(100);
  if (options.projectId && z.uuid().safeParse(options.projectId).success) {
    query = query.eq("project_id", options.projectId);
  }
  const { data: plans, error } = await query;
  if (error) {
    console.error("[planner] list failed:", error.code ?? error.message);
    throw new Error("We couldn't load your research plans.");
  }
  if (!plans?.length) return [];

  const ids = [...new Set(plans.map((p) => p.project_id))];
  const { data: projects } = await supabase.from("projects").select("id, name").in("id", ids);
  const names = new Map((projects ?? []).map((p) => [p.id, p.name]));
  return plans.map((p) => ({ ...p, project_name: names.get(p.project_id) ?? null }));
}

/** Projects a plan can be attached to (archived projects are excluded). */
export async function listProjectOptions() {
  await requireUser();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("projects")
    .select("id, name, client, industry")
    .neq("status", "archived")
    .order("name", { ascending: true })
    .limit(200);
  if (error) {
    console.error("[planner] projects failed:", error.code ?? error.message);
    throw new Error("We couldn't load your projects.");
  }
  return data ?? [];
}

export const ALL_SECTION_KEYS = SECTION_KEYS;

"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/auth/dal";
import { fail, flattenErrors, GENERIC_ERROR, type ActionResult } from "@/lib/action-result";
import { createClient } from "@/lib/supabase/server";
import {
  CORE_SECTION_KEYS,
  DEFAULT_POSITIONS,
  MATERIAL_KEYS,
  SECTION_KEYS,
  TOTAL_STEPS,
  isMaterialKey,
  isSectionKey,
  type MaterialKey,
  type SectionKey,
} from "@/lib/research-planner/constants";
import { applicableMaterials, generateMaterial, type MaterialContext } from "@/lib/research-planner/materials";
import { loadPlanBundle } from "@/lib/research-planner/queries";
import { SECTION_SCHEMAS, emptyContent, normalizeContent, type AnySectionContent } from "@/lib/research-planner/schemas";
import { getCompletionIssues } from "@/lib/research-planner/validation";
import type { Json } from "@/lib/supabase/database.types";

const idSchema = z.uuid({ error: "Research plan not found." });
const titleSchema = z.string().trim().min(1, "Give your research a title").max(160, "Use 160 characters or fewer");

const NOT_FOUND = "Research plan not found.";
const asJson = (value: unknown) => value as Json;

function revalidatePlans(planId?: string, projectId?: string) {
  revalidatePath("/tools/research-planner");
  if (planId) revalidatePath(`/tools/research-planner/${planId}`);
  if (projectId) revalidatePath(`/projects/${projectId}`);
}

/**
 * Confirms the plan exists and belongs to the signed-in user. RLS enforces the
 * same rule in the database; this gives a clean "not found" and a second layer.
 */
async function ownedPlan(planId: string, userId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("research_plans")
    .select("id, project_id, status")
    .eq("id", planId)
    .eq("owner_id", userId)
    .maybeSingle();
  return { supabase, plan: data };
}

export async function createPlanAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  const parsed = z.object({ title: titleSchema, projectId: z.uuid({ error: "Choose a project" }) }).safeParse(input);
  if (!parsed.success) return fail("Check the highlighted fields.", flattenErrors(parsed.error));

  const user = await requireUser();
  const supabase = await createClient();

  const { data: project } = await supabase
    .from("projects")
    .select("id")
    .eq("id", parsed.data.projectId)
    .eq("owner_id", user.id)
    .maybeSingle();
  if (!project) return fail("Choose one of your projects.", { projectId: ["Choose one of your projects"] });

  const { data: plan, error } = await supabase
    .from("research_plans")
    .insert({ owner_id: user.id, project_id: project.id, title: parsed.data.title })
    .select("id")
    .single();
  if (error || !plan) {
    console.error("[planner] create failed:", error?.code ?? error?.message);
    return fail("We couldn't create the plan. Please try again.");
  }

  const { error: sectionError } = await supabase.from("research_plan_sections").insert(
    CORE_SECTION_KEYS.map((key) => ({
      plan_id: plan.id,
      key,
      position: DEFAULT_POSITIONS[key],
      content: asJson(emptyContent(key)),
      source: "manual" as const,
    })),
  );
  if (sectionError) {
    console.error("[planner] create sections failed:", sectionError.code ?? sectionError.message);
    // Don't leave a plan without its sections behind.
    await supabase.from("research_plans").delete().eq("id", plan.id).eq("owner_id", user.id);
    return fail("We couldn't create the plan. Please try again.");
  }

  revalidatePlans(undefined, project.id);
  return { ok: true, data: { id: plan.id } };
}

const metaSchema = z.object({
  title: titleSchema.optional(),
  projectId: z.uuid().optional(),
  currentStep: z.number().int().min(1).max(TOTAL_STEPS).optional(),
});

export async function updatePlanMetaAction(planId: string, input: unknown): Promise<ActionResult<{ savedAt: string }>> {
  const id = idSchema.safeParse(planId);
  if (!id.success) return fail(NOT_FOUND);
  const parsed = metaSchema.safeParse(input);
  if (!parsed.success) return fail("Check the highlighted fields.", flattenErrors(parsed.error));

  const user = await requireUser();
  const { supabase, plan } = await ownedPlan(id.data, user.id);
  if (!plan) return fail(NOT_FOUND);

  const update: { title?: string; project_id?: string; current_step?: number } = {};
  if (parsed.data.title !== undefined) update.title = parsed.data.title;
  if (parsed.data.currentStep !== undefined) update.current_step = parsed.data.currentStep;
  if (parsed.data.projectId !== undefined && parsed.data.projectId !== plan.project_id) {
    const { data: project } = await supabase
      .from("projects")
      .select("id")
      .eq("id", parsed.data.projectId)
      .eq("owner_id", user.id)
      .maybeSingle();
    if (!project) return fail("Choose one of your projects.", { projectId: ["Choose one of your projects"] });
    update.project_id = project.id;
  }
  if (!Object.keys(update).length) return { ok: true, data: { savedAt: new Date().toISOString() } };

  const { data, error } = await supabase
    .from("research_plans")
    .update(update)
    .eq("id", id.data)
    .eq("owner_id", user.id)
    .select("id, updated_at")
    .maybeSingle();
  if (error) {
    console.error("[planner] meta update failed:", error.code ?? error.message);
    return fail("We couldn't save your changes.");
  }
  if (!data) return fail(NOT_FOUND);
  if (update.project_id) revalidatePlans(id.data, update.project_id);
  return { ok: true, data: { savedAt: data.updated_at } };
}

export async function savePlanSectionAction(
  planId: string,
  key: string,
  content: unknown,
): Promise<ActionResult<{ savedAt: string; content: AnySectionContent }>> {
  const id = idSchema.safeParse(planId);
  if (!id.success || !isSectionKey(key)) return fail(NOT_FOUND);
  const parsed = SECTION_SCHEMAS[key].safeParse(content);
  if (!parsed.success) return fail("Some of that content is too long or invalid.", flattenErrors(parsed.error));

  const user = await requireUser();
  const { supabase, plan } = await ownedPlan(id.data, user.id);
  if (!plan) return fail(NOT_FOUND);

  const value = asJson(parsed.data);
  const { data, error } = await supabase
    .from("research_plan_sections")
    .update({ content: value })
    .eq("plan_id", id.data)
    .eq("key", key)
    .select("id, updated_at");
  if (error) {
    console.error("[planner] section save failed:", error.code ?? error.message);
    return fail("We couldn't save your changes.");
  }

  let savedAt = data?.[0]?.updated_at;
  if (!savedAt) {
    // Only core sections may be created on demand; materials are created by generation.
    if (isMaterialKey(key)) return fail("Section not found.");
    const { data: created, error: insertError } = await supabase
      .from("research_plan_sections")
      .insert({ plan_id: id.data, key, position: DEFAULT_POSITIONS[key], content: value })
      .select("updated_at")
      .single();
    if (insertError || !created) {
      console.error("[planner] section create failed:", insertError?.code ?? insertError?.message);
      return fail("We couldn't save your changes.");
    }
    savedAt = created.updated_at;
  }
  return { ok: true, data: { savedAt, content: parsed.data as AnySectionContent } };
}

export type GeneratedSection = { key: MaterialKey; content: AnySectionContent; position: number };

const generateSchema = z.object({
  keys: z.array(z.enum(MATERIAL_KEYS)).max(MATERIAL_KEYS.length).optional(),
  overwrite: z.boolean().optional(),
  blank: z.boolean().optional(),
});

/**
 * Creates starter materials for the selected methods. Deterministic templates
 * today; the same sections can be filled by an AI provider later.
 */
export async function generateMaterialsAction(
  planId: string,
  input: unknown,
): Promise<ActionResult<{ sections: GeneratedSection[] }>> {
  const id = idSchema.safeParse(planId);
  if (!id.success) return fail(NOT_FOUND);
  const parsed = generateSchema.safeParse(input ?? {});
  if (!parsed.success) return fail("Invalid request.");

  const user = await requireUser();
  const { supabase, plan } = await ownedPlan(id.data, user.id);
  if (!plan) return fail(NOT_FOUND);
  const bundle = await loadPlanBundle(id.data);
  if (!bundle) return fail(NOT_FOUND);

  const get = <K extends SectionKey>(key: K) => normalizeContent(key, bundle.sections[key]?.content);
  const methods = get("methods");
  const applicable = applicableMaterials(methods.selected);
  const targets = (parsed.data.keys ?? applicable).filter((k) => applicable.includes(k));
  if (!targets.length) return fail("None of your selected methods need materials.");

  const ctx: MaterialContext = {
    subject: bundle.project?.name ?? bundle.plan.title,
    title: bundle.plan.title,
    context: get("context"),
    goals: get("goals"),
    participants: get("participants"),
    logistics: get("logistics"),
  };

  const out: GeneratedSection[] = [];
  for (const key of targets) {
    const existing = bundle.sections[key];
    if (existing && !parsed.data.overwrite) continue;
    const content = parsed.data.blank ? emptyContent(key) : generateMaterial(key, ctx);
    const source = parsed.data.blank ? "manual" : "template";
    const checked = SECTION_SCHEMAS[key].parse(content);

    if (existing) {
      const { error } = await supabase
        .from("research_plan_sections")
        .update({ content: asJson(checked), source })
        .eq("plan_id", id.data)
        .eq("key", key);
      if (error) {
        console.error("[planner] regenerate failed:", error.code ?? error.message);
        return fail(GENERIC_ERROR);
      }
      out.push({ key, content: checked as AnySectionContent, position: existing.position });
    } else {
      const position = DEFAULT_POSITIONS[key];
      const { error } = await supabase
        .from("research_plan_sections")
        .insert({ plan_id: id.data, key, position, content: asJson(checked), source });
      if (error) {
        console.error("[planner] generate failed:", error.code ?? error.message);
        return fail(GENERIC_ERROR);
      }
      out.push({ key, content: checked as AnySectionContent, position });
    }
  }
  revalidatePlans(id.data);
  return { ok: true, data: { sections: out } };
}

export async function reorderSectionsAction(planId: string, keys: unknown): Promise<ActionResult> {
  const id = idSchema.safeParse(planId);
  if (!id.success) return fail(NOT_FOUND);
  const parsed = z
    .array(z.enum(SECTION_KEYS))
    .min(1)
    .max(SECTION_KEYS.length)
    .refine((list) => new Set(list).size === list.length, "Duplicate sections")
    .safeParse(keys);
  if (!parsed.success) return fail("Invalid section order.");

  const user = await requireUser();
  const { supabase, plan } = await ownedPlan(id.data, user.id);
  if (!plan) return fail(NOT_FOUND);

  const { error } = await supabase.rpc("reorder_research_plan_sections", {
    p_plan_id: id.data,
    p_keys: parsed.data,
  });
  if (error) {
    console.error("[planner] reorder failed:", error.code ?? error.message);
    return fail("We couldn't save the new order.");
  }
  revalidatePlans(id.data);
  return { ok: true };
}

export async function setPlanStatusAction(
  planId: string,
  status: unknown,
): Promise<ActionResult<{ status: "draft" | "completed" }>> {
  const id = idSchema.safeParse(planId);
  const next = z.enum(["draft", "completed"]).safeParse(status);
  if (!id.success || !next.success) return fail(NOT_FOUND);

  const user = await requireUser();
  const { supabase, plan } = await ownedPlan(id.data, user.id);
  if (!plan) return fail(NOT_FOUND);

  if (next.data === "completed") {
    // Re-check on the server: the client's view is never trusted for completion.
    const bundle = await loadPlanBundle(id.data);
    if (!bundle) return fail(NOT_FOUND);
    const get = <K extends "context" | "goals" | "methods" | "participants">(key: K) =>
      normalizeContent(key, bundle.sections[key]?.content);
    const issues = getCompletionIssues(
      { title: bundle.plan.title, projectId: bundle.plan.project_id },
      { context: get("context"), goals: get("goals"), methods: get("methods"), participants: get("participants") },
    );
    if (issues.length) {
      return fail(`Complete the required fields first: ${issues.map((i) => i.message.toLowerCase()).join("; ")}.`);
    }
  }

  const { error } = await supabase
    .from("research_plans")
    .update({ status: next.data, completed_at: next.data === "completed" ? new Date().toISOString() : null })
    .eq("id", id.data)
    .eq("owner_id", user.id);
  if (error) {
    console.error("[planner] status failed:", error.code ?? error.message);
    return fail(GENERIC_ERROR);
  }
  revalidatePlans(id.data, plan.project_id);
  return { ok: true, data: { status: next.data } };
}

export async function duplicatePlanAction(planId: string): Promise<ActionResult<{ id: string }>> {
  const id = idSchema.safeParse(planId);
  if (!id.success) return fail(NOT_FOUND);

  const user = await requireUser();
  const { supabase, plan } = await ownedPlan(id.data, user.id);
  if (!plan) return fail(NOT_FOUND);

  const { data, error } = await supabase.rpc("duplicate_research_plan", { p_plan_id: id.data });
  if (error || !data) {
    console.error("[planner] duplicate failed:", error?.code ?? error?.message);
    return fail("We couldn't duplicate the plan. Please try again.");
  }
  revalidatePlans(undefined, plan.project_id);
  return { ok: true, data: { id: data } };
}

export async function deletePlanAction(planId: string): Promise<ActionResult> {
  const id = idSchema.safeParse(planId);
  if (!id.success) return fail(NOT_FOUND);

  const user = await requireUser();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("research_plans")
    .delete()
    .eq("id", id.data)
    .eq("owner_id", user.id)
    .select("id, project_id");
  if (error) {
    console.error("[planner] delete failed:", error.code ?? error.message);
    return fail("We couldn't delete the plan. Please try again.");
  }
  if (!data?.length) return fail(NOT_FOUND);
  revalidatePlans(undefined, data[0].project_id);
  return { ok: true };
}

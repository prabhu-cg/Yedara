"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/auth/dal";
import { fail, flattenErrors, type ActionResult } from "@/lib/action-result";
import { createClient } from "@/lib/supabase/server";
import { completionIssues, EMPATHY_LIMITS, QUADRANT_INFO, type Quadrant } from "@/lib/empathy/constants";
import { empathyItemInputSchema, empathyItemPatchSchema, empathyMetaSchema, empathyPatchSchema, type EmpathyItemRow } from "@/lib/empathy/schemas";

const NOT_FOUND = "Empathy map not found.";
const SAVE_ERROR = "We couldn't save your changes. Please try again.";
const idSchema = z.uuid({ error: NOT_FOUND });
const uuid = z.uuid();

function revalidateMaps(projectId?: string) {
  revalidatePath("/recent");
  revalidatePath("/tools/empathy-mapper");
  if (projectId) revalidatePath(`/projects/${projectId}`);
}

/** The owner always comes from the verified session; RLS enforces the same rule in the database. */
async function owned(mapId: unknown) {
  const id = idSchema.safeParse(mapId);
  if (!id.success) return null;
  const user = await requireUser();
  const supabase = await createClient();
  const { data } = await supabase
    .from("empathy_maps")
    .select("id, project_id, persona_id, title, subject, status, not_researched")
    .eq("id", id.data)
    .eq("owner_id", user.id)
    .maybeSingle();
  return data ? { supabase, user, map: data } : null;
}
type Ctx = NonNullable<Awaited<ReturnType<typeof owned>>>;

/** A persona must be the caller's own and belong to the map's project. Returns its name, or null when it doesn't fit. */
async function personaName(ctx: { supabase: Ctx["supabase"] }, personaId: string, projectId: string) {
  const { data } = await ctx.supabase.from("personas").select("name").eq("id", personaId).eq("project_id", projectId).maybeSingle();
  return data?.name ?? null;
}

export async function createEmpathyMapAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  const parsed = empathyMetaSchema.safeParse(input);
  if (!parsed.success) return fail("Check the highlighted fields.", flattenErrors(parsed.error));
  const user = await requireUser();
  const supabase = await createClient();
  const { data: project } = await supabase.from("projects").select("id").eq("id", parsed.data.projectId).eq("owner_id", user.id).maybeSingle();
  if (!project) return fail("Choose one of your projects.", { projectId: ["Choose one of your projects"] });

  let subject = parsed.data.subject;
  if (parsed.data.personaId) {
    const name = await personaName({ supabase }, parsed.data.personaId, project.id);
    if (!name) return fail("Choose a persona from this project.", { personaId: ["Choose a persona from this project"] });
    subject = subject || name;
  }
  if (!subject) return fail("Say who this map is about.", { subject: ["Say who this map is about, or choose a persona"] });

  const { data, error } = await supabase
    .from("empathy_maps")
    .insert({ owner_id: user.id, project_id: project.id, persona_id: parsed.data.personaId || null, title: parsed.data.title, subject, context: parsed.data.context || null })
    .select("id")
    .single();
  if (error || !data) {
    console.error("[empathy] create failed:", error?.code ?? error?.message);
    return fail("We couldn't create the empathy map. Please try again.");
  }
  revalidateMaps(project.id);
  return { ok: true, data: { id: data.id } };
}

export async function updateEmpathyMapAction(mapId: string, input: unknown): Promise<ActionResult<{ savedAt: string; subject: string | null }>> {
  const parsed = empathyPatchSchema.safeParse(input);
  if (!parsed.success) return fail("Check the highlighted fields.", flattenErrors(parsed.error));
  const ctx = await owned(mapId);
  if (!ctx) return fail(NOT_FOUND);
  const d = parsed.data;
  const update: { title?: string; persona_id?: string | null; subject?: string | null; context?: string | null; not_researched?: Quadrant[] } = {};
  if (d.title !== undefined) update.title = d.title;
  if (d.context !== undefined) update.context = d.context || null;

  let subject = d.subject !== undefined ? d.subject : (ctx.map.subject ?? "");
  if (d.personaId !== undefined) {
    if (d.personaId) {
      const name = await personaName(ctx, d.personaId, ctx.map.project_id);
      if (!name) return fail("Choose a persona from this project.", { personaId: ["Choose a persona from this project"] });
      subject = subject || name;
    }
    update.persona_id = d.personaId || null;
  }
  if (d.subject !== undefined || d.personaId !== undefined) {
    const willHavePersona = d.personaId !== undefined ? Boolean(d.personaId) : Boolean(ctx.map.persona_id);
    if (!subject && !willHavePersona) return fail("Say who this map is about.", { subject: ["Say who this map is about, or choose a persona"] });
    update.subject = subject || null;
  }

  if (d.notResearched !== undefined) {
    const { data: notes } = await ctx.supabase.from("empathy_items").select("quadrant").eq("map_id", ctx.map.id).in("quadrant", d.notResearched);
    if (notes?.length) return fail("A quadrant with notes can't be marked not yet researched. Remove its notes first.");
    update.not_researched = [...new Set(d.notResearched)];
  }
  if (!Object.keys(update).length) return { ok: true, data: { savedAt: new Date().toISOString(), subject: ctx.map.subject } };

  const { data, error } = await ctx.supabase.from("empathy_maps").update(update).eq("id", ctx.map.id).eq("owner_id", ctx.user.id).select("updated_at, subject").maybeSingle();
  if (error || !data) return fail(error ? SAVE_ERROR : NOT_FOUND);
  revalidateMaps(ctx.map.project_id);
  return { ok: true, data: { savedAt: data.updated_at, subject: data.subject } };
}

export async function setEmpathyStatusAction(mapId: string, status: "draft" | "completed"): Promise<ActionResult<{ status: "draft" | "completed" }>> {
  if (status !== "draft" && status !== "completed") return fail("Unknown status.");
  const ctx = await owned(mapId);
  if (!ctx) return fail(NOT_FOUND);
  if (status === "completed") {
    const { data: items } = await ctx.supabase.from("empathy_items").select("quadrant, observation_id").eq("map_id", ctx.map.id);
    const missing = completionIssues(items ?? [], ctx.map.not_researched ?? []);
    if (missing.length) {
      const names = missing.map((q) => QUADRANT_INFO[q].label).join(", ");
      return fail(`Add a note to ${names}, or mark ${missing.length === 1 ? "it" : "them"} not yet researched, before marking this complete.`);
    }
  }
  const { error } = await ctx.supabase.from("empathy_maps").update({ status, completed_at: status === "completed" ? new Date().toISOString() : null }).eq("id", ctx.map.id).eq("owner_id", ctx.user.id);
  if (error) return fail(SAVE_ERROR);
  revalidateMaps(ctx.map.project_id);
  return { ok: true, data: { status } };
}

export async function deleteEmpathyMapAction(mapId: string): Promise<ActionResult> {
  const ctx = await owned(mapId);
  if (!ctx) return fail(NOT_FOUND);
  const { error } = await ctx.supabase.from("empathy_maps").delete().eq("id", ctx.map.id).eq("owner_id", ctx.user.id);
  if (error) return fail("We couldn't delete the empathy map. Please try again.");
  revalidateMaps(ctx.map.project_id);
  return { ok: true };
}

export async function duplicateEmpathyMapAction(mapId: string): Promise<ActionResult<{ id: string }>> {
  const ctx = await owned(mapId);
  if (!ctx) return fail(NOT_FOUND);
  const { data, error } = await ctx.supabase.rpc("duplicate_empathy_map", { p_map_id: ctx.map.id });
  if (error || !data) return fail("We couldn't copy the empathy map. Please try again.");
  revalidateMaps(ctx.map.project_id);
  return { ok: true, data: { id: data } };
}

/* --------------------------------- notes --------------------------------- */

const ITEM_ROW = "id, map_id, quadrant, content, evidence_note, observation_id, position, created_at, updated_at";

export async function addEmpathyItemAction(mapId: string, input: unknown): Promise<ActionResult<{ item: EmpathyItemRow; notResearched: Quadrant[] }>> {
  const parsed = empathyItemInputSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Check the details.", flattenErrors(parsed.error));
  const ctx = await owned(mapId);
  if (!ctx) return fail(NOT_FOUND);
  const { data: existing } = await ctx.supabase.from("empathy_items").select("position, quadrant").eq("map_id", ctx.map.id);
  if ((existing?.length ?? 0) >= EMPATHY_LIMITS.itemsPerMap) return fail(`An empathy map can have up to ${EMPATHY_LIMITS.itemsPerMap} notes.`);
  const position = (existing ?? []).filter((i) => i.quadrant === parsed.data.quadrant).reduce((max, i) => Math.max(max, i.position), -10) + 10;
  const { data, error } = await ctx.supabase
    .from("empathy_items")
    .insert({ map_id: ctx.map.id, quadrant: parsed.data.quadrant, content: parsed.data.content, evidence_note: parsed.data.evidenceNote || null, observation_id: parsed.data.observationId || null, position })
    .select(ITEM_ROW)
    .single();
  if (error || !data) {
    // A cited observation that isn't the caller's own is refused by RLS.
    return fail(parsed.data.observationId ? "We couldn't link that observation." : SAVE_ERROR);
  }
  // A quadrant with a note in it is no longer "not yet researched".
  const current = ctx.map.not_researched ?? [];
  const next = current.filter((q) => q !== parsed.data.quadrant);
  if (next.length !== current.length) await ctx.supabase.from("empathy_maps").update({ not_researched: next }).eq("id", ctx.map.id).eq("owner_id", ctx.user.id);
  return { ok: true, data: { item: data as EmpathyItemRow, notResearched: next } };
}

export async function updateEmpathyItemAction(mapId: string, itemId: string, patch: unknown): Promise<ActionResult<{ savedAt: string }>> {
  const parsed = empathyItemPatchSchema.safeParse(patch);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Check the details.", flattenErrors(parsed.error));
  const ctx = await owned(mapId);
  if (!ctx || !uuid.safeParse(itemId).success) return fail(NOT_FOUND);
  const update: { content?: string; evidence_note?: string | null; observation_id?: string | null } = {};
  if (parsed.data.content !== undefined) update.content = parsed.data.content;
  if (parsed.data.evidenceNote !== undefined) update.evidence_note = parsed.data.evidenceNote || null;
  if (parsed.data.observationId !== undefined) update.observation_id = parsed.data.observationId || null;
  if (!Object.keys(update).length) return { ok: true, data: { savedAt: new Date().toISOString() } };
  const { data, error } = await ctx.supabase.from("empathy_items").update(update).eq("id", itemId).eq("map_id", ctx.map.id).select("updated_at").maybeSingle();
  if (error) return fail(parsed.data.observationId ? "We couldn't link that observation." : SAVE_ERROR);
  if (!data) return fail("Note not found.");
  return { ok: true, data: { savedAt: data.updated_at } };
}

export async function deleteEmpathyItemAction(mapId: string, itemId: string): Promise<ActionResult> {
  const ctx = await owned(mapId);
  if (!ctx || !uuid.safeParse(itemId).success) return fail(NOT_FOUND);
  const { error } = await ctx.supabase.from("empathy_items").delete().eq("id", itemId).eq("map_id", ctx.map.id);
  if (error) return fail("We couldn't delete that. Please try again.");
  return { ok: true };
}

export async function reorderEmpathyItemsAction(mapId: string, ids: string[]): Promise<ActionResult> {
  const parsed = z.array(z.uuid()).min(1).max(EMPATHY_LIMITS.itemsPerMap).safeParse(ids);
  if (!parsed.success) return fail("That order isn't valid.");
  const ctx = await owned(mapId);
  if (!ctx) return fail(NOT_FOUND);
  const { error } = await ctx.supabase.rpc("reorder_empathy_items", { p_map_id: ctx.map.id, p_ids: parsed.data });
  if (error) return fail("We couldn't reorder the notes. Please try again.");
  return { ok: true };
}

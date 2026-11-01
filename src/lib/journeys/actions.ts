"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/auth/dal";
import { fail, flattenErrors, type ActionResult } from "@/lib/action-result";
import { createClient } from "@/lib/supabase/server";
import { candidateFromItem } from "@/lib/journeys/opportunities";
import { JOURNEY_LIMITS, type JourneyState } from "@/lib/journeys/constants";
import { itemInputSchema, itemPatchSchema, journeyMetaSchema, journeyPatchSchema, stageNameSchema, stagePatchSchema, type CandidateRow, type ItemRow, type StageRow } from "@/lib/journeys/schemas";

const NOT_FOUND = "Journey not found.";
const SAVE_ERROR = "We couldn't save your changes. Please try again.";
const idSchema = z.uuid({ error: NOT_FOUND });
const uuid = z.uuid();

function revalidateJourneys(projectId?: string) {
  revalidatePath("/recent");
  revalidatePath("/tools/journey-mapper");
  if (projectId) revalidatePath(`/projects/${projectId}`);
}

/** The owner always comes from the verified session; RLS enforces the same rule in the database. */
async function owned(journeyId: unknown) {
  const id = idSchema.safeParse(journeyId);
  if (!id.success) return null;
  const user = await requireUser();
  const supabase = await createClient();
  const { data } = await supabase.from("journeys").select("id, project_id, name, status").eq("id", id.data).eq("owner_id", user.id).maybeSingle();
  return data ? { supabase, user, journey: data } : null;
}
type Ctx = NonNullable<Awaited<ReturnType<typeof owned>>>;

/** A persona must be the caller's own and belong to the journey's project. */
async function personaFits(ctx: { supabase: Ctx["supabase"] }, personaId: string, projectId: string) {
  if (!personaId) return true;
  const { data } = await ctx.supabase.from("personas").select("id").eq("id", personaId).eq("project_id", projectId).maybeSingle();
  return Boolean(data);
}

export async function createJourneyAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  const parsed = journeyMetaSchema.safeParse(input);
  if (!parsed.success) return fail("Check the highlighted fields.", flattenErrors(parsed.error));
  const user = await requireUser();
  const supabase = await createClient();
  const { data: project } = await supabase.from("projects").select("id").eq("id", parsed.data.projectId).eq("owner_id", user.id).maybeSingle();
  if (!project) return fail("Choose one of your projects.", { projectId: ["Choose one of your projects"] });
  if (!(await personaFits({ supabase }, parsed.data.personaId, project.id))) return fail("Choose a persona from this project.", { personaId: ["Choose a persona from this project"] });

  const { data, error } = await supabase
    .from("journeys")
    .insert({ owner_id: user.id, project_id: project.id, persona_id: parsed.data.personaId || null, name: parsed.data.name, journey_type: parsed.data.journeyType, scenario: parsed.data.scenario || null, state: parsed.data.state })
    .select("id")
    .single();
  if (error || !data) {
    console.error("[journeys] create failed:", error?.code ?? error?.message);
    return fail("We couldn't create the journey. Please try again.");
  }
  revalidateJourneys(project.id);
  return { ok: true, data: { id: data.id } };
}

export async function updateJourneyMetaAction(journeyId: string, input: unknown): Promise<ActionResult<{ savedAt: string }>> {
  const parsed = journeyPatchSchema.safeParse(input);
  if (!parsed.success) return fail("Check the highlighted fields.", flattenErrors(parsed.error));
  const ctx = await owned(journeyId);
  if (!ctx) return fail(NOT_FOUND);
  const d = parsed.data;
  const update: { name?: string; project_id?: string; persona_id?: string | null; journey_type?: "customer" | "user" | "service" | "employee"; scenario?: string | null; state?: JourneyState } = {};
  if (d.name !== undefined) update.name = d.name;
  if (d.journeyType !== undefined) update.journey_type = d.journeyType;
  if (d.scenario !== undefined) update.scenario = d.scenario || null;
  if (d.state !== undefined) update.state = d.state;
  const projectId = d.projectId ?? ctx.journey.project_id;
  if (d.projectId !== undefined && d.projectId !== ctx.journey.project_id) {
    const { data: project } = await ctx.supabase.from("projects").select("id").eq("id", d.projectId).eq("owner_id", ctx.user.id).maybeSingle();
    if (!project) return fail("Choose one of your projects.", { projectId: ["Choose one of your projects"] });
    update.project_id = project.id;
    // The old persona belongs to the old project, so it is cleared unless a new one is chosen.
    if (d.personaId === undefined) update.persona_id = null;
  }
  if (d.personaId !== undefined) {
    if (!(await personaFits(ctx, d.personaId, projectId))) return fail("Choose a persona from this project.", { personaId: ["Choose a persona from this project"] });
    update.persona_id = d.personaId || null;
  }
  if (!Object.keys(update).length) return { ok: true, data: { savedAt: new Date().toISOString() } };
  const { data, error } = await ctx.supabase.from("journeys").update(update).eq("id", ctx.journey.id).eq("owner_id", ctx.user.id).select("updated_at").maybeSingle();
  if (error || !data) return fail(error ? SAVE_ERROR : NOT_FOUND);
  revalidateJourneys(update.project_id ?? ctx.journey.project_id);
  return { ok: true, data: { savedAt: data.updated_at } };
}

export async function setJourneyStatusAction(journeyId: string, status: "draft" | "completed"): Promise<ActionResult<{ status: "draft" | "completed" }>> {
  if (status !== "draft" && status !== "completed") return fail("Unknown status.");
  const ctx = await owned(journeyId);
  if (!ctx) return fail(NOT_FOUND);
  if (status === "completed") {
    const { data } = await ctx.supabase.from("journey_stages").select("id").eq("journey_id", ctx.journey.id).limit(1);
    if (!data?.length) return fail("Add at least one stage before marking this complete.");
  }
  const { error } = await ctx.supabase.from("journeys").update({ status, completed_at: status === "completed" ? new Date().toISOString() : null }).eq("id", ctx.journey.id).eq("owner_id", ctx.user.id);
  if (error) return fail(SAVE_ERROR);
  revalidateJourneys(ctx.journey.project_id);
  return { ok: true, data: { status } };
}

export async function deleteJourneyAction(journeyId: string): Promise<ActionResult> {
  const ctx = await owned(journeyId);
  if (!ctx) return fail(NOT_FOUND);
  const { error } = await ctx.supabase.from("journeys").delete().eq("id", ctx.journey.id).eq("owner_id", ctx.user.id);
  if (error) return fail("We couldn't delete the journey. Please try again.");
  revalidateJourneys(ctx.journey.project_id);
  return { ok: true };
}

export async function duplicateJourneyAction(journeyId: string, state?: JourneyState): Promise<ActionResult<{ id: string }>> {
  const ctx = await owned(journeyId);
  if (!ctx) return fail(NOT_FOUND);
  const { data, error } = await ctx.supabase.rpc("duplicate_journey", { p_journey_id: ctx.journey.id, p_state: state ?? null });
  if (error || !data) return fail("We couldn't copy the journey. Please try again.");
  revalidateJourneys(ctx.journey.project_id);
  return { ok: true, data: { id: data } };
}

/* -------------------------------- stages -------------------------------- */

const STAGE_ROW = "id, journey_id, name, position, emotion, emotion_note, created_at, updated_at";

export async function addStageAction(journeyId: string, name: unknown): Promise<ActionResult<{ stage: StageRow }>> {
  const parsed = stageNameSchema.safeParse(name);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Name the stage.");
  const ctx = await owned(journeyId);
  if (!ctx) return fail(NOT_FOUND);
  const { data: existing } = await ctx.supabase.from("journey_stages").select("position").eq("journey_id", ctx.journey.id);
  if ((existing?.length ?? 0) >= JOURNEY_LIMITS.stages) return fail(`A journey can have up to ${JOURNEY_LIMITS.stages} stages.`);
  const position = (existing ?? []).reduce((max, s) => Math.max(max, s.position), -10) + 10;
  const { data, error } = await ctx.supabase.from("journey_stages").insert({ journey_id: ctx.journey.id, name: parsed.data, position }).select(STAGE_ROW).single();
  if (error || !data) return fail(SAVE_ERROR);
  return { ok: true, data: { stage: data as StageRow } };
}

export async function updateStageAction(journeyId: string, stageId: string, patch: unknown): Promise<ActionResult<{ savedAt: string }>> {
  const parsed = stagePatchSchema.safeParse(patch);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Check the stage.", flattenErrors(parsed.error));
  const ctx = await owned(journeyId);
  if (!ctx || !uuid.safeParse(stageId).success) return fail(NOT_FOUND);
  const update: { name?: string; emotion?: number | null; emotion_note?: string | null } = {};
  if (parsed.data.name !== undefined) update.name = parsed.data.name;
  if (parsed.data.emotion !== undefined) update.emotion = parsed.data.emotion;
  if (parsed.data.emotionNote !== undefined) update.emotion_note = parsed.data.emotionNote || null;
  if (!Object.keys(update).length) return { ok: true, data: { savedAt: new Date().toISOString() } };
  const { data, error } = await ctx.supabase.from("journey_stages").update(update).eq("id", stageId).eq("journey_id", ctx.journey.id).select("updated_at").maybeSingle();
  if (error) return fail(SAVE_ERROR);
  if (!data) return fail("Stage not found.");
  return { ok: true, data: { savedAt: data.updated_at } };
}

export async function deleteStageAction(journeyId: string, stageId: string): Promise<ActionResult> {
  const ctx = await owned(journeyId);
  if (!ctx || !uuid.safeParse(stageId).success) return fail(NOT_FOUND);
  const { error } = await ctx.supabase.from("journey_stages").delete().eq("id", stageId).eq("journey_id", ctx.journey.id);
  if (error) return fail("We couldn't delete that stage. Please try again.");
  return { ok: true };
}

export async function reorderStagesAction(journeyId: string, ids: string[]): Promise<ActionResult> {
  const parsed = z.array(z.uuid()).min(1).max(JOURNEY_LIMITS.stages).safeParse(ids);
  if (!parsed.success) return fail("That order isn't valid.");
  const ctx = await owned(journeyId);
  if (!ctx) return fail(NOT_FOUND);
  const { error } = await ctx.supabase.rpc("reorder_journey_stages", { p_journey_id: ctx.journey.id, p_ids: parsed.data });
  if (error) return fail("We couldn't reorder the stages. Please try again.");
  return { ok: true };
}

/* --------------------------------- items --------------------------------- */

const ITEM_ROW = "id, journey_id, stage_id, kind, content, evidence_note, observation_id, position, created_at, updated_at";

export async function addItemAction(journeyId: string, input: unknown): Promise<ActionResult<{ item: ItemRow }>> {
  const parsed = itemInputSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Check the details.", flattenErrors(parsed.error));
  const ctx = await owned(journeyId);
  if (!ctx) return fail(NOT_FOUND);
  const { data: stage } = await ctx.supabase.from("journey_stages").select("id").eq("id", parsed.data.stageId).eq("journey_id", ctx.journey.id).maybeSingle();
  if (!stage) return fail("Stage not found.");
  const { data: existing } = await ctx.supabase.from("journey_items").select("position, stage_id, kind").eq("journey_id", ctx.journey.id);
  if ((existing?.length ?? 0) >= JOURNEY_LIMITS.itemsPerJourney) return fail(`A journey can have up to ${JOURNEY_LIMITS.itemsPerJourney} items.`);
  const position = (existing ?? []).filter((i) => i.stage_id === stage.id && i.kind === parsed.data.kind).reduce((max, i) => Math.max(max, i.position), -1) + 1;
  const { data, error } = await ctx.supabase
    .from("journey_items")
    .insert({ journey_id: ctx.journey.id, stage_id: stage.id, kind: parsed.data.kind, content: parsed.data.content, evidence_note: parsed.data.evidenceNote || null, observation_id: parsed.data.observationId || null, position })
    .select(ITEM_ROW)
    .single();
  if (error || !data) {
    // A linked observation that isn't the caller's own is refused by RLS.
    return fail(parsed.data.observationId ? "We couldn't link that observation." : SAVE_ERROR);
  }
  return { ok: true, data: { item: data as ItemRow } };
}

export async function updateItemAction(journeyId: string, itemId: string, patch: unknown): Promise<ActionResult<{ savedAt: string }>> {
  const parsed = itemPatchSchema.safeParse(patch);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Check the details.", flattenErrors(parsed.error));
  const ctx = await owned(journeyId);
  if (!ctx || !uuid.safeParse(itemId).success) return fail(NOT_FOUND);
  const update: { content?: string; evidence_note?: string | null; observation_id?: string | null } = {};
  if (parsed.data.content !== undefined) update.content = parsed.data.content;
  if (parsed.data.evidenceNote !== undefined) update.evidence_note = parsed.data.evidenceNote || null;
  if (parsed.data.observationId !== undefined) update.observation_id = parsed.data.observationId || null;
  if (!Object.keys(update).length) return { ok: true, data: { savedAt: new Date().toISOString() } };
  const { data, error } = await ctx.supabase.from("journey_items").update(update).eq("id", itemId).eq("journey_id", ctx.journey.id).select("updated_at").maybeSingle();
  if (error) return fail(parsed.data.observationId ? "We couldn't link that observation." : SAVE_ERROR);
  if (!data) return fail("Item not found.");
  return { ok: true, data: { savedAt: data.updated_at } };
}

export async function deleteItemAction(journeyId: string, itemId: string): Promise<ActionResult> {
  const ctx = await owned(journeyId);
  if (!ctx || !uuid.safeParse(itemId).success) return fail(NOT_FOUND);
  const { error } = await ctx.supabase.from("journey_items").delete().eq("id", itemId).eq("journey_id", ctx.journey.id);
  if (error) return fail("We couldn't delete that. Please try again.");
  return { ok: true };
}

/* ------------------------------ opportunities ------------------------------ */

const CANDIDATE_ROW = "id, owner_id, project_id, journey_id, stage_id, source_item_id, observation_id, title, origin_kind, journey_name, stage_name, evidence_note, status, created_at, updated_at";

/** Hands a pain point or opportunity on to the Opportunity Analyzer, keeping its stage and evidence. */
export async function convertItemToOpportunityAction(journeyId: string, itemId: string): Promise<ActionResult<{ candidate: CandidateRow }>> {
  const ctx = await owned(journeyId);
  if (!ctx || !uuid.safeParse(itemId).success) return fail(NOT_FOUND);
  const { data: item } = await ctx.supabase.from("journey_items").select("id, stage_id, kind, content, evidence_note, observation_id").eq("id", itemId).eq("journey_id", ctx.journey.id).maybeSingle();
  if (!item) return fail("Item not found.");
  const { data: stage } = await ctx.supabase.from("journey_stages").select("id, name").eq("id", item.stage_id).maybeSingle();
  if (!stage) return fail("Stage not found.");
  const candidate = candidateFromItem(item, stage, { id: ctx.journey.id, name: ctx.journey.name, project_id: ctx.journey.project_id });
  if (!candidate) return fail("Only pain points and opportunities can be added to opportunities.");

  const { data: existing } = await ctx.supabase.from("opportunity_candidates").select("id").eq("source_item_id", item.id).maybeSingle();
  if (existing) return fail("That is already in your opportunities.");
  const { data, error } = await ctx.supabase.from("opportunity_candidates").insert({ owner_id: ctx.user.id, ...candidate }).select(CANDIDATE_ROW).single();
  if (error || !data) return fail(SAVE_ERROR);
  return { ok: true, data: { candidate: data as CandidateRow } };
}

export async function removeCandidateAction(candidateId: string): Promise<ActionResult> {
  if (!uuid.safeParse(candidateId).success) return fail("Opportunity not found.");
  const user = await requireUser();
  const supabase = await createClient();
  const { error } = await supabase.from("opportunity_candidates").delete().eq("id", candidateId).eq("owner_id", user.id);
  if (error) return fail("We couldn't remove that. Please try again.");
  return { ok: true };
}

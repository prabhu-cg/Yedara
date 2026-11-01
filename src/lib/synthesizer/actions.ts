"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/auth/dal";
import { fail, flattenErrors, type ActionResult } from "@/lib/action-result";
import { createClient } from "@/lib/supabase/server";
import { LIMITS } from "@/lib/synthesizer/constants";
import {
  importInputSchema,
  insightInputSchema,
  layoutSchema,
  observationInputSchema,
  reportSchema,
  sourceInputSchema,
  synthesisMetaSchema,
  toTags,
  type CardRow,
  type InsightRow,
  type ObservationRow,
  type SourceRow,
} from "@/lib/synthesizer/schemas";
import type { Json } from "@/lib/supabase/database.types";

const NOT_FOUND = "Synthesis not found.";
const idSchema = z.uuid({ error: NOT_FOUND });
const SAVE_ERROR = "We couldn't save your changes. Please try again.";

function revalidateSyntheses(projectId?: string) {
  revalidatePath("/recent");
  revalidatePath("/tools/research-synthesizer");
  if (projectId) revalidatePath(`/projects/${projectId}`);
}

/** The owner always comes from the verified session; RLS enforces the same rule in the database. */
async function owned(synthesisId: unknown) {
  const id = idSchema.safeParse(synthesisId);
  if (!id.success) return null;
  const user = await requireUser();
  const supabase = await createClient();
  const { data } = await supabase.from("research_syntheses").select("id, project_id, status").eq("id", id.data).eq("owner_id", user.id).maybeSingle();
  return data ? { supabase, user, synthesis: data } : null;
}

const OBS_COLUMNS = "id, synthesis_id, source_id, participant_ref, kind, content, tags, position, created_at, updated_at";
const toObservation = (o: Omit<ObservationRow, "tags"> & { tags: Json }): ObservationRow => ({ ...o, tags: toTags(o.tags) });

export async function createSynthesisAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  const parsed = synthesisMetaSchema.safeParse(input);
  if (!parsed.success) return fail("Check the highlighted fields.", flattenErrors(parsed.error));
  const user = await requireUser();
  const supabase = await createClient();
  const { data: project } = await supabase.from("projects").select("id").eq("id", parsed.data.projectId).eq("owner_id", user.id).maybeSingle();
  if (!project) return fail("Choose one of your projects.", { projectId: ["Choose one of your projects"] });

  const { data: synthesis, error } = await supabase.from("research_syntheses").insert({ owner_id: user.id, project_id: project.id, title: parsed.data.title }).select("id").single();
  if (error || !synthesis) {
    console.error("[synthesizer] create failed:", error?.code ?? error?.message);
    return fail("We couldn't create the synthesis. Please try again.");
  }
  const { error: boardError } = await supabase.from("affinity_boards").insert({ synthesis_id: synthesis.id });
  if (boardError) {
    console.error("[synthesizer] create board failed:", boardError.code ?? boardError.message);
    await supabase.from("research_syntheses").delete().eq("id", synthesis.id).eq("owner_id", user.id);
    return fail("We couldn't create the synthesis. Please try again.");
  }
  revalidateSyntheses(project.id);
  return { ok: true, data: { id: synthesis.id } };
}

const metaPatchSchema = z.object({ title: synthesisMetaSchema.shape.title.optional(), projectId: z.uuid().optional() });

export async function updateSynthesisMetaAction(synthesisId: string, input: unknown): Promise<ActionResult<{ savedAt: string }>> {
  const parsed = metaPatchSchema.safeParse(input);
  if (!parsed.success) return fail("Check the highlighted fields.", flattenErrors(parsed.error));
  const ctx = await owned(synthesisId);
  if (!ctx) return fail(NOT_FOUND);
  const update: { title?: string; project_id?: string } = {};
  if (parsed.data.title !== undefined) update.title = parsed.data.title;
  if (parsed.data.projectId !== undefined && parsed.data.projectId !== ctx.synthesis.project_id) {
    const { data: project } = await ctx.supabase.from("projects").select("id").eq("id", parsed.data.projectId).eq("owner_id", ctx.user.id).maybeSingle();
    if (!project) return fail("Choose one of your projects.", { projectId: ["Choose one of your projects"] });
    update.project_id = project.id;
  }
  if (!Object.keys(update).length) return { ok: true, data: { savedAt: new Date().toISOString() } };
  const { data, error } = await ctx.supabase.from("research_syntheses").update(update).eq("id", ctx.synthesis.id).eq("owner_id", ctx.user.id).select("updated_at").maybeSingle();
  if (error || !data) return fail(error ? SAVE_ERROR : NOT_FOUND);
  revalidateSyntheses(update.project_id ?? ctx.synthesis.project_id);
  return { ok: true, data: { savedAt: data.updated_at } };
}

export async function saveReportAction(synthesisId: string, input: unknown): Promise<ActionResult<{ savedAt: string }>> {
  const parsed = reportSchema.safeParse(input);
  if (!parsed.success) return fail("Some of that text is too long.", flattenErrors(parsed.error));
  const ctx = await owned(synthesisId);
  if (!ctx) return fail(NOT_FOUND);
  const { data, error } = await ctx.supabase.from("research_syntheses").update({ report: parsed.data as Json }).eq("id", ctx.synthesis.id).eq("owner_id", ctx.user.id).select("updated_at").maybeSingle();
  if (error || !data) return fail(error ? SAVE_ERROR : NOT_FOUND);
  return { ok: true, data: { savedAt: data.updated_at } };
}

export async function setSynthesisStatusAction(synthesisId: string, status: "draft" | "completed"): Promise<ActionResult<{ status: "draft" | "completed" }>> {
  if (status !== "draft" && status !== "completed") return fail("Unknown status.");
  const ctx = await owned(synthesisId);
  if (!ctx) return fail(NOT_FOUND);
  if (status === "completed") {
    const [obs, insights, evidence] = await Promise.all([
      ctx.supabase.from("research_observations").select("id").eq("synthesis_id", ctx.synthesis.id).limit(1),
      ctx.supabase.from("research_insights").select("id").eq("synthesis_id", ctx.synthesis.id),
      ctx.supabase.from("research_insight_evidence").select("insight_id").eq("synthesis_id", ctx.synthesis.id),
    ]);
    if (!obs.data?.length) return fail("Add some research material before marking this complete.");
    if (!insights.data?.length) return fail("Add at least one insight before marking this complete.");
    const withEvidence = new Set((evidence.data ?? []).map((e) => e.insight_id));
    if (insights.data.some((i) => !withEvidence.has(i.id))) return fail("Every insight needs at least one piece of evidence before this can be marked complete.");
  }
  const { error } = await ctx.supabase.from("research_syntheses").update({ status, completed_at: status === "completed" ? new Date().toISOString() : null }).eq("id", ctx.synthesis.id).eq("owner_id", ctx.user.id);
  if (error) return fail(SAVE_ERROR);
  revalidateSyntheses(ctx.synthesis.project_id);
  return { ok: true, data: { status } };
}

export async function deleteSynthesisAction(synthesisId: string): Promise<ActionResult> {
  const ctx = await owned(synthesisId);
  if (!ctx) return fail(NOT_FOUND);
  const { error } = await ctx.supabase.from("research_syntheses").delete().eq("id", ctx.synthesis.id).eq("owner_id", ctx.user.id);
  if (error) return fail("We couldn't delete the synthesis. Please try again.");
  revalidateSyntheses(ctx.synthesis.project_id);
  return { ok: true };
}

/* ------------------------------ sources ------------------------------ */

const SOURCE_COLUMNS = "id, synthesis_id, name, source_type, participant_ref, conducted_on, notes, file_name, file_size, import_method, created_at, updated_at";

const sourceRow = (synthesisId: string, s: ReturnType<typeof sourceInputSchema.parse>) => ({
  synthesis_id: synthesisId,
  name: s.name,
  source_type: s.sourceType,
  participant_ref: s.participantRef || null,
  conducted_on: s.conductedOn || null,
  notes: s.notes || null,
  file_name: s.fileName || null,
  file_size: s.fileSize,
  import_method: s.importMethod,
});

async function sourceCount(ctx: NonNullable<Awaited<ReturnType<typeof owned>>>) {
  const { count } = await ctx.supabase.from("research_sources").select("id", { count: "exact", head: true }).eq("synthesis_id", ctx.synthesis.id);
  return count ?? 0;
}

export async function addSourceAction(synthesisId: string, input: unknown): Promise<ActionResult<{ source: SourceRow }>> {
  const parsed = sourceInputSchema.safeParse(input);
  if (!parsed.success) return fail("Check the highlighted fields.", flattenErrors(parsed.error));
  const ctx = await owned(synthesisId);
  if (!ctx) return fail(NOT_FOUND);
  if ((await sourceCount(ctx)) >= LIMITS.sourcesPerSynthesis) return fail(`A synthesis can have up to ${LIMITS.sourcesPerSynthesis} sources.`);
  const { data, error } = await ctx.supabase.from("research_sources").insert(sourceRow(ctx.synthesis.id, parsed.data)).select(SOURCE_COLUMNS).single();
  if (error || !data) return fail(SAVE_ERROR);
  return { ok: true, data: { source: data as SourceRow } };
}

export async function updateSourceAction(synthesisId: string, sourceId: string, input: unknown): Promise<ActionResult<{ source: SourceRow }>> {
  const parsed = sourceInputSchema.safeParse(input);
  if (!parsed.success) return fail("Check the highlighted fields.", flattenErrors(parsed.error));
  const ctx = await owned(synthesisId);
  if (!ctx || !z.uuid().safeParse(sourceId).success) return fail(NOT_FOUND);
  // The scope and the way a source arrived never change after it is created.
  const { synthesis_id: _scope, import_method: _method, ...patch } = sourceRow(ctx.synthesis.id, parsed.data);
  void _scope;
  void _method;
  const { data, error } = await ctx.supabase.from("research_sources").update(patch).eq("id", sourceId).eq("synthesis_id", ctx.synthesis.id).select(SOURCE_COLUMNS).maybeSingle();
  if (error) return fail(SAVE_ERROR);
  if (!data) return fail("Source not found.");
  return { ok: true, data: { source: data as SourceRow } };
}

/** Deleting a source either keeps its observations (unlinked) or deletes them with it. */
export async function deleteSourceAction(synthesisId: string, sourceId: string, deleteObservations: boolean): Promise<ActionResult<{ deletedObservationIds: string[] }>> {
  const ctx = await owned(synthesisId);
  if (!ctx || !z.uuid().safeParse(sourceId).success) return fail(NOT_FOUND);
  let deletedObservationIds: string[] = [];
  if (deleteObservations) {
    const { data, error } = await ctx.supabase.from("research_observations").delete().eq("synthesis_id", ctx.synthesis.id).eq("source_id", sourceId).select("id");
    if (error) return fail("We couldn't delete those observations. Please try again.");
    deletedObservationIds = (data ?? []).map((o) => o.id);
  }
  const { error } = await ctx.supabase.from("research_sources").delete().eq("id", sourceId).eq("synthesis_id", ctx.synthesis.id);
  if (error) return fail("We couldn't delete the source. Please try again.");
  return { ok: true, data: { deletedObservationIds } };
}

/* ---------------------------- observations ---------------------------- */

async function observationCount(ctx: NonNullable<Awaited<ReturnType<typeof owned>>>) {
  const { count } = await ctx.supabase.from("research_observations").select("id", { count: "exact", head: true }).eq("synthesis_id", ctx.synthesis.id);
  return count ?? 0;
}

async function sourceBelongs(ctx: NonNullable<Awaited<ReturnType<typeof owned>>>, sourceId: string) {
  if (!sourceId) return true;
  const { data } = await ctx.supabase.from("research_sources").select("id").eq("id", sourceId).eq("synthesis_id", ctx.synthesis.id).maybeSingle();
  return Boolean(data);
}

async function boardId(ctx: NonNullable<Awaited<ReturnType<typeof owned>>>) {
  const { data } = await ctx.supabase.from("affinity_boards").select("id").eq("synthesis_id", ctx.synthesis.id).maybeSingle();
  if (data) return data.id;
  const { data: created } = await ctx.supabase.from("affinity_boards").insert({ synthesis_id: ctx.synthesis.id }).select("id").single();
  return created?.id ?? null;
}

export async function addObservationAction(synthesisId: string, input: unknown): Promise<ActionResult<{ observation: ObservationRow; card: CardRow }>> {
  const parsed = observationInputSchema.safeParse(input);
  if (!parsed.success) return fail("Check the highlighted fields.", flattenErrors(parsed.error));
  const ctx = await owned(synthesisId);
  if (!ctx) return fail(NOT_FOUND);
  const count = await observationCount(ctx);
  if (count >= LIMITS.observationsPerSynthesis) return fail(`A synthesis can have up to ${LIMITS.observationsPerSynthesis} observations.`);
  if (!(await sourceBelongs(ctx, parsed.data.sourceId))) return fail("Choose one of this synthesis's sources.", { sourceId: ["Choose a source from this synthesis"] });
  const board = await boardId(ctx);
  if (!board) return fail(SAVE_ERROR);

  const { data: observation, error } = await ctx.supabase
    .from("research_observations")
    .insert({ synthesis_id: ctx.synthesis.id, source_id: parsed.data.sourceId || null, participant_ref: parsed.data.participantRef || null, kind: parsed.data.kind, content: parsed.data.content, tags: parsed.data.tags as Json, position: count })
    .select(OBS_COLUMNS)
    .single();
  if (error || !observation) return fail(SAVE_ERROR);
  const { data: card, error: cardError } = await ctx.supabase
    .from("affinity_cards")
    .insert({ synthesis_id: ctx.synthesis.id, board_id: board, observation_id: observation.id, position: count })
    .select("id, synthesis_id, board_id, observation_id, theme_id, position, created_at, updated_at")
    .single();
  if (cardError || !card) {
    await ctx.supabase.from("research_observations").delete().eq("id", observation.id);
    return fail(SAVE_ERROR);
  }
  revalidateSyntheses(ctx.synthesis.project_id);
  return { ok: true, data: { observation: toObservation(observation), card: card as CardRow } };
}

/** Creates the source and every confirmed statement together; undoes the lot if any part fails. */
export async function importObservationsAction(synthesisId: string, input: unknown): Promise<ActionResult<{ source: SourceRow; observations: ObservationRow[]; cards: CardRow[] }>> {
  const parsed = importInputSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Check what you are importing.", flattenErrors(parsed.error));
  const ctx = await owned(synthesisId);
  if (!ctx) return fail(NOT_FOUND);
  const count = await observationCount(ctx);
  if (count + parsed.data.statements.length > LIMITS.observationsPerSynthesis) {
    return fail(`That would go over ${LIMITS.observationsPerSynthesis} observations. Import fewer statements or delete some first.`);
  }
  if ((await sourceCount(ctx)) >= LIMITS.sourcesPerSynthesis) return fail(`A synthesis can have up to ${LIMITS.sourcesPerSynthesis} sources.`);
  const board = await boardId(ctx);
  if (!board) return fail(SAVE_ERROR);

  const { data: source, error: sourceError } = await ctx.supabase.from("research_sources").insert(sourceRow(ctx.synthesis.id, parsed.data.source)).select(SOURCE_COLUMNS).single();
  if (sourceError || !source) return fail(SAVE_ERROR);

  const undo = async () => {
    await ctx.supabase.from("research_observations").delete().eq("synthesis_id", ctx.synthesis.id).eq("source_id", source.id);
    await ctx.supabase.from("research_sources").delete().eq("id", source.id);
  };

  const { data: observations, error } = await ctx.supabase
    .from("research_observations")
    .insert(parsed.data.statements.map((content, i) => ({
      synthesis_id: ctx.synthesis.id,
      source_id: source.id,
      participant_ref: parsed.data.participantRef || parsed.data.source.participantRef || null,
      kind: parsed.data.kind,
      content,
      tags: parsed.data.tags as Json,
      position: count + i,
    })))
    .select(OBS_COLUMNS);
  if (error || !observations) { await undo(); return fail(SAVE_ERROR); }

  const ordered = [...observations].sort((a, b) => a.position - b.position);
  const { data: cards, error: cardError } = await ctx.supabase
    .from("affinity_cards")
    .insert(ordered.map((o) => ({ synthesis_id: ctx.synthesis.id, board_id: board, observation_id: o.id, position: o.position })))
    .select("id, synthesis_id, board_id, observation_id, theme_id, position, created_at, updated_at");
  if (cardError || !cards) { await undo(); return fail(SAVE_ERROR); }

  revalidateSyntheses(ctx.synthesis.project_id);
  return { ok: true, data: { source: source as SourceRow, observations: ordered.map(toObservation), cards: cards as CardRow[] } };
}

export async function updateObservationAction(synthesisId: string, observationId: string, input: unknown): Promise<ActionResult<{ observation: ObservationRow }>> {
  const parsed = observationInputSchema.safeParse(input);
  if (!parsed.success) return fail("Check the highlighted fields.", flattenErrors(parsed.error));
  const ctx = await owned(synthesisId);
  if (!ctx || !z.uuid().safeParse(observationId).success) return fail(NOT_FOUND);
  if (!(await sourceBelongs(ctx, parsed.data.sourceId))) return fail("Choose one of this synthesis's sources.", { sourceId: ["Choose a source from this synthesis"] });
  const { data, error } = await ctx.supabase
    .from("research_observations")
    .update({ source_id: parsed.data.sourceId || null, participant_ref: parsed.data.participantRef || null, kind: parsed.data.kind, content: parsed.data.content, tags: parsed.data.tags as Json })
    .eq("id", observationId)
    .eq("synthesis_id", ctx.synthesis.id)
    .select(OBS_COLUMNS)
    .maybeSingle();
  if (error) return fail(SAVE_ERROR);
  if (!data) return fail("Observation not found.");
  return { ok: true, data: { observation: toObservation(data) } };
}

export async function deleteObservationAction(synthesisId: string, observationId: string): Promise<ActionResult> {
  const ctx = await owned(synthesisId);
  if (!ctx || !z.uuid().safeParse(observationId).success) return fail(NOT_FOUND);
  const { error } = await ctx.supabase.from("research_observations").delete().eq("id", observationId).eq("synthesis_id", ctx.synthesis.id);
  if (error) return fail("We couldn't delete that observation. Please try again.");
  revalidateSyntheses(ctx.synthesis.project_id);
  return { ok: true };
}

/* ------------------------------ affinity ------------------------------ */

const layoutInputSchema = layoutSchema.extend({ zoom: z.number().min(0.5).max(1.5).optional() });

/** Saves the whole board in one transaction (themes and where every card sits). */
export async function saveLayoutAction(synthesisId: string, input: unknown): Promise<ActionResult<{ savedAt: string }>> {
  const parsed = layoutInputSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "That layout isn't valid.");
  const ctx = await owned(synthesisId);
  if (!ctx) return fail(NOT_FOUND);
  const themeIds = new Set(parsed.data.themes.map((t) => t.id));
  if (parsed.data.cards.some((c) => c.themeId !== null && !themeIds.has(c.themeId))) return fail("That layout isn't valid.");

  const { error } = await ctx.supabase.rpc("save_affinity_layout", {
    p_synthesis_id: ctx.synthesis.id,
    p_themes: parsed.data.themes.map((t, position) => ({ id: t.id, title: t.title, notes: t.notes, position })) as Json,
    p_cards: parsed.data.cards.map((c) => ({ id: c.id, theme_id: c.themeId, position: c.position })) as Json,
  });
  if (error) {
    console.error("[synthesizer] layout failed:", error.code ?? error.message);
    return fail(SAVE_ERROR);
  }
  if (parsed.data.zoom !== undefined) await ctx.supabase.from("affinity_boards").update({ zoom: parsed.data.zoom }).eq("synthesis_id", ctx.synthesis.id);
  return { ok: true, data: { savedAt: new Date().toISOString() } };
}

/* ------------------------------ insights ------------------------------ */

const INSIGHT_ROW = "id, synthesis_id, theme_id, kind, observation, pattern, user_need, problem_kind, problem_text, statement, confidence, recommended_action, position, created_at, updated_at";

async function validateInsight(ctx: NonNullable<Awaited<ReturnType<typeof owned>>>, data: ReturnType<typeof insightInputSchema.parse>) {
  const evidenceIds = [...new Set(data.evidenceIds)];
  const { data: found } = await ctx.supabase.from("research_observations").select("id").eq("synthesis_id", ctx.synthesis.id).in("id", evidenceIds);
  if ((found?.length ?? 0) !== evidenceIds.length) return { error: fail("Evidence must come from this synthesis's observations.", { evidenceIds: ["Choose observations from this synthesis"] }) };
  if (data.themeId) {
    const { data: theme } = await ctx.supabase.from("research_themes").select("id").eq("id", data.themeId).eq("synthesis_id", ctx.synthesis.id).maybeSingle();
    if (!theme) return { error: fail("Choose a theme from this synthesis.", { themeId: ["Choose a theme from this synthesis"] }) };
  }
  return { evidenceIds };
}

const insightColumns = (data: ReturnType<typeof insightInputSchema.parse>) => ({
  theme_id: data.themeId || null,
  kind: data.kind,
  observation: data.observation || null,
  pattern: data.pattern || null,
  user_need: data.userNeed || null,
  problem_kind: data.problemKind || null,
  problem_text: data.problemText || null,
  statement: data.statement,
  confidence: data.confidence,
  recommended_action: data.recommendedAction || null,
});

export async function createInsightAction(synthesisId: string, input: unknown): Promise<ActionResult<{ insight: InsightRow }>> {
  const parsed = insightInputSchema.safeParse(input);
  if (!parsed.success) return fail("Check the highlighted fields.", flattenErrors(parsed.error));
  const ctx = await owned(synthesisId);
  if (!ctx) return fail(NOT_FOUND);
  const { count } = await ctx.supabase.from("research_insights").select("id", { count: "exact", head: true }).eq("synthesis_id", ctx.synthesis.id);
  if ((count ?? 0) >= LIMITS.insights) return fail(`A synthesis can have up to ${LIMITS.insights} insights.`);
  const checked = await validateInsight(ctx, parsed.data);
  if (checked.error) return checked.error;

  const { data: insight, error } = await ctx.supabase.from("research_insights").insert({ synthesis_id: ctx.synthesis.id, position: count ?? 0, ...insightColumns(parsed.data) }).select(INSIGHT_ROW).single();
  if (error || !insight) return fail(SAVE_ERROR);
  const { error: evidenceError } = await ctx.supabase.from("research_insight_evidence").insert(checked.evidenceIds!.map((observation_id) => ({ synthesis_id: ctx.synthesis.id, insight_id: insight.id, observation_id })));
  if (evidenceError) {
    await ctx.supabase.from("research_insights").delete().eq("id", insight.id);
    return fail(SAVE_ERROR);
  }
  return { ok: true, data: { insight: { ...(insight as Omit<InsightRow, "evidence_ids">), evidence_ids: checked.evidenceIds! } } };
}

export async function updateInsightAction(synthesisId: string, insightId: string, input: unknown): Promise<ActionResult<{ insight: InsightRow }>> {
  const parsed = insightInputSchema.safeParse(input);
  if (!parsed.success) return fail("Check the highlighted fields.", flattenErrors(parsed.error));
  const ctx = await owned(synthesisId);
  if (!ctx || !z.uuid().safeParse(insightId).success) return fail(NOT_FOUND);
  const checked = await validateInsight(ctx, parsed.data);
  if (checked.error) return checked.error;
  const evidenceIds = checked.evidenceIds!;

  // Add new links first and remove old ones last, so an insight is never left without evidence.
  const { data: current } = await ctx.supabase.from("research_insight_evidence").select("observation_id").eq("insight_id", insightId).eq("synthesis_id", ctx.synthesis.id);
  const have = new Set((current ?? []).map((e) => e.observation_id));
  const toAdd = evidenceIds.filter((id) => !have.has(id));
  if (toAdd.length) {
    const { error } = await ctx.supabase.from("research_insight_evidence").insert(toAdd.map((observation_id) => ({ synthesis_id: ctx.synthesis.id, insight_id: insightId, observation_id })));
    if (error) return fail(SAVE_ERROR);
  }
  const { data: insight, error } = await ctx.supabase.from("research_insights").update(insightColumns(parsed.data)).eq("id", insightId).eq("synthesis_id", ctx.synthesis.id).select(INSIGHT_ROW).maybeSingle();
  if (error) return fail(SAVE_ERROR);
  if (!insight) return fail("Insight not found.");
  const toRemove = [...have].filter((id) => !evidenceIds.includes(id));
  if (toRemove.length) await ctx.supabase.from("research_insight_evidence").delete().eq("insight_id", insightId).in("observation_id", toRemove);
  return { ok: true, data: { insight: { ...(insight as Omit<InsightRow, "evidence_ids">), evidence_ids: evidenceIds } } };
}

export async function deleteInsightAction(synthesisId: string, insightId: string): Promise<ActionResult> {
  const ctx = await owned(synthesisId);
  if (!ctx || !z.uuid().safeParse(insightId).success) return fail(NOT_FOUND);
  const { error } = await ctx.supabase.from("research_insights").delete().eq("id", insightId).eq("synthesis_id", ctx.synthesis.id);
  if (error) return fail("We couldn't delete that insight. Please try again.");
  return { ok: true };
}

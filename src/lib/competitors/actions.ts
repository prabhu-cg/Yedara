"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/auth/dal";
import { fail, flattenErrors, GENERIC_ERROR, type ActionResult } from "@/lib/action-result";
import { createClient } from "@/lib/supabase/server";
import { COMPETITOR_TOTAL_STEPS, UNNAMED_COMPETITOR } from "@/lib/competitors/constants";
import { loadAnalysisBundle, toCellRow, toCompetitorRow, toCriterionRow, toSourceRow, CELL_COLUMNS, COMPETITOR_COLUMNS, CRITERION_COLUMNS, SOURCE_COLUMNS } from "@/lib/competitors/queries";
import {
  analysisContentSchema,
  analysisMetaSchema,
  cellInputSchema,
  competitorInputSchema,
  criterionInputSchema,
  emptyAnalysis,
  emptyMarketContext,
  marketContextSchema,
  sourceInputSchema,
  type CellRow,
  type CompetitorRow,
  type CriterionRow,
  type SourceRow,
} from "@/lib/competitors/schemas";
import { getAnalysisCompletionIssues } from "@/lib/competitors/validation";
import type { Json } from "@/lib/supabase/database.types";

const idSchema = z.uuid({ error: "Analysis not found." });
const NOT_FOUND = "Analysis not found.";
const asJson = (v: unknown) => v as Json;
const orNull = (v: string) => (v === "" ? null : v);

function revalidateAnalyses(analysisId?: string, projectId?: string) {
  revalidatePath("/tools/competitor-analyzer");
  revalidatePath("/dashboard");
  if (analysisId) revalidatePath(`/tools/competitor-analyzer/${analysisId}`);
  if (projectId) revalidatePath(`/projects/${projectId}`);
}

/** The owner always comes from the verified session; RLS enforces the same rule in the database. */
async function ownedAnalysis(analysisId: string, userId: string) {
  const supabase = await createClient();
  const { data } = await supabase.from("competitor_analyses").select("id, project_id").eq("id", analysisId).eq("owner_id", userId).maybeSingle();
  return { supabase, analysis: data };
}

export async function createAnalysisAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  const parsed = analysisMetaSchema.safeParse(input);
  if (!parsed.success) return fail("Check the highlighted fields.", flattenErrors(parsed.error));

  const user = await requireUser();
  const supabase = await createClient();
  const { data: project } = await supabase.from("projects").select("id").eq("id", parsed.data.projectId).eq("owner_id", user.id).maybeSingle();
  if (!project) return fail("Choose one of your projects.", { projectId: ["Choose one of your projects"] });

  const { data, error } = await supabase
    .from("competitor_analyses")
    .insert({
      owner_id: user.id,
      project_id: project.id,
      title: parsed.data.title,
      market_context: asJson(emptyMarketContext()),
      analysis: asJson(emptyAnalysis()),
    })
    .select("id")
    .single();
  if (error || !data) {
    console.error("[competitors] create failed:", error?.code ?? error?.message);
    return fail("We couldn't create the analysis. Please try again.");
  }
  revalidateAnalyses(undefined, project.id);
  return { ok: true, data: { id: data.id } };
}

const metaPatchSchema = z.object({
  title: analysisMetaSchema.shape.title.optional(),
  projectId: z.uuid().optional(),
  currentStep: z.number().int().min(1).max(COMPETITOR_TOTAL_STEPS).optional(),
});

export async function updateAnalysisMetaAction(analysisId: string, input: unknown): Promise<ActionResult<{ savedAt: string }>> {
  const id = idSchema.safeParse(analysisId);
  if (!id.success) return fail(NOT_FOUND);
  const parsed = metaPatchSchema.safeParse(input);
  if (!parsed.success) return fail("Check the highlighted fields.", flattenErrors(parsed.error));

  const user = await requireUser();
  const { supabase, analysis } = await ownedAnalysis(id.data, user.id);
  if (!analysis) return fail(NOT_FOUND);

  const update: { title?: string; project_id?: string; current_step?: number } = {};
  if (parsed.data.title !== undefined) update.title = parsed.data.title;
  if (parsed.data.currentStep !== undefined) update.current_step = parsed.data.currentStep;
  if (parsed.data.projectId !== undefined && parsed.data.projectId !== analysis.project_id) {
    const { data: project } = await supabase.from("projects").select("id").eq("id", parsed.data.projectId).eq("owner_id", user.id).maybeSingle();
    if (!project) return fail("Choose one of your projects.", { projectId: ["Choose one of your projects"] });
    update.project_id = project.id;
  }
  if (!Object.keys(update).length) return { ok: true, data: { savedAt: new Date().toISOString() } };

  const { data, error } = await supabase.from("competitor_analyses").update(update).eq("id", id.data).eq("owner_id", user.id).select("id, updated_at").maybeSingle();
  if (error) {
    console.error("[competitors] meta failed:", error.code ?? error.message);
    return fail("We couldn't save your changes.");
  }
  if (!data) return fail(NOT_FOUND);
  if (update.project_id) revalidateAnalyses(id.data, update.project_id);
  return { ok: true, data: { savedAt: data.updated_at } };
}

/** Saves the market-context or analysis document. Overrides live here and never touch the project. */
export async function saveAnalysisContentAction(analysisId: string, part: "market" | "analysis", content: unknown): Promise<ActionResult<{ savedAt: string }>> {
  const id = idSchema.safeParse(analysisId);
  if (!id.success || (part !== "market" && part !== "analysis")) return fail(NOT_FOUND);
  const parsed = (part === "market" ? marketContextSchema : analysisContentSchema).safeParse(content);
  if (!parsed.success) return fail("Some of that content is too long or invalid.", flattenErrors(parsed.error));

  const user = await requireUser();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("competitor_analyses")
    .update(part === "market" ? { market_context: asJson(parsed.data) } : { analysis: asJson(parsed.data) })
    .eq("id", id.data)
    .eq("owner_id", user.id)
    .select("id, updated_at")
    .maybeSingle();
  if (error) {
    console.error("[competitors] content failed:", error.code ?? error.message);
    return fail("We couldn't save your changes.");
  }
  if (!data) return fail(NOT_FOUND);
  return { ok: true, data: { savedAt: data.updated_at } };
}

/* ---------------------------- Competitors ---------------------------- */

const competitorId = z.uuid({ error: "Competitor not found." });

export async function addCompetitorAction(analysisId: string, input: unknown): Promise<ActionResult<{ competitor: CompetitorRow }>> {
  const id = idSchema.safeParse(analysisId);
  if (!id.success) return fail(NOT_FOUND);
  const parsed = competitorInputSchema.safeParse(input ?? { name: UNNAMED_COMPETITOR, competitor_type: "direct" });
  if (!parsed.success) return fail("Check the highlighted fields.", flattenErrors(parsed.error));

  const user = await requireUser();
  const { supabase, analysis } = await ownedAnalysis(id.data, user.id);
  if (!analysis) return fail(NOT_FOUND);

  const { count } = await supabase.from("competitors").select("id", { count: "exact", head: true }).eq("analysis_id", id.data);
  const d = parsed.data;
  const { data, error } = await supabase
    .from("competitors")
    .insert({
      analysis_id: id.data,
      name: d.name,
      website_url: orNull(d.website_url),
      competitor_type: d.competitor_type,
      description: orNull(d.description),
      target_audience: orNull(d.target_audience),
      positioning: orNull(d.positioning),
      pricing_info: orNull(d.pricing_info),
      research_date: orNull(d.research_date),
      position: (count ?? 0) * 10,
    })
    .select(COMPETITOR_COLUMNS)
    .single();
  if (error || !data) {
    console.error("[competitors] add failed:", error?.code ?? error?.message);
    return fail("We couldn't add that competitor. Please try again.");
  }
  return { ok: true, data: { competitor: toCompetitorRow(data) } };
}

export async function updateCompetitorAction(analysisId: string, id: string, input: unknown): Promise<ActionResult<{ savedAt: string }>> {
  const aid = idSchema.safeParse(analysisId);
  const cid = competitorId.safeParse(id);
  if (!aid.success || !cid.success) return fail(NOT_FOUND);
  const parsed = competitorInputSchema.safeParse(input);
  if (!parsed.success) return fail("Check the highlighted fields.", flattenErrors(parsed.error));

  const user = await requireUser();
  const { supabase, analysis } = await ownedAnalysis(aid.data, user.id);
  if (!analysis) return fail(NOT_FOUND);

  const d = parsed.data;
  const { data, error } = await supabase
    .from("competitors")
    .update({
      name: d.name,
      website_url: orNull(d.website_url),
      competitor_type: d.competitor_type,
      description: orNull(d.description),
      target_audience: orNull(d.target_audience),
      positioning: orNull(d.positioning),
      pricing_info: orNull(d.pricing_info),
      research_date: orNull(d.research_date),
    })
    .eq("id", cid.data)
    .eq("analysis_id", aid.data)
    .select("id, updated_at")
    .maybeSingle();
  if (error) {
    console.error("[competitors] update failed:", error.code ?? error.message);
    return fail("We couldn't save your changes.");
  }
  if (!data) return fail("Competitor not found.");
  return { ok: true, data: { savedAt: data.updated_at } };
}

export async function deleteCompetitorAction(analysisId: string, id: string): Promise<ActionResult> {
  const aid = idSchema.safeParse(analysisId);
  const cid = competitorId.safeParse(id);
  if (!aid.success || !cid.success) return fail(NOT_FOUND);
  const user = await requireUser();
  const { supabase, analysis } = await ownedAnalysis(aid.data, user.id);
  if (!analysis) return fail(NOT_FOUND);
  const { data, error } = await supabase.from("competitors").delete().eq("id", cid.data).eq("analysis_id", aid.data).select("id");
  if (error) {
    console.error("[competitors] delete failed:", error.code ?? error.message);
    return fail(GENERIC_ERROR);
  }
  if (!data?.length) return fail("Competitor not found.");
  return { ok: true };
}

export async function reorderCompetitorsAction(analysisId: string, orderedIds: unknown): Promise<ActionResult> {
  const aid = idSchema.safeParse(analysisId);
  const ids = z.array(z.uuid()).max(100).safeParse(orderedIds);
  if (!aid.success || !ids.success) return fail(NOT_FOUND);
  const user = await requireUser();
  const { supabase, analysis } = await ownedAnalysis(aid.data, user.id);
  if (!analysis) return fail(NOT_FOUND);
  const { error } = await supabase.rpc("reorder_competitors", { p_analysis_id: aid.data, p_ids: ids.data });
  if (error) {
    console.error("[competitors] reorder failed:", error.code ?? error.message);
    return fail(GENERIC_ERROR);
  }
  return { ok: true };
}

/* ----------------------------- Criteria ------------------------------ */

const criterionId = z.uuid({ error: "Criterion not found." });

export async function addCriterionAction(analysisId: string, input: unknown): Promise<ActionResult<{ criterion: CriterionRow }>> {
  const id = idSchema.safeParse(analysisId);
  if (!id.success) return fail(NOT_FOUND);
  const parsed = criterionInputSchema.safeParse(input);
  if (!parsed.success) return fail("Check the highlighted fields.", flattenErrors(parsed.error));

  const user = await requireUser();
  const { supabase, analysis } = await ownedAnalysis(id.data, user.id);
  if (!analysis) return fail(NOT_FOUND);

  const { count } = await supabase.from("competitor_criteria").select("id", { count: "exact", head: true }).eq("analysis_id", id.data);
  const { data, error } = await supabase
    .from("competitor_criteria")
    .insert({ analysis_id: id.data, name: parsed.data.name, category: parsed.data.category, description: orNull(parsed.data.description), position: (count ?? 0) * 10 })
    .select(CRITERION_COLUMNS)
    .single();
  if (error || !data) {
    if (error?.code === "23505") return fail("That criterion is already in the list.", { name: ["That criterion is already in the list"] });
    console.error("[competitors] add criterion failed:", error?.code ?? error?.message);
    return fail("We couldn't add that criterion. Please try again.");
  }
  return { ok: true, data: { criterion: toCriterionRow(data) } };
}

export async function updateCriterionAction(analysisId: string, id: string, input: unknown): Promise<ActionResult<{ savedAt: string }>> {
  const aid = idSchema.safeParse(analysisId);
  const cid = criterionId.safeParse(id);
  if (!aid.success || !cid.success) return fail(NOT_FOUND);
  const parsed = criterionInputSchema.safeParse(input);
  if (!parsed.success) return fail("Check the highlighted fields.", flattenErrors(parsed.error));

  const user = await requireUser();
  const { supabase, analysis } = await ownedAnalysis(aid.data, user.id);
  if (!analysis) return fail(NOT_FOUND);
  const { data, error } = await supabase
    .from("competitor_criteria")
    .update({ name: parsed.data.name, category: parsed.data.category, description: orNull(parsed.data.description) })
    .eq("id", cid.data)
    .eq("analysis_id", aid.data)
    .select("id, updated_at")
    .maybeSingle();
  if (error) {
    if (error.code === "23505") return fail("That criterion is already in the list.", { name: ["That criterion is already in the list"] });
    console.error("[competitors] update criterion failed:", error.code ?? error.message);
    return fail("We couldn't save your changes.");
  }
  if (!data) return fail("Criterion not found.");
  return { ok: true, data: { savedAt: data.updated_at } };
}

export async function deleteCriterionAction(analysisId: string, id: string): Promise<ActionResult> {
  const aid = idSchema.safeParse(analysisId);
  const cid = criterionId.safeParse(id);
  if (!aid.success || !cid.success) return fail(NOT_FOUND);
  const user = await requireUser();
  const { supabase, analysis } = await ownedAnalysis(aid.data, user.id);
  if (!analysis) return fail(NOT_FOUND);
  const { data, error } = await supabase.from("competitor_criteria").delete().eq("id", cid.data).eq("analysis_id", aid.data).select("id");
  if (error) {
    console.error("[competitors] delete criterion failed:", error.code ?? error.message);
    return fail(GENERIC_ERROR);
  }
  if (!data?.length) return fail("Criterion not found.");
  return { ok: true };
}

export async function reorderCriteriaAction(analysisId: string, orderedIds: unknown): Promise<ActionResult> {
  const aid = idSchema.safeParse(analysisId);
  const ids = z.array(z.uuid()).max(200).safeParse(orderedIds);
  if (!aid.success || !ids.success) return fail(NOT_FOUND);
  const user = await requireUser();
  const { supabase, analysis } = await ownedAnalysis(aid.data, user.id);
  if (!analysis) return fail(NOT_FOUND);
  const { error } = await supabase.rpc("reorder_competitor_criteria", { p_analysis_id: aid.data, p_ids: ids.data });
  if (error) {
    console.error("[competitors] reorder criteria failed:", error.code ?? error.message);
    return fail(GENERIC_ERROR);
  }
  return { ok: true };
}

/* ------------------------------ Sources ------------------------------ */

const sourceId = z.uuid({ error: "Source not found." });

export async function addSourceAction(analysisId: string, competitorIdValue: string, input: unknown): Promise<ActionResult<{ source: SourceRow }>> {
  const aid = idSchema.safeParse(analysisId);
  const cid = competitorId.safeParse(competitorIdValue);
  if (!aid.success || !cid.success) return fail(NOT_FOUND);
  const parsed = sourceInputSchema.safeParse(input);
  if (!parsed.success) return fail("Check the highlighted fields.", flattenErrors(parsed.error));

  const user = await requireUser();
  const { supabase, analysis } = await ownedAnalysis(aid.data, user.id);
  if (!analysis) return fail(NOT_FOUND);

  const d = parsed.data;
  const { data, error } = await supabase
    .from("competitor_sources")
    // A source typed by a person is always origin "manual"; only a future research adapter may write "automated".
    .insert({ analysis_id: aid.data, competitor_id: cid.data, url: d.url, title: orNull(d.title), source_type: d.source_type, retrieved_on: orNull(d.retrieved_on), notes: orNull(d.notes), origin: "manual" })
    .select(SOURCE_COLUMNS)
    .single();
  if (error || !data) {
    console.error("[competitors] add source failed:", error?.code ?? error?.message);
    return fail("We couldn't save that source. Please try again.");
  }
  return { ok: true, data: { source: toSourceRow(data) } };
}

export async function updateSourceAction(analysisId: string, id: string, input: unknown): Promise<ActionResult<{ savedAt: string }>> {
  const aid = idSchema.safeParse(analysisId);
  const sid = sourceId.safeParse(id);
  if (!aid.success || !sid.success) return fail(NOT_FOUND);
  const parsed = sourceInputSchema.safeParse(input);
  if (!parsed.success) return fail("Check the highlighted fields.", flattenErrors(parsed.error));

  const user = await requireUser();
  const { supabase, analysis } = await ownedAnalysis(aid.data, user.id);
  if (!analysis) return fail(NOT_FOUND);
  const d = parsed.data;
  const { data, error } = await supabase
    .from("competitor_sources")
    .update({ url: d.url, title: orNull(d.title), source_type: d.source_type, retrieved_on: orNull(d.retrieved_on), notes: orNull(d.notes) })
    .eq("id", sid.data)
    .eq("analysis_id", aid.data)
    .select("id, updated_at")
    .maybeSingle();
  if (error) {
    console.error("[competitors] update source failed:", error.code ?? error.message);
    return fail("We couldn't save your changes.");
  }
  if (!data) return fail("Source not found.");
  return { ok: true, data: { savedAt: data.updated_at } };
}

export async function deleteSourceAction(analysisId: string, id: string): Promise<ActionResult> {
  const aid = idSchema.safeParse(analysisId);
  const sid = sourceId.safeParse(id);
  if (!aid.success || !sid.success) return fail(NOT_FOUND);
  const user = await requireUser();
  const { supabase, analysis } = await ownedAnalysis(aid.data, user.id);
  if (!analysis) return fail(NOT_FOUND);
  const { data, error } = await supabase.from("competitor_sources").delete().eq("id", sid.data).eq("analysis_id", aid.data).select("id");
  if (error) {
    console.error("[competitors] delete source failed:", error.code ?? error.message);
    return fail(GENERIC_ERROR);
  }
  if (!data?.length) return fail("Source not found.");
  return { ok: true };
}

/* ------------------------------ Matrix ------------------------------- */

export async function saveCellAction(analysisId: string, competitorIdValue: string, criterionIdValue: string, input: unknown): Promise<ActionResult<{ cell: CellRow }>> {
  const aid = idSchema.safeParse(analysisId);
  const cid = competitorId.safeParse(competitorIdValue);
  const kid = criterionId.safeParse(criterionIdValue);
  if (!aid.success || !cid.success || !kid.success) return fail(NOT_FOUND);
  const parsed = cellInputSchema.safeParse(input);
  if (!parsed.success) return fail("Check the highlighted fields.", flattenErrors(parsed.error));

  const user = await requireUser();
  const { supabase, analysis } = await ownedAnalysis(aid.data, user.id);
  if (!analysis) return fail(NOT_FOUND);

  const d = parsed.data;
  // A value only makes sense for a known cell; clear it otherwise so "unknown" never carries stale text.
  const value = d.status === "known" ? d.value : "";
  const { data, error } = await supabase
    .from("competitor_comparisons")
    .upsert(
      {
        analysis_id: aid.data,
        competitor_id: cid.data,
        criterion_id: kid.data,
        value: orNull(value),
        status: d.status,
        notes: orNull(d.notes),
        source_id: orNull(d.source_id),
        origin: "manual",
      },
      { onConflict: "competitor_id,criterion_id" },
    )
    .select(CELL_COLUMNS)
    .single();
  if (error || !data) {
    // Composite foreign keys reject a competitor, criterion or source from another analysis.
    console.error("[competitors] save cell failed:", error?.code ?? error?.message);
    return fail(error?.code === "23503" ? "That source doesn't belong to this competitor." : "We couldn't save your changes.");
  }
  return { ok: true, data: { cell: toCellRow(data) } };
}

/* ------------------------- Status / delete --------------------------- */

export async function setAnalysisStatusAction(analysisId: string, status: unknown): Promise<ActionResult<{ status: "draft" | "completed" }>> {
  const id = idSchema.safeParse(analysisId);
  const next = z.enum(["draft", "completed"]).safeParse(status);
  if (!id.success || !next.success) return fail(NOT_FOUND);

  const user = await requireUser();
  const { supabase, analysis } = await ownedAnalysis(id.data, user.id);
  if (!analysis) return fail(NOT_FOUND);

  if (next.data === "completed") {
    // Re-check on the server: the client's view is never trusted for completion.
    const bundle = await loadAnalysisBundle(id.data);
    if (!bundle) return fail(NOT_FOUND);
    const issues = getAnalysisCompletionIssues(
      { title: bundle.analysis.title, projectId: bundle.analysis.project_id },
      { competitors: bundle.competitors, criteria: bundle.criteria },
    );
    if (issues.length) return fail(`Complete the required fields first: ${[...new Set(issues.map((i) => i.message.toLowerCase()))].join("; ")}.`);
  }

  const { error } = await supabase
    .from("competitor_analyses")
    .update({ status: next.data, completed_at: next.data === "completed" ? new Date().toISOString() : null })
    .eq("id", id.data)
    .eq("owner_id", user.id);
  if (error) {
    console.error("[competitors] status failed:", error.code ?? error.message);
    return fail(GENERIC_ERROR);
  }
  revalidateAnalyses(id.data, analysis.project_id);
  return { ok: true, data: { status: next.data } };
}

export async function deleteAnalysisAction(analysisId: string): Promise<ActionResult> {
  const id = idSchema.safeParse(analysisId);
  if (!id.success) return fail(NOT_FOUND);
  const user = await requireUser();
  const supabase = await createClient();
  const { data, error } = await supabase.from("competitor_analyses").delete().eq("id", id.data).eq("owner_id", user.id).select("id, project_id");
  if (error) {
    console.error("[competitors] delete analysis failed:", error.code ?? error.message);
    return fail("We couldn't delete the analysis. Please try again.");
  }
  if (!data?.length) return fail(NOT_FOUND);
  revalidateAnalyses(undefined, data[0].project_id);
  return { ok: true };
}

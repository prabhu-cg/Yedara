import "server-only";
import { notFound } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/database.types";
import { normalizeAnalysis, normalizeMarketContext, type AnalysisContent, type CellRow, type CompetitorRow, type CriterionRow, type MarketContext, type SourceRow } from "@/lib/competitors/schemas";
import { PROJECT_BRIEF_COLUMNS, toProject, type PersonaProject } from "@/lib/personas/queries";

export type AnalysisDbRow = Database["public"]["Tables"]["competitor_analyses"]["Row"];
type Tables = Database["public"]["Tables"];

const ANALYSIS_COLUMNS = "id, owner_id, project_id, title, status, current_step, completed_at, market_context, analysis, created_at, updated_at";
export const COMPETITOR_COLUMNS = "id, name, website_url, competitor_type, description, target_audience, positioning, pricing_info, research_date, position";
export const CRITERION_COLUMNS = "id, name, category, description, position";
export const SOURCE_COLUMNS = "id, competitor_id, url, title, source_type, retrieved_on, origin, notes";
export const CELL_COLUMNS = "competitor_id, criterion_id, source_id, value, status, notes, origin";

export const toCompetitorRow = (r: Pick<Tables["competitors"]["Row"], "id" | "name" | "website_url" | "competitor_type" | "description" | "target_audience" | "positioning" | "pricing_info" | "research_date" | "position">): CompetitorRow => ({
  id: r.id,
  name: r.name,
  website_url: r.website_url ?? "",
  competitor_type: r.competitor_type,
  description: r.description ?? "",
  target_audience: r.target_audience ?? "",
  positioning: r.positioning ?? "",
  pricing_info: r.pricing_info ?? "",
  research_date: r.research_date ?? "",
  position: r.position,
});

export const toCriterionRow = (r: Pick<Tables["competitor_criteria"]["Row"], "id" | "name" | "category" | "description" | "position">): CriterionRow => ({
  id: r.id,
  name: r.name,
  category: r.category,
  description: r.description ?? "",
  position: r.position,
});

export const toSourceRow = (r: Pick<Tables["competitor_sources"]["Row"], "id" | "competitor_id" | "url" | "title" | "source_type" | "retrieved_on" | "origin" | "notes">): SourceRow => ({
  id: r.id,
  competitor_id: r.competitor_id,
  url: r.url,
  title: r.title ?? "",
  source_type: r.source_type,
  retrieved_on: r.retrieved_on ?? "",
  origin: r.origin,
  notes: r.notes ?? "",
});

export const toCellRow = (r: Pick<Tables["competitor_comparisons"]["Row"], "competitor_id" | "criterion_id" | "source_id" | "value" | "status" | "notes" | "origin">): CellRow => ({
  competitor_id: r.competitor_id,
  criterion_id: r.criterion_id,
  source_id: r.source_id ?? "",
  value: r.value ?? "",
  status: r.status,
  notes: r.notes ?? "",
  origin: r.origin,
});

export type AnalysisBundle = {
  analysis: AnalysisDbRow;
  project: PersonaProject | null;
  market: MarketContext;
  content: AnalysisContent;
  competitors: CompetitorRow[];
  criteria: CriterionRow[];
  cells: CellRow[];
  sources: SourceRow[];
  preparedBy: string | null;
};

/** Reads through the caller's RLS client: someone else's analysis is indistinguishable from a missing one. */
export async function loadAnalysisBundle(analysisId: string): Promise<AnalysisBundle | null> {
  if (!z.uuid().safeParse(analysisId).success) return null;
  const supabase = await createClient();

  const { data: analysis, error } = await supabase.from("competitor_analyses").select(ANALYSIS_COLUMNS).eq("id", analysisId).maybeSingle();
  if (error) {
    console.error("[competitors] load failed:", error.code ?? error.message);
    throw new Error("We couldn't load this analysis.");
  }
  if (!analysis) return null;

  const [competitors, criteria, sources, cells, project, profile] = await Promise.all([
    supabase.from("competitors").select(COMPETITOR_COLUMNS).eq("analysis_id", analysisId).order("position", { ascending: true }).order("created_at", { ascending: true }),
    supabase.from("competitor_criteria").select(CRITERION_COLUMNS).eq("analysis_id", analysisId).order("position", { ascending: true }).order("created_at", { ascending: true }),
    supabase.from("competitor_sources").select(SOURCE_COLUMNS).eq("analysis_id", analysisId).order("created_at", { ascending: true }),
    supabase.from("competitor_comparisons").select(CELL_COLUMNS).eq("analysis_id", analysisId),
    supabase.from("projects").select(PROJECT_BRIEF_COLUMNS).eq("id", analysis.project_id).maybeSingle(),
    supabase.from("profiles").select("full_name").eq("id", analysis.owner_id).maybeSingle(),
  ]);
  const failed = competitors.error ?? criteria.error ?? sources.error ?? cells.error;
  if (failed) {
    console.error("[competitors] load children failed:", failed.code ?? failed.message);
    throw new Error("We couldn't load this analysis.");
  }

  return {
    analysis,
    project: project.data ? toProject(project.data) : null,
    market: normalizeMarketContext(analysis.market_context),
    content: normalizeAnalysis(analysis.analysis),
    competitors: (competitors.data ?? []).map(toCompetitorRow),
    criteria: (criteria.data ?? []).map(toCriterionRow),
    sources: (sources.data ?? []).map(toSourceRow),
    cells: (cells.data ?? []).map(toCellRow),
    preparedBy: profile.data?.full_name ?? null,
  };
}

export async function getAnalysisBundle(analysisId: string) {
  await requireUser();
  const bundle = await loadAnalysisBundle(analysisId);
  if (!bundle) notFound();
  return bundle;
}

export type AnalysisListItem = AnalysisDbRow & { project_name: string | null; competitor_count: number };

export async function listAnalyses(options: { projectId?: string } = {}): Promise<AnalysisListItem[]> {
  await requireUser();
  const supabase = await createClient();
  let query = supabase.from("competitor_analyses").select(ANALYSIS_COLUMNS).order("updated_at", { ascending: false }).limit(100);
  if (options.projectId && z.uuid().safeParse(options.projectId).success) query = query.eq("project_id", options.projectId);
  const { data: analyses, error } = await query;
  if (error) {
    console.error("[competitors] list failed:", error.code ?? error.message);
    throw new Error("We couldn't load your analyses.");
  }
  if (!analyses?.length) return [];

  const [projects, competitors] = await Promise.all([
    supabase.from("projects").select("id, name").in("id", [...new Set(analyses.map((a) => a.project_id))]),
    supabase.from("competitors").select("analysis_id").in("analysis_id", analyses.map((a) => a.id)),
  ]);
  const names = new Map((projects.data ?? []).map((p) => [p.id, p.name]));
  const counts = new Map<string, number>();
  for (const c of competitors.data ?? []) counts.set(c.analysis_id, (counts.get(c.analysis_id) ?? 0) + 1);
  return analyses.map((a) => ({ ...a, project_name: names.get(a.project_id) ?? null, competitor_count: counts.get(a.id) ?? 0 }));
}

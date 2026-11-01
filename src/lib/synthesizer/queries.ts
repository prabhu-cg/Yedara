import "server-only";
import { notFound } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import { normalizeReport, toTags, type CardRow, type InsightRow, type ObservationRow, type ReportContent, type SourceRow, type SynthesisRow, type ThemeRow } from "@/lib/synthesizer/schemas";

const SYNTHESIS_COLUMNS = "id, owner_id, project_id, title, status, completed_at, report, created_at, updated_at";
const SOURCE_COLUMNS = "id, synthesis_id, name, source_type, participant_ref, conducted_on, notes, file_name, file_size, import_method, created_at, updated_at";
const OBSERVATION_COLUMNS = "id, synthesis_id, source_id, participant_ref, kind, content, tags, position, created_at, updated_at";
const THEME_COLUMNS = "id, synthesis_id, title, notes, position, created_at, updated_at";
const CARD_COLUMNS = "id, synthesis_id, board_id, observation_id, theme_id, position, created_at, updated_at";
const INSIGHT_COLUMNS = "id, synthesis_id, theme_id, kind, observation, pattern, user_need, problem_kind, problem_text, statement, confidence, recommended_action, position, created_at, updated_at";

export type SynthesisProject = { id: string; name: string; client: string | null; description: string | null; industry: string | null };

export type SynthesisBundle = {
  synthesis: SynthesisRow;
  project: SynthesisProject | null;
  sources: SourceRow[];
  observations: ObservationRow[];
  themes: ThemeRow[];
  cards: CardRow[];
  boardZoom: number;
  insights: InsightRow[];
  report: ReportContent;
  preparedBy: string | null;
};

/** Reads through the caller's RLS client: someone else's synthesis is indistinguishable from a missing one. */
export async function loadSynthesisBundle(synthesisId: string): Promise<SynthesisBundle | null> {
  if (!z.uuid().safeParse(synthesisId).success) return null;
  const supabase = await createClient();
  const { data: synthesis, error } = await supabase.from("research_syntheses").select(SYNTHESIS_COLUMNS).eq("id", synthesisId).maybeSingle();
  if (error) {
    console.error("[synthesizer] load failed:", error.code ?? error.message);
    throw new Error("We couldn't load this synthesis.");
  }
  if (!synthesis) return null;

  const [sources, observations, themes, cards, board, insights, evidence, project, profile] = await Promise.all([
    supabase.from("research_sources").select(SOURCE_COLUMNS).eq("synthesis_id", synthesisId).order("created_at", { ascending: true }),
    supabase.from("research_observations").select(OBSERVATION_COLUMNS).eq("synthesis_id", synthesisId).order("position", { ascending: true }).order("created_at", { ascending: true }),
    supabase.from("research_themes").select(THEME_COLUMNS).eq("synthesis_id", synthesisId).order("position", { ascending: true }).order("created_at", { ascending: true }),
    supabase.from("affinity_cards").select(CARD_COLUMNS).eq("synthesis_id", synthesisId),
    supabase.from("affinity_boards").select("id, zoom").eq("synthesis_id", synthesisId).maybeSingle(),
    supabase.from("research_insights").select(INSIGHT_COLUMNS).eq("synthesis_id", synthesisId).order("position", { ascending: true }).order("created_at", { ascending: true }),
    supabase.from("research_insight_evidence").select("insight_id, observation_id").eq("synthesis_id", synthesisId),
    supabase.from("projects").select("id, name, client, description, industry").eq("id", synthesis.project_id).maybeSingle(),
    supabase.from("profiles").select("full_name").eq("id", synthesis.owner_id).maybeSingle(),
  ]);
  const failed = [sources, observations, themes, cards, insights, evidence].find((r) => r.error);
  if (failed?.error) {
    console.error("[synthesizer] load children failed:", failed.error.code ?? failed.error.message);
    throw new Error("We couldn't load this synthesis.");
  }

  const evidenceBy = new Map<string, string[]>();
  for (const e of evidence.data ?? []) evidenceBy.set(e.insight_id, [...(evidenceBy.get(e.insight_id) ?? []), e.observation_id]);

  return {
    synthesis,
    project: project.data ?? null,
    sources: (sources.data ?? []) as SourceRow[],
    observations: (observations.data ?? []).map((o) => ({ ...o, tags: toTags(o.tags) })) as ObservationRow[],
    themes: (themes.data ?? []) as ThemeRow[],
    cards: (cards.data ?? []) as CardRow[],
    boardZoom: Number(board.data?.zoom ?? 1),
    insights: (insights.data ?? []).map((i) => ({ ...i, evidence_ids: evidenceBy.get(i.id) ?? [] })) as InsightRow[],
    report: normalizeReport(synthesis.report),
    preparedBy: profile.data?.full_name ?? null,
  };
}

export async function getSynthesisBundle(synthesisId: string) {
  await requireUser();
  const bundle = await loadSynthesisBundle(synthesisId);
  if (!bundle) notFound();
  return bundle;
}

export type SynthesisListItem = Omit<SynthesisRow, "report"> & { project_name: string | null; observation_count: number; insight_count: number };

export async function listSyntheses(options: { projectId?: string } = {}): Promise<SynthesisListItem[]> {
  await requireUser();
  const supabase = await createClient();
  let query = supabase.from("research_syntheses").select("id, owner_id, project_id, title, status, completed_at, created_at, updated_at").order("updated_at", { ascending: false }).limit(100);
  if (options.projectId && z.uuid().safeParse(options.projectId).success) query = query.eq("project_id", options.projectId);
  const { data: rows, error } = await query;
  if (error) {
    console.error("[synthesizer] list failed:", error.code ?? error.message);
    throw new Error("We couldn't load your syntheses.");
  }
  if (!rows?.length) return [];

  const ids = rows.map((r) => r.id);
  const [projects, observations, insights] = await Promise.all([
    supabase.from("projects").select("id, name").in("id", [...new Set(rows.map((r) => r.project_id))]),
    supabase.from("research_observations").select("synthesis_id").in("synthesis_id", ids),
    supabase.from("research_insights").select("synthesis_id").in("synthesis_id", ids),
  ]);
  const names = new Map((projects.data ?? []).map((p) => [p.id, p.name]));
  const count = (list: { synthesis_id: string }[] | null) => {
    const m = new Map<string, number>();
    for (const r of list ?? []) m.set(r.synthesis_id, (m.get(r.synthesis_id) ?? 0) + 1);
    return m;
  };
  const obs = count(observations.data);
  const ins = count(insights.data);
  return rows.map((r) => ({ ...r, project_name: names.get(r.project_id) ?? null, observation_count: obs.get(r.id) ?? 0, insight_count: ins.get(r.id) ?? 0 }));
}

/** Observations a journey can cite as evidence: only the caller's, newest first, trimmed to what a picker needs. */
export async function listEvidenceOptions(projectId?: string) {
  await requireUser();
  const supabase = await createClient();
  let syn = supabase.from("research_syntheses").select("id, title").order("updated_at", { ascending: false }).limit(50);
  if (projectId && z.uuid().safeParse(projectId).success) syn = syn.eq("project_id", projectId);
  const { data: syntheses } = await syn;
  if (!syntheses?.length) return [];
  const titles = new Map(syntheses.map((s) => [s.id, s.title]));
  const { data } = await supabase.from("research_observations").select("id, synthesis_id, content, participant_ref").in("synthesis_id", syntheses.map((s) => s.id)).order("created_at", { ascending: false }).limit(300);
  return (data ?? []).map((o) => ({ id: o.id, label: o.content.length > 90 ? `${o.content.slice(0, 87)}…` : o.content, participant: o.participant_ref, synthesis: titles.get(o.synthesis_id) ?? "" }));
}
export type EvidenceOption = Awaited<ReturnType<typeof listEvidenceOptions>>[number];

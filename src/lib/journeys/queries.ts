import "server-only";
import { notFound } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import { loadAvatarIds } from "@/lib/personas/queries";
import type { CandidateRow, ItemRow, JourneyRow, StageRow } from "@/lib/journeys/schemas";

const JOURNEY_COLUMNS = "id, owner_id, project_id, persona_id, name, journey_type, scenario, state, status, completed_at, created_at, updated_at";
const STAGE_COLUMNS = "id, journey_id, name, position, emotion, emotion_note, created_at, updated_at";
const ITEM_COLUMNS = "id, journey_id, stage_id, kind, content, evidence_note, observation_id, position, created_at, updated_at";
const CANDIDATE_COLUMNS = "id, owner_id, project_id, journey_id, stage_id, source_item_id, observation_id, title, origin_kind, journey_name, stage_name, evidence_note, status, created_at, updated_at";

export type JourneyBundle = {
  journey: JourneyRow;
  project: { id: string; name: string; client: string | null } | null;
  persona: { id: string; name: string; persona_type: string } | null;
  stages: StageRow[];
  items: ItemRow[];
  candidates: CandidateRow[];
  preparedBy: string | null;
};

/** Reads through the caller's RLS client: someone else's journey is indistinguishable from a missing one. */
export async function loadJourneyBundle(journeyId: string): Promise<JourneyBundle | null> {
  if (!z.uuid().safeParse(journeyId).success) return null;
  const supabase = await createClient();
  const { data: journey, error } = await supabase.from("journeys").select(JOURNEY_COLUMNS).eq("id", journeyId).maybeSingle();
  if (error) {
    console.error("[journeys] load failed:", error.code ?? error.message);
    throw new Error("We couldn't load this journey.");
  }
  if (!journey) return null;

  const [stages, items, candidates, project, persona, profile] = await Promise.all([
    supabase.from("journey_stages").select(STAGE_COLUMNS).eq("journey_id", journeyId).order("position", { ascending: true }).order("created_at", { ascending: true }),
    supabase.from("journey_items").select(ITEM_COLUMNS).eq("journey_id", journeyId).order("position", { ascending: true }).order("created_at", { ascending: true }),
    supabase.from("opportunity_candidates").select(CANDIDATE_COLUMNS).eq("journey_id", journeyId).order("created_at", { ascending: true }),
    supabase.from("projects").select("id, name, client").eq("id", journey.project_id).maybeSingle(),
    journey.persona_id ? supabase.from("personas").select("id, name, persona_type").eq("id", journey.persona_id).maybeSingle() : Promise.resolve({ data: null, error: null }),
    supabase.from("profiles").select("full_name").eq("id", journey.owner_id).maybeSingle(),
  ]);
  const failed = [stages, items, candidates].find((r) => r.error);
  if (failed?.error) {
    console.error("[journeys] load children failed:", failed.error.code ?? failed.error.message);
    throw new Error("We couldn't load this journey.");
  }
  return {
    journey: journey as JourneyRow,
    project: project.data ?? null,
    persona: persona.data ?? null,
    stages: (stages.data ?? []) as StageRow[],
    items: (items.data ?? []) as ItemRow[],
    candidates: (candidates.data ?? []) as CandidateRow[],
    preparedBy: profile.data?.full_name ?? null,
  };
}

export async function getJourneyBundle(journeyId: string) {
  await requireUser();
  const bundle = await loadJourneyBundle(journeyId);
  if (!bundle) notFound();
  return bundle;
}

export type JourneyListItem = JourneyRow & { project_name: string | null; persona_name: string | null; persona_avatar: string; stage_count: number };

export async function listJourneys(options: { projectId?: string } = {}): Promise<JourneyListItem[]> {
  await requireUser();
  const supabase = await createClient();
  let query = supabase.from("journeys").select(JOURNEY_COLUMNS).order("updated_at", { ascending: false }).limit(100);
  if (options.projectId && z.uuid().safeParse(options.projectId).success) query = query.eq("project_id", options.projectId);
  const { data: rows, error } = await query;
  if (error) {
    console.error("[journeys] list failed:", error.code ?? error.message);
    throw new Error("We couldn't load your journeys.");
  }
  if (!rows?.length) return [];

  const personaIds = [...new Set(rows.map((r) => r.persona_id).filter((p): p is string => Boolean(p)))];
  const [projects, personas, stages, avatars] = await Promise.all([
    supabase.from("projects").select("id, name").in("id", [...new Set(rows.map((r) => r.project_id))]),
    personaIds.length ? supabase.from("personas").select("id, name").in("id", personaIds) : Promise.resolve({ data: [] as { id: string; name: string }[] }),
    supabase.from("journey_stages").select("journey_id").in("journey_id", rows.map((r) => r.id)),
    loadAvatarIds(supabase, personaIds),
  ]);
  const projectName = new Map((projects.data ?? []).map((p) => [p.id, p.name]));
  const personaName = new Map((personas.data ?? []).map((p) => [p.id, p.name]));
  const counts = new Map<string, number>();
  for (const s of stages.data ?? []) counts.set(s.journey_id, (counts.get(s.journey_id) ?? 0) + 1);
  return (rows as JourneyRow[]).map((r) => ({ ...r, project_name: projectName.get(r.project_id) ?? null, persona_name: r.persona_id ? (personaName.get(r.persona_id) ?? null) : null, persona_avatar: r.persona_id ? (avatars.get(r.persona_id) ?? "") : "", stage_count: counts.get(r.id) ?? 0 }));
}

/** Personas a new journey can use, with their project so the form can filter. */
export async function listPersonaOptions() {
  await requireUser();
  const supabase = await createClient();
  const { data } = await supabase.from("personas").select("id, name, project_id").order("name").limit(300);
  return data ?? [];
}
export type PersonaOption = Awaited<ReturnType<typeof listPersonaOptions>>[number];

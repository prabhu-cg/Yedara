import "server-only";
import { notFound } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import { loadAvatarIds } from "@/lib/personas/queries";
import type { EmpathyItemRow, EmpathyMapRow } from "@/lib/empathy/schemas";

const MAP_COLUMNS = "id, owner_id, project_id, persona_id, title, subject, context, not_researched, status, completed_at, created_at, updated_at";
const ITEM_COLUMNS = "id, map_id, quadrant, content, evidence_note, observation_id, position, created_at, updated_at";

export type EmpathyBundle = {
  map: EmpathyMapRow;
  project: { id: string; name: string; client: string | null } | null;
  persona: { id: string; name: string; persona_type: string; avatar: string } | null;
  items: EmpathyItemRow[];
};

/** Reads through the caller's RLS client: someone else's map is indistinguishable from a missing one. */
export async function loadEmpathyBundle(mapId: string): Promise<EmpathyBundle | null> {
  if (!z.uuid().safeParse(mapId).success) return null;
  const supabase = await createClient();
  const { data: map, error } = await supabase.from("empathy_maps").select(MAP_COLUMNS).eq("id", mapId).maybeSingle();
  if (error) {
    console.error("[empathy] load failed:", error.code ?? error.message);
    throw new Error("We couldn't load this empathy map.");
  }
  if (!map) return null;

  const [items, project, persona] = await Promise.all([
    supabase.from("empathy_items").select(ITEM_COLUMNS).eq("map_id", mapId).order("position", { ascending: true }).order("created_at", { ascending: true }),
    supabase.from("projects").select("id, name, client").eq("id", map.project_id).maybeSingle(),
    map.persona_id ? supabase.from("personas").select("id, name, persona_type").eq("id", map.persona_id).maybeSingle() : Promise.resolve({ data: null, error: null }),
  ]);
  if (items.error) {
    console.error("[empathy] load items failed:", items.error.code ?? items.error.message);
    throw new Error("We couldn't load this empathy map.");
  }
  const avatars = persona.data ? await loadAvatarIds(supabase, [persona.data.id]) : new Map<string, string>();
  return {
    map: map as EmpathyMapRow,
    project: project.data ?? null,
    persona: persona.data ? { ...persona.data, avatar: avatars.get(persona.data.id) ?? "" } : null,
    items: (items.data ?? []) as EmpathyItemRow[],
  };
}

export async function getEmpathyBundle(mapId: string) {
  await requireUser();
  const bundle = await loadEmpathyBundle(mapId);
  if (!bundle) notFound();
  return bundle;
}

export type EmpathyListItem = EmpathyMapRow & {
  project_name: string | null;
  persona_name: string | null;
  persona_avatar: string;
  note_count: number;
  evidence_count: number;
};

export async function listEmpathyMaps(options: { projectId?: string } = {}): Promise<EmpathyListItem[]> {
  await requireUser();
  const supabase = await createClient();
  let query = supabase.from("empathy_maps").select(MAP_COLUMNS).order("updated_at", { ascending: false }).limit(100);
  if (options.projectId && z.uuid().safeParse(options.projectId).success) query = query.eq("project_id", options.projectId);
  const { data: rows, error } = await query;
  if (error) {
    console.error("[empathy] list failed:", error.code ?? error.message);
    throw new Error("We couldn't load your empathy maps.");
  }
  if (!rows?.length) return [];

  const personaIds = [...new Set(rows.map((r) => r.persona_id).filter((p): p is string => Boolean(p)))];
  const [projects, personas, items, avatars] = await Promise.all([
    supabase.from("projects").select("id, name").in("id", [...new Set(rows.map((r) => r.project_id))]),
    personaIds.length ? supabase.from("personas").select("id, name").in("id", personaIds) : Promise.resolve({ data: [] as { id: string; name: string }[] }),
    supabase.from("empathy_items").select("map_id, observation_id").in("map_id", rows.map((r) => r.id)),
    loadAvatarIds(supabase, personaIds),
  ]);
  const projectName = new Map((projects.data ?? []).map((p) => [p.id, p.name]));
  const personaName = new Map((personas.data ?? []).map((p) => [p.id, p.name]));
  const notes = new Map<string, { notes: number; evidence: number }>();
  for (const i of items.data ?? []) {
    const c = notes.get(i.map_id) ?? { notes: 0, evidence: 0 };
    c.notes += 1;
    if (i.observation_id) c.evidence += 1;
    notes.set(i.map_id, c);
  }
  return (rows as EmpathyMapRow[]).map((r) => ({
    ...r,
    project_name: projectName.get(r.project_id) ?? null,
    persona_name: r.persona_id ? (personaName.get(r.persona_id) ?? null) : null,
    persona_avatar: r.persona_id ? (avatars.get(r.persona_id) ?? "") : "",
    note_count: notes.get(r.id)?.notes ?? 0,
    evidence_count: notes.get(r.id)?.evidence ?? 0,
  }));
}

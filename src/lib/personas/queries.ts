import "server-only";
import { notFound } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/database.types";
import { PERSONA_SECTION_KEYS, type PersonaSectionKey } from "@/lib/personas/constants";
import { normalizePersonaContent, type EvidenceRow, type PersonaContent } from "@/lib/personas/schemas";
import type { ProjectBrief } from "@/lib/shared-context";

export type PersonaRow = Database["public"]["Tables"]["personas"]["Row"];
type EvidenceDbRow = Database["public"]["Tables"]["persona_evidence"]["Row"];

const PERSONA_COLUMNS = "id, owner_id, project_id, name, persona_type, status, current_step, completed_at, created_at, updated_at";
export const EVIDENCE_COLUMNS = "id, persona_id, kind, content, source_label, source_url, participant_ref, confidence, validation_status, origin, position, created_at, updated_at";

export type PersonaProject = { id: string; name: string; client: string | null; brief: ProjectBrief };

export type PersonaBundle = {
  persona: PersonaRow;
  project: PersonaProject | null;
  content: PersonaContent;
  evidence: EvidenceRow[];
  preparedBy: string | null;
};

export function toEvidenceRow(r: Pick<EvidenceDbRow, "id" | "kind" | "content" | "source_label" | "source_url" | "participant_ref" | "confidence" | "validation_status" | "origin" | "position">): EvidenceRow {
  return {
    id: r.id,
    kind: r.kind,
    content: r.content,
    source_label: r.source_label ?? "",
    source_url: r.source_url ?? "",
    participant_ref: r.participant_ref ?? "",
    confidence: r.confidence ?? "",
    validation_status: r.validation_status,
    origin: r.origin,
    position: r.position,
  };
}

export const PROJECT_BRIEF_COLUMNS = "id, name, client, description, industry, product_service, target_audience, research_objectives";

export function toProject(p: {
  id: string; name: string; client: string | null; description: string | null; industry: string | null;
  product_service: string | null; target_audience: string | null; research_objectives: string | null;
}): PersonaProject {
  return {
    id: p.id,
    name: p.name,
    client: p.client,
    brief: {
      description: p.description,
      industry: p.industry,
      product_service: p.product_service,
      target_audience: p.target_audience,
      research_objectives: p.research_objectives,
    },
  };
}

/** Reads through the caller's RLS client: someone else's persona is indistinguishable from a missing one. */
export async function loadPersonaBundle(personaId: string): Promise<PersonaBundle | null> {
  if (!z.uuid().safeParse(personaId).success) return null;
  const supabase = await createClient();

  const { data: persona, error } = await supabase.from("personas").select(PERSONA_COLUMNS).eq("id", personaId).maybeSingle();
  if (error) {
    console.error("[personas] load failed:", error.code ?? error.message);
    throw new Error("We couldn't load this persona.");
  }
  if (!persona) return null;

  const [sections, evidence, project, profile] = await Promise.all([
    supabase.from("persona_sections").select("key, content").eq("persona_id", personaId),
    supabase.from("persona_evidence").select(EVIDENCE_COLUMNS).eq("persona_id", personaId).order("position", { ascending: true }).order("created_at", { ascending: true }),
    supabase.from("projects").select(PROJECT_BRIEF_COLUMNS).eq("id", persona.project_id).maybeSingle(),
    supabase.from("profiles").select("full_name").eq("id", persona.owner_id).maybeSingle(),
  ]);
  if (sections.error || evidence.error) {
    console.error("[personas] load children failed:", (sections.error ?? evidence.error)?.code);
    throw new Error("We couldn't load this persona.");
  }

  const raw = new Map((sections.data ?? []).map((s) => [s.key, s.content]));
  const content = Object.fromEntries(
    PERSONA_SECTION_KEYS.map((key) => [key, normalizePersonaContent(key as PersonaSectionKey, raw.get(key))]),
  ) as PersonaContent;

  return {
    persona,
    project: project.data ? toProject(project.data) : null,
    content,
    evidence: (evidence.data ?? []).map(toEvidenceRow),
    preparedBy: profile.data?.full_name ?? null,
  };
}

export async function getPersonaBundle(personaId: string) {
  await requireUser();
  const bundle = await loadPersonaBundle(personaId);
  if (!bundle) notFound();
  return bundle;
}

export type PersonaListItem = PersonaRow & { project_name: string | null; evidence_count: number };

export async function listPersonas(options: { projectId?: string } = {}): Promise<PersonaListItem[]> {
  await requireUser();
  const supabase = await createClient();
  let query = supabase.from("personas").select(PERSONA_COLUMNS).order("updated_at", { ascending: false }).limit(100);
  if (options.projectId && z.uuid().safeParse(options.projectId).success) query = query.eq("project_id", options.projectId);
  const { data: personas, error } = await query;
  if (error) {
    console.error("[personas] list failed:", error.code ?? error.message);
    throw new Error("We couldn't load your personas.");
  }
  if (!personas?.length) return [];

  const [projects, evidence] = await Promise.all([
    supabase.from("projects").select("id, name").in("id", [...new Set(personas.map((p) => p.project_id))]),
    supabase.from("persona_evidence").select("persona_id").in("persona_id", personas.map((p) => p.id)),
  ]);
  const names = new Map((projects.data ?? []).map((p) => [p.id, p.name]));
  const counts = new Map<string, number>();
  for (const e of evidence.data ?? []) counts.set(e.persona_id, (counts.get(e.persona_id) ?? 0) + 1);
  return personas.map((p) => ({ ...p, project_name: names.get(p.project_id) ?? null, evidence_count: counts.get(p.id) ?? 0 }));
}

/** Loads up to four personas for side-by-side comparison (each read under RLS). */
export async function loadPersonasForComparison(ids: string[]) {
  await requireUser();
  const unique = [...new Set(ids)].filter((id) => z.uuid().safeParse(id).success).slice(0, 4);
  const bundles = await Promise.all(unique.map((id) => loadPersonaBundle(id)));
  return bundles.filter((b): b is PersonaBundle => b !== null);
}

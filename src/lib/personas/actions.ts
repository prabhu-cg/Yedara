"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/auth/dal";
import { fail, flattenErrors, GENERIC_ERROR, type ActionResult } from "@/lib/action-result";
import { createClient } from "@/lib/supabase/server";
import {
  PERSONA_DEFAULT_POSITIONS,
  PERSONA_SECTION_KEYS,
  PERSONA_TOTAL_STEPS,
  type PersonaSectionKey,
} from "@/lib/personas/constants";
import { loadPersonaBundle } from "@/lib/personas/queries";
import {
  PERSONA_SCHEMAS,
  emptyPersonaContent,
  evidenceInputSchema,
  personaMetaSchema,
  type AnyPersonaContent,
  type EvidenceRow,
} from "@/lib/personas/schemas";
import { getPersonaCompletionIssues } from "@/lib/personas/validation";
import type { Json } from "@/lib/supabase/database.types";

const idSchema = z.uuid({ error: "Persona not found." });
const NOT_FOUND = "Persona not found.";
const asJson = (v: unknown) => v as Json;

function revalidatePersonas(personaId?: string, projectId?: string) {
  revalidatePath("/recent");
  revalidatePath("/tools/persona-builder");
  revalidatePath("/dashboard");
  if (personaId) revalidatePath(`/tools/persona-builder/${personaId}`);
  if (projectId) revalidatePath(`/projects/${projectId}`);
}

/** The owner always comes from the verified session; RLS enforces the same rule in the database. */
async function ownedPersona(personaId: string, userId: string) {
  const supabase = await createClient();
  const { data } = await supabase.from("personas").select("id, project_id, persona_type").eq("id", personaId).eq("owner_id", userId).maybeSingle();
  return { supabase, persona: data };
}

export async function createPersonaAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  const parsed = personaMetaSchema.safeParse(input);
  if (!parsed.success) return fail("Check the highlighted fields.", flattenErrors(parsed.error));

  const user = await requireUser();
  const supabase = await createClient();
  const { data: project } = await supabase.from("projects").select("id").eq("id", parsed.data.projectId).eq("owner_id", user.id).maybeSingle();
  if (!project) return fail("Choose one of your projects.", { projectId: ["Choose one of your projects"] });

  const { data: persona, error } = await supabase
    .from("personas")
    .insert({ owner_id: user.id, project_id: project.id, name: parsed.data.name, persona_type: parsed.data.personaType })
    .select("id")
    .single();
  if (error || !persona) {
    console.error("[personas] create failed:", error?.code ?? error?.message);
    return fail("We couldn't create the persona. Please try again.");
  }

  const { error: sectionError } = await supabase.from("persona_sections").insert(
    PERSONA_SECTION_KEYS.map((key) => ({
      persona_id: persona.id,
      key,
      position: PERSONA_DEFAULT_POSITIONS[key],
      content: asJson(emptyPersonaContent(key)),
    })),
  );
  if (sectionError) {
    console.error("[personas] create sections failed:", sectionError.code ?? sectionError.message);
    await supabase.from("personas").delete().eq("id", persona.id).eq("owner_id", user.id);
    return fail("We couldn't create the persona. Please try again.");
  }
  revalidatePersonas(undefined, project.id);
  return { ok: true, data: { id: persona.id } };
}

const metaPatchSchema = z.object({
  name: personaMetaSchema.shape.name.optional(),
  projectId: z.uuid().optional(),
  personaType: personaMetaSchema.shape.personaType.optional(),
  currentStep: z.number().int().min(1).max(PERSONA_TOTAL_STEPS).optional(),
});

export async function updatePersonaMetaAction(personaId: string, input: unknown): Promise<ActionResult<{ savedAt: string }>> {
  const id = idSchema.safeParse(personaId);
  if (!id.success) return fail(NOT_FOUND);
  const parsed = metaPatchSchema.safeParse(input);
  if (!parsed.success) return fail("Check the highlighted fields.", flattenErrors(parsed.error));

  const user = await requireUser();
  const { supabase, persona } = await ownedPersona(id.data, user.id);
  if (!persona) return fail(NOT_FOUND);

  const update: { name?: string; project_id?: string; persona_type?: "research_backed" | "hypothesis" | "proto"; current_step?: number } = {};
  if (parsed.data.name !== undefined) update.name = parsed.data.name;
  if (parsed.data.personaType !== undefined) update.persona_type = parsed.data.personaType;
  if (parsed.data.currentStep !== undefined) update.current_step = parsed.data.currentStep;
  if (parsed.data.projectId !== undefined && parsed.data.projectId !== persona.project_id) {
    const { data: project } = await supabase.from("projects").select("id").eq("id", parsed.data.projectId).eq("owner_id", user.id).maybeSingle();
    if (!project) return fail("Choose one of your projects.", { projectId: ["Choose one of your projects"] });
    update.project_id = project.id;
  }
  if (!Object.keys(update).length) return { ok: true, data: { savedAt: new Date().toISOString() } };

  const { data, error } = await supabase.from("personas").update(update).eq("id", id.data).eq("owner_id", user.id).select("id, updated_at").maybeSingle();
  if (error) {
    console.error("[personas] meta failed:", error.code ?? error.message);
    return fail("We couldn't save your changes.");
  }
  if (!data) return fail(NOT_FOUND);
  if (update.project_id || update.persona_type) revalidatePersonas(id.data, update.project_id ?? persona.project_id);
  return { ok: true, data: { savedAt: data.updated_at } };
}

export async function savePersonaSectionAction(
  personaId: string,
  key: string,
  content: unknown,
): Promise<ActionResult<{ savedAt: string; content: AnyPersonaContent }>> {
  const id = idSchema.safeParse(personaId);
  if (!id.success || !(PERSONA_SECTION_KEYS as readonly string[]).includes(key)) return fail(NOT_FOUND);
  const sectionKey = key as PersonaSectionKey;
  const parsed = PERSONA_SCHEMAS[sectionKey].safeParse(content);
  if (!parsed.success) return fail("Some of that content is too long or invalid.", flattenErrors(parsed.error));

  const user = await requireUser();
  const { supabase, persona } = await ownedPersona(id.data, user.id);
  if (!persona) return fail(NOT_FOUND);

  const value = asJson(parsed.data);
  const { data, error } = await supabase.from("persona_sections").update({ content: value }).eq("persona_id", id.data).eq("key", sectionKey).select("id, updated_at");
  if (error) {
    console.error("[personas] section save failed:", error.code ?? error.message);
    return fail("We couldn't save your changes.");
  }
  let savedAt = data?.[0]?.updated_at;
  if (!savedAt) {
    const { data: created, error: insertError } = await supabase
      .from("persona_sections")
      .insert({ persona_id: id.data, key: sectionKey, position: PERSONA_DEFAULT_POSITIONS[sectionKey], content: value })
      .select("updated_at")
      .single();
    if (insertError || !created) return fail("We couldn't save your changes.");
    savedAt = created.updated_at;
  }
  return { ok: true, data: { savedAt, content: parsed.data as AnyPersonaContent } };
}

const dbEvidence = (e: z.output<typeof evidenceInputSchema>) => ({
  kind: e.kind,
  content: e.content,
  source_label: e.source_label || null,
  source_url: e.source_url || null,
  participant_ref: e.participant_ref || null,
  confidence: e.confidence || null,
  validation_status: e.validation_status,
});

export async function addEvidenceAction(personaId: string, input: unknown): Promise<ActionResult<{ evidence: EvidenceRow }>> {
  const id = idSchema.safeParse(personaId);
  if (!id.success) return fail(NOT_FOUND);
  const parsed = evidenceInputSchema.safeParse(input);
  if (!parsed.success) return fail("Check the highlighted fields.", flattenErrors(parsed.error));

  const user = await requireUser();
  const { supabase, persona } = await ownedPersona(id.data, user.id);
  if (!persona) return fail(NOT_FOUND);

  const { count } = await supabase.from("persona_evidence").select("id", { count: "exact", head: true }).eq("persona_id", id.data);
  const { data, error } = await supabase
    .from("persona_evidence")
    // Evidence typed by a person is always origin "manual"; only a future AI service may write "ai".
    .insert({ persona_id: id.data, ...dbEvidence(parsed.data), origin: "manual", position: (count ?? 0) * 10 })
    .select("id, kind, content, source_label, source_url, participant_ref, confidence, validation_status, origin, position")
    .single();
  if (error || !data) {
    console.error("[personas] add evidence failed:", error?.code ?? error?.message);
    return fail("We couldn't save that evidence. Please try again.");
  }
  revalidatePath(`/tools/persona-builder/${id.data}`);
  return {
    ok: true,
    data: {
      evidence: {
        id: data.id, kind: data.kind, content: data.content, source_label: data.source_label ?? "", source_url: data.source_url ?? "",
        participant_ref: data.participant_ref ?? "", confidence: data.confidence ?? "", validation_status: data.validation_status,
        origin: data.origin, position: data.position,
      },
    },
  };
}

export async function updateEvidenceAction(personaId: string, evidenceId: string, input: unknown): Promise<ActionResult<{ savedAt: string }>> {
  const pid = idSchema.safeParse(personaId);
  const eid = z.uuid().safeParse(evidenceId);
  if (!pid.success || !eid.success) return fail(NOT_FOUND);
  const parsed = evidenceInputSchema.safeParse(input);
  if (!parsed.success) return fail("Check the highlighted fields.", flattenErrors(parsed.error));

  const user = await requireUser();
  const { supabase, persona } = await ownedPersona(pid.data, user.id);
  if (!persona) return fail(NOT_FOUND);

  const { data, error } = await supabase.from("persona_evidence").update(dbEvidence(parsed.data)).eq("id", eid.data).eq("persona_id", pid.data).select("id, updated_at").maybeSingle();
  if (error) {
    console.error("[personas] update evidence failed:", error.code ?? error.message);
    return fail("We couldn't save your changes.");
  }
  if (!data) return fail("Evidence not found.");
  return { ok: true, data: { savedAt: data.updated_at } };
}

export async function deleteEvidenceAction(personaId: string, evidenceId: string): Promise<ActionResult> {
  const pid = idSchema.safeParse(personaId);
  const eid = z.uuid().safeParse(evidenceId);
  if (!pid.success || !eid.success) return fail(NOT_FOUND);

  const user = await requireUser();
  const { supabase, persona } = await ownedPersona(pid.data, user.id);
  if (!persona) return fail(NOT_FOUND);
  const { data, error } = await supabase.from("persona_evidence").delete().eq("id", eid.data).eq("persona_id", pid.data).select("id");
  if (error) {
    console.error("[personas] delete evidence failed:", error.code ?? error.message);
    return fail(GENERIC_ERROR);
  }
  if (!data?.length) return fail("Evidence not found.");
  return { ok: true };
}

export async function setPersonaStatusAction(personaId: string, status: unknown): Promise<ActionResult<{ status: "draft" | "completed" }>> {
  const id = idSchema.safeParse(personaId);
  const next = z.enum(["draft", "completed"]).safeParse(status);
  if (!id.success || !next.success) return fail(NOT_FOUND);

  const user = await requireUser();
  const { supabase, persona } = await ownedPersona(id.data, user.id);
  if (!persona) return fail(NOT_FOUND);

  if (next.data === "completed") {
    // Re-check on the server: the client's view is never trusted for completion.
    const bundle = await loadPersonaBundle(id.data);
    if (!bundle) return fail(NOT_FOUND);
    const issues = getPersonaCompletionIssues(
      { name: bundle.persona.name, projectId: bundle.persona.project_id, type: bundle.persona.persona_type },
      { context: bundle.content.context, profile: bundle.content.profile, behaviour: bundle.content.behaviour, evidence: bundle.evidence },
    );
    if (issues.length) return fail(`Complete the required fields first: ${[...new Set(issues.map((i) => i.message.toLowerCase()))].join("; ")}.`);
  }

  const { error } = await supabase
    .from("personas")
    .update({ status: next.data, completed_at: next.data === "completed" ? new Date().toISOString() : null })
    .eq("id", id.data)
    .eq("owner_id", user.id);
  if (error) {
    console.error("[personas] status failed:", error.code ?? error.message);
    return fail(GENERIC_ERROR);
  }
  revalidatePersonas(id.data, persona.project_id);
  return { ok: true, data: { status: next.data } };
}

export async function duplicatePersonaAction(personaId: string): Promise<ActionResult<{ id: string }>> {
  const id = idSchema.safeParse(personaId);
  if (!id.success) return fail(NOT_FOUND);
  const user = await requireUser();
  const { supabase, persona } = await ownedPersona(id.data, user.id);
  if (!persona) return fail(NOT_FOUND);

  const { data, error } = await supabase.rpc("duplicate_persona", { p_persona_id: id.data });
  if (error || !data) {
    console.error("[personas] duplicate failed:", error?.code ?? error?.message);
    return fail("We couldn't duplicate the persona. Please try again.");
  }
  revalidatePersonas(undefined, persona.project_id);
  return { ok: true, data: { id: data } };
}

export async function deletePersonaAction(personaId: string): Promise<ActionResult> {
  const id = idSchema.safeParse(personaId);
  if (!id.success) return fail(NOT_FOUND);
  const user = await requireUser();
  const supabase = await createClient();
  const { data, error } = await supabase.from("personas").delete().eq("id", id.data).eq("owner_id", user.id).select("id, project_id");
  if (error) {
    console.error("[personas] delete failed:", error.code ?? error.message);
    return fail("We couldn't delete the persona. Please try again.");
  }
  if (!data?.length) return fail(NOT_FOUND);
  revalidatePersonas(undefined, data[0].project_id);
  return { ok: true };
}

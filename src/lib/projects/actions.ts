"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth/dal";
import { fail, flattenErrors, GENERIC_ERROR, type ActionResult } from "@/lib/action-result";
import {
  projectFormSchema,
  projectIdSchema,
  toProjectColumns,
} from "@/lib/projects/schemas";

function revalidateProjects(projectId?: string) {
  revalidatePath("/recent");
  revalidatePath("/dashboard");
  revalidatePath("/projects");
  if (projectId) revalidatePath(`/projects/${projectId}`);
}

/**
 * Ownership rules: the owner is always taken from the verified session, never
 * from client input, and every mutation is additionally scoped with
 * `.eq("owner_id", user.id)`. RLS enforces the same rules in the database.
 */

export async function createProjectAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  const parsed = projectFormSchema.safeParse(input);
  if (!parsed.success) return fail("Check the highlighted fields.", flattenErrors(parsed.error));

  const user = await requireUser();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("projects")
    .insert({ ...toProjectColumns(parsed.data), owner_id: user.id })
    .select("id")
    .single();

  if (error || !data) {
    console.error("[projects] create failed:", error?.code ?? error?.message);
    return fail("We couldn't create the project. Please try again.");
  }
  revalidateProjects();
  return { ok: true, data: { id: data.id } };
}

export async function updateProjectAction(
  projectId: string,
  input: unknown,
): Promise<ActionResult<{ id: string }>> {
  const id = projectIdSchema.safeParse(projectId);
  if (!id.success) return fail("Project not found.");
  const parsed = projectFormSchema.safeParse(input);
  if (!parsed.success) return fail("Check the highlighted fields.", flattenErrors(parsed.error));

  const user = await requireUser();
  const supabase = await createClient();

  const { name, description, client, industry, project_type, product_service, target_audience, research_objectives } =
    toProjectColumns(parsed.data);
  // Editing an archived project must not silently un-archive it.
  const { data: existing } = await supabase
    .from("projects")
    .select("status")
    .eq("id", id.data)
    .eq("owner_id", user.id)
    .maybeSingle();
  if (!existing) return fail("Project not found.");

  const update =
    existing.status === "archived"
      ? { name, description, client, industry, project_type, product_service, target_audience, research_objectives }
      : { name, description, client, industry, project_type, product_service, target_audience, research_objectives, status: parsed.data.status };

  const { data, error } = await supabase
    .from("projects")
    .update(update)
    .eq("id", id.data)
    .eq("owner_id", user.id)
    .select("id")
    .maybeSingle();

  if (error) {
    console.error("[projects] update failed:", error.code ?? error.message);
    return fail("We couldn't save your changes. Please try again.");
  }
  if (!data) return fail("Project not found.");
  revalidateProjects(data.id);
  return { ok: true, data: { id: data.id } };
}

export async function archiveProjectAction(projectId: string): Promise<ActionResult> {
  const id = projectIdSchema.safeParse(projectId);
  if (!id.success) return fail("Project not found.");

  const user = await requireUser();
  const supabase = await createClient();
  const { data: existing } = await supabase
    .from("projects")
    .select("status")
    .eq("id", id.data)
    .eq("owner_id", user.id)
    .maybeSingle();
  if (!existing) return fail("Project not found.");
  if (existing.status === "archived") return { ok: true };

  const { error } = await supabase
    .from("projects")
    .update({
      previous_status: existing.status,
      status: "archived",
      archived_at: new Date().toISOString(),
    })
    .eq("id", id.data)
    .eq("owner_id", user.id);

  if (error) {
    console.error("[projects] archive failed:", error.code ?? error.message);
    return fail(GENERIC_ERROR);
  }
  revalidateProjects(id.data);
  return { ok: true };
}

export async function restoreProjectAction(projectId: string): Promise<ActionResult> {
  const id = projectIdSchema.safeParse(projectId);
  if (!id.success) return fail("Project not found.");

  const user = await requireUser();
  const supabase = await createClient();
  const { data: existing } = await supabase
    .from("projects")
    .select("status, previous_status")
    .eq("id", id.data)
    .eq("owner_id", user.id)
    .maybeSingle();
  if (!existing) return fail("Project not found.");
  if (existing.status !== "archived") return { ok: true };

  const { error } = await supabase
    .from("projects")
    .update({
      status: existing.previous_status ?? "planning",
      previous_status: null,
      archived_at: null,
    })
    .eq("id", id.data)
    .eq("owner_id", user.id);

  if (error) {
    console.error("[projects] restore failed:", error.code ?? error.message);
    return fail(GENERIC_ERROR);
  }
  revalidateProjects(id.data);
  return { ok: true };
}

export async function deleteProjectAction(projectId: string): Promise<ActionResult> {
  const id = projectIdSchema.safeParse(projectId);
  if (!id.success) return fail("Project not found.");

  const user = await requireUser();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("projects")
    .delete()
    .eq("id", id.data)
    .eq("owner_id", user.id)
    .select("id");

  if (error) {
    console.error("[projects] delete failed:", error.code ?? error.message);
    return fail("We couldn't delete the project. Please try again.");
  }
  if (!data?.length) return fail("Project not found.");
  revalidateProjects();
  return { ok: true };
}

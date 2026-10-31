import "server-only";
import { notFound } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth/dal";
import {
  DEFAULT_STATUS_FILTER,
  PROJECT_STATUSES,
  STATUS_FILTERS,
  type StatusFilter,
} from "@/lib/projects/constants";
import type { Database, ProjectStatus } from "@/lib/supabase/database.types";

export type Project = Database["public"]["Tables"]["projects"]["Row"];

const PROJECT_COLUMNS =
  "id, owner_id, name, description, client, industry, project_type, status, previous_status, archived_at, created_at, updated_at";

/**
 * Makes user text safe inside a PostgREST `or()` filter and an ILIKE pattern:
 * strips filter-syntax characters and escapes LIKE wildcards.
 */
export function sanitizeSearchTerm(raw: string) {
  return raw
    .trim()
    .slice(0, 80)
    .replace(/[,()"'\\:*]/g, " ")
    .replace(/[%_]/g, (c) => `\\${c}`)
    .replace(/\s+/g, " ")
    .trim();
}

export function parseStatusFilter(value: string | undefined): StatusFilter {
  return (STATUS_FILTERS as readonly string[]).includes(value ?? "")
    ? (value as StatusFilter)
    : DEFAULT_STATUS_FILTER;
}

export async function listProjects(options: { q?: string; status?: StatusFilter } = {}) {
  await requireUser();
  const supabase = await createClient();
  const status = options.status ?? DEFAULT_STATUS_FILTER;

  let query = supabase
    .from("projects")
    .select(PROJECT_COLUMNS)
    .order("updated_at", { ascending: false })
    .limit(200);

  if (status === "active") query = query.neq("status", "archived");
  else if (status !== "all") query = query.eq("status", status);

  const term = sanitizeSearchTerm(options.q ?? "");
  if (term) {
    const pattern = `%${term}%`;
    query = query.or(`name.ilike.${pattern},client.ilike.${pattern},description.ilike.${pattern}`);
  }

  const { data, error } = await query;
  if (error) {
    console.error("[projects] list failed:", error.code ?? error.message);
    throw new Error("We couldn't load your projects.");
  }
  return data;
}

/** Returns the project, or triggers a 404 when it does not exist or is not visible. */
export async function getProject(projectId: string) {
  await requireUser();
  if (!z.uuid().safeParse(projectId).success) notFound();

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("projects")
    .select(PROJECT_COLUMNS)
    .eq("id", projectId)
    .maybeSingle();

  if (error) {
    console.error("[projects] get failed:", error.code ?? error.message);
    throw new Error("We couldn't load this project.");
  }
  // RLS hides other users' rows, so "not yours" and "missing" look identical.
  if (!data) notFound();
  return data;
}

export async function getDashboardData() {
  await requireUser();
  const supabase = await createClient();

  const [recent, edited, ...counts] = await Promise.all([
    supabase
      .from("projects")
      .select(PROJECT_COLUMNS)
      .neq("status", "archived")
      .order("created_at", { ascending: false })
      .limit(6),
    supabase
      .from("projects")
      .select(PROJECT_COLUMNS)
      .neq("status", "archived")
      .order("updated_at", { ascending: false })
      .limit(5),
    ...PROJECT_STATUSES.map((status) =>
      supabase.from("projects").select("id", { count: "exact", head: true }).eq("status", status),
    ),
  ]);

  const failed = [recent, edited, ...counts].find((r) => r.error);
  if (failed?.error) {
    console.error("[projects] dashboard failed:", failed.error.code ?? failed.error.message);
    throw new Error("We couldn't load your dashboard.");
  }

  const statusCounts = Object.fromEntries(
    PROJECT_STATUSES.map((status, i) => [status, counts[i].count ?? 0]),
  ) as Record<ProjectStatus, number>;

  const total = Object.values(statusCounts).reduce((a, b) => a + b, 0);
  return {
    recent: recent.data ?? [],
    // updated_at only moves past created_at once a project has actually been edited.
    recentlyEdited: (edited.data ?? []).filter((p) => p.updated_at > p.created_at),
    statusCounts,
    total,
  };
}

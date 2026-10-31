import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/**
 * Data access layer for the current session. `getUser()` calls Supabase Auth
 * to validate the JWT (unlike reading the cookie), so it is safe to use for
 * authorisation decisions. Cached per request.
 */
export const getUser = cache(async () => {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;
  return data.user;
});

export async function requireUser() {
  const user = await getUser();
  if (!user) redirect("/login");
  return user;
}

export const getProfile = cache(async () => {
  const user = await requireUser();
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("id, full_name, job_title, company, avatar_url")
    .eq("id", user.id)
    .maybeSingle();
  return data;
});

export function displayName(
  profile: { full_name: string | null } | null,
  email: string | undefined,
) {
  return profile?.full_name?.trim() || email?.split("@")[0] || "there";
}

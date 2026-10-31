"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { env } from "@/lib/env";
import { serverEnv } from "@/lib/server-env";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth/dal";
import { fail, flattenErrors, GENERIC_ERROR, type ActionResult } from "@/lib/action-result";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { safeRedirectPath } from "@/lib/routes";
import {
  forgotPasswordSchema,
  loginSchema,
  profileSchema,
  resetPasswordSchema,
  signupSchema,
} from "@/lib/auth/schemas";

async function clientIp() {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "unknown";
}

async function siteOrigin() {
  if (env.NEXT_PUBLIC_SITE_URL) return env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "");
  const h = await headers();
  return h.get("origin") ?? "http://localhost:3000";
}

async function limited(policy: keyof typeof RATE_LIMITS, scope: string) {
  const base = RATE_LIMITS[policy];
  const override =
    policy === "authAttempt" ? serverEnv.AUTH_RATE_LIMIT_MAX : policy === "passwordReset" ? serverEnv.PASSWORD_RESET_RATE_LIMIT_MAX : undefined;
  const effective = override ? { ...base, limit: override } : base;
  const result = await checkRateLimit(`${scope}:${await clientIp()}`, effective);
  return result.allowed ? null : fail("Too many attempts. Please wait a moment and try again.");
}

export async function signInAction(
  input: unknown,
  next?: string | null,
): Promise<ActionResult<{ redirectTo: string }>> {
  const parsed = loginSchema.safeParse(input);
  if (!parsed.success) return fail("Check the highlighted fields.", flattenErrors(parsed.error));

  const blocked = await limited("authAttempt", "login");
  if (blocked) return blocked;

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) {
    if (error.code === "email_not_confirmed") {
      return fail("Please confirm your email address first. Check your inbox for the link.");
    }
    // Deliberately identical for unknown email and wrong password.
    return fail("Invalid email or password.");
  }
  return { ok: true, data: { redirectTo: safeRedirectPath(next) } };
}

export async function signUpAction(
  input: unknown,
): Promise<ActionResult<{ redirectTo?: string; needsConfirmation: boolean }>> {
  const parsed = signupSchema.safeParse(input);
  if (!parsed.success) return fail("Check the highlighted fields.", flattenErrors(parsed.error));

  const blocked = await limited("authAttempt", "signup");
  if (blocked) return blocked;

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: { full_name: parsed.data.fullName },
      emailRedirectTo: `${await siteOrigin()}/auth/callback?next=/dashboard`,
    },
  });

  if (error) {
    if (error.code === "weak_password") {
      return fail("That password is too easy to guess. Try a longer or less common one.");
    }
    console.error("[auth] signUp failed:", error.code ?? error.message);
    return fail("We couldn't create your account. Please try again.");
  }

  // With email confirmation enabled there is no session until the link is used.
  return data.session
    ? { ok: true, data: { redirectTo: "/dashboard", needsConfirmation: false } }
    : { ok: true, data: { needsConfirmation: true } };
}

export async function signOutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

export async function requestPasswordResetAction(input: unknown): Promise<ActionResult> {
  const parsed = forgotPasswordSchema.safeParse(input);
  if (!parsed.success) return fail("Enter a valid email address.", flattenErrors(parsed.error));

  const blocked = await limited("passwordReset", "reset");
  if (blocked) return blocked;

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${await siteOrigin()}/auth/callback?next=/reset-password`,
  });
  if (error) console.error("[auth] reset request failed:", error.code ?? error.message);

  // Always succeed so the response never reveals whether an email is registered.
  return { ok: true };
}

export async function updatePasswordAction(input: unknown): Promise<ActionResult> {
  const parsed = resetPasswordSchema.safeParse(input);
  if (!parsed.success) return fail("Check the highlighted fields.", flattenErrors(parsed.error));

  await requireUser();
  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) {
    if (error.code === "same_password") return fail("Choose a password you haven't used before.");
    if (error.code === "weak_password") return fail("That password is too easy to guess.");
    console.error("[auth] updatePassword failed:", error.code ?? error.message);
    return fail(GENERIC_ERROR);
  }
  return { ok: true };
}

export async function updateProfileAction(input: unknown): Promise<ActionResult> {
  const parsed = profileSchema.safeParse(input);
  if (!parsed.success) return fail("Check the highlighted fields.", flattenErrors(parsed.error));

  const user = await requireUser();
  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({
      full_name: parsed.data.fullName,
      job_title: parsed.data.jobTitle || null,
      company: parsed.data.company || null,
    })
    .eq("id", user.id);

  if (error) {
    console.error("[profile] update failed:", error.code ?? error.message);
    return fail(GENERIC_ERROR);
  }
  revalidatePath("/", "layout");
  return { ok: true };
}

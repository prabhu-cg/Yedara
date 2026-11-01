"use server";

import { headers } from "next/headers";
import { fail, flattenErrors, GENERIC_ERROR, type ActionResult } from "@/lib/action-result";
import { contactSchema, countLinks, MAX_LINKS, MIN_FILL_MS } from "@/lib/contact/schema";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { createClient } from "@/lib/supabase/server";

async function clientIp() {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "unknown";
}

/**
 * Stores a message from the public contact form. Works without a session.
 * Spam handling, in order: schema validation, a honeypot field, a minimum fill time,
 * a link limit and a per-IP rate limit. A tripped honeypot or timer returns success
 * so a bot learns nothing, but nothing is stored.
 */
export async function sendContactMessageAction(input: unknown): Promise<ActionResult> {
  const parsed = contactSchema.safeParse(input);
  if (!parsed.success) return fail("Check the highlighted fields.", flattenErrors(parsed.error));
  const { website, openedAt, ...message } = parsed.data;

  if (website) return { ok: true };
  if (typeof openedAt !== "number" || Date.now() - openedAt < MIN_FILL_MS) return { ok: true };

  if (countLinks(message.message) > MAX_LINKS) {
    return fail("Please remove some of the links from your message.", {
      message: ["Messages with more than two links can't be sent."],
    });
  }

  const limit = await checkRateLimit(`contact:${await clientIp()}`, RATE_LIMITS.contact);
  if (!limit.allowed) {
    return fail(`You've sent a few messages already. Please try again in ${Math.ceil(limit.retryAfterSeconds / 60)} minutes.`);
  }

  const supabase = await createClient();
  const { error } = await supabase.from("contact_messages").insert(message);
  if (error) {
    console.error("[contact] insert failed:", error.code ?? error.message);
    return fail(GENERIC_ERROR);
  }
  return { ok: true };
}

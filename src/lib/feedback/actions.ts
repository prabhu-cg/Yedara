"use server";

import { headers } from "next/headers";
import { fail, flattenErrors, GENERIC_ERROR, type ActionResult } from "@/lib/action-result";
import { fileFeedback, isGithubConfigured } from "@/lib/feedback/github";
import { countLinks, feedbackSchema, MAX_LINKS, MIN_FILL_MS } from "@/lib/feedback/schema";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit";

async function clientIp() {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "unknown";
}

/**
 * Files feedback from the public widget as a GitHub issue. Works without a session and
 * collects no personal details, because issues in a public repository are public.
 * Spam handling, in order: schema validation, a honeypot field, a minimum fill time,
 * a link limit and a per-IP rate limit. A tripped honeypot or timer returns success
 * so a bot learns nothing, but nothing is filed.
 */
export async function sendFeedbackAction(input: unknown): Promise<ActionResult> {
  const parsed = feedbackSchema.safeParse(input);
  if (!parsed.success) return fail("Check the highlighted fields.", flattenErrors(parsed.error));
  const { website, openedAt, type, message } = parsed.data;

  if (website) return { ok: true };
  if (typeof openedAt !== "number" || Date.now() - openedAt < MIN_FILL_MS) return { ok: true };

  if (countLinks(message) > MAX_LINKS) {
    return fail("Please remove some of the links from your feedback.", {
      message: ["Feedback with more than two links can't be sent."],
    });
  }

  const limit = await checkRateLimit(`feedback:${await clientIp()}`, RATE_LIMITS.feedback);
  if (!limit.allowed) {
    return fail(`You've sent a few messages already. Please try again in ${Math.ceil(limit.retryAfterSeconds / 60)} minutes.`);
  }

  if (!isGithubConfigured()) return fail("Feedback isn't available right now. Please try again later.");

  try {
    await fileFeedback(type, message);
    return { ok: true };
  } catch (error) {
    // Log the failure only, never the submitted content.
    console.error(`[feedback] failed: ${error instanceof Error ? error.message : "unknown"}`);
    return fail(GENERIC_ERROR);
  }
}

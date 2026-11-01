import { beforeEach, describe, expect, it, vi } from "vitest";
import { countLinks, feedbackSchema } from "@/lib/feedback/schema";

const fileFeedback = vi.fn();
const isGithubConfigured = vi.fn();
vi.mock("@/lib/feedback/github", () => ({
  fileFeedback: (...a: unknown[]) => fileFeedback(...a),
  isGithubConfigured: () => isGithubConfigured(),
}));
vi.mock("next/headers", () => ({
  headers: async () => new Headers({ "x-forwarded-for": `203.0.113.${Math.floor(Math.random() * 250)}` }),
}));

import { sendFeedbackAction } from "@/lib/feedback/actions";

const valid = { type: "idea", message: "Let me export a journey to PDF.", website: "" };
const slow = () => ({ openedAt: Date.now() - 10_000 });

beforeEach(() => {
  fileFeedback.mockReset().mockResolvedValue(undefined);
  isGithubConfigured.mockReset().mockReturnValue(true);
});

describe("feedback schema", () => {
  it("accepts normal feedback", () => {
    expect(feedbackSchema.safeParse(valid).success).toBe(true);
  });
  it.each([
    ["unknown type", { type: "sales" }],
    ["too short", { message: "hi" }],
    ["too long", { message: "x".repeat(2001) }],
  ])("rejects %s", (_label, patch) => {
    expect(feedbackSchema.safeParse({ ...valid, ...patch }).success).toBe(false);
  });
  it("counts links", () => {
    expect(countLinks("see https://a.co and www.b.co and http://c.co")).toBe(3);
  });
});

describe("sendFeedbackAction", () => {
  it("files valid feedback", async () => {
    const result = await sendFeedbackAction({ ...valid, ...slow() });
    expect(result.ok).toBe(true);
    expect(fileFeedback).toHaveBeenCalledWith("idea", valid.message);
  });
  it("returns field errors and files nothing when invalid", async () => {
    const result = await sendFeedbackAction({ ...valid, message: "hi", ...slow() });
    expect(result.ok).toBe(false);
    expect(!result.ok && result.fieldErrors?.message).toBeTruthy();
    expect(fileFeedback).not.toHaveBeenCalled();
  });
  it("silently drops honeypot hits, instant submissions and missing timestamps", async () => {
    expect((await sendFeedbackAction({ ...valid, website: "http://spam.example", ...slow() })).ok).toBe(true);
    expect((await sendFeedbackAction({ ...valid, openedAt: Date.now() })).ok).toBe(true);
    expect((await sendFeedbackAction(valid)).ok).toBe(true);
    expect(fileFeedback).not.toHaveBeenCalled();
  });
  it("rejects link-stuffed feedback", async () => {
    const message = "Buy now https://a.co https://b.co https://c.co";
    expect((await sendFeedbackAction({ ...valid, message, ...slow() })).ok).toBe(false);
    expect(fileFeedback).not.toHaveBeenCalled();
  });
  it("says so when GitHub is not configured", async () => {
    isGithubConfigured.mockReturnValue(false);
    const result = await sendFeedbackAction({ ...valid, ...slow() });
    expect(result).toMatchObject({ ok: false, error: expect.stringContaining("isn't available") });
  });
  it("reports a filing failure without leaking details", async () => {
    fileFeedback.mockRejectedValue(new Error("github 401"));
    vi.spyOn(console, "error").mockImplementation(() => {});
    const result = await sendFeedbackAction({ ...valid, ...slow() });
    expect(result).toMatchObject({ ok: false, error: "Something went wrong. Please try again." });
  });
});

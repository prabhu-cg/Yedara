import { describe, expect, it, vi, beforeEach } from "vitest";
import { contactSchema, countLinks, isContactTopic } from "@/lib/contact/schema";

const insert = vi.fn();
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({ from: () => ({ insert }) }),
}));
vi.mock("next/headers", () => ({
  headers: async () => new Headers({ "x-forwarded-for": `203.0.113.${Math.floor(Math.random() * 250)}` }),
}));

import { sendContactMessageAction } from "@/lib/contact/actions";

const valid = {
  name: "Sam",
  email: "sam@example.com",
  topic: "general",
  message: "How do I export a synthesis report?",
  website: "",
};
const slow = () => ({ openedAt: Date.now() - 10_000 });

beforeEach(() => insert.mockReset().mockResolvedValue({ error: null }));

describe("contact schema", () => {
  it("accepts a normal message", () => {
    expect(contactSchema.safeParse(valid).success).toBe(true);
  });
  it.each([
    ["empty name", { name: " " }],
    ["bad email", { email: "nope" }],
    ["unknown topic", { topic: "sales" }],
    ["too short", { message: "hi" }],
    ["too long", { message: "x".repeat(4001) }],
  ])("rejects %s", (_label, patch) => {
    expect(contactSchema.safeParse({ ...valid, ...patch }).success).toBe(false);
  });
  it("counts links and recognises topics", () => {
    expect(countLinks("see https://a.co and www.b.co and http://c.co")).toBe(3);
    expect(isContactTopic("pro")).toBe(true);
    expect(isContactTopic("nope")).toBe(false);
  });
});

describe("sendContactMessageAction", () => {
  it("stores a valid message", async () => {
    const result = await sendContactMessageAction({ ...valid, ...slow() });
    expect(result.ok).toBe(true);
    expect(insert).toHaveBeenCalledWith({ name: "Sam", email: "sam@example.com", topic: "general", message: valid.message });
  });
  it("returns field errors and stores nothing when invalid", async () => {
    const result = await sendContactMessageAction({ ...valid, email: "x", ...slow() });
    expect(result.ok).toBe(false);
    expect(!result.ok && result.fieldErrors?.email).toBeTruthy();
    expect(insert).not.toHaveBeenCalled();
  });
  it("silently drops honeypot hits", async () => {
    const result = await sendContactMessageAction({ ...valid, website: "http://spam.example", ...slow() });
    expect(result.ok).toBe(true);
    expect(insert).not.toHaveBeenCalled();
  });
  it("silently drops instant submissions and missing timestamps", async () => {
    expect((await sendContactMessageAction({ ...valid, openedAt: Date.now() })).ok).toBe(true);
    expect((await sendContactMessageAction(valid)).ok).toBe(true);
    expect(insert).not.toHaveBeenCalled();
  });
  it("rejects link-stuffed messages", async () => {
    const message = "Buy now https://a.co https://b.co https://c.co";
    const result = await sendContactMessageAction({ ...valid, message, ...slow() });
    expect(result.ok).toBe(false);
    expect(insert).not.toHaveBeenCalled();
  });
  it("reports a storage failure without leaking details", async () => {
    insert.mockResolvedValue({ error: { code: "XX000", message: "secret" } });
    vi.spyOn(console, "error").mockImplementation(() => {});
    const result = await sendContactMessageAction({ ...valid, ...slow() });
    expect(result).toMatchObject({ ok: false, error: "Something went wrong. Please try again." });
  });
});

import { describe, expect, it } from "vitest";
import { mergeRecent, type RecentItem } from "@/lib/recent";
import { buildWorkItems, parseWorkParams } from "@/lib/projects/work-items";
import { groupRecent } from "@/lib/recent-groups";

const row = (id: string, status: string, step: number, created_at: string, updated_at = created_at) => ({ id, status, current_step: step, created_at, updated_at });

describe("buildWorkItems", () => {
  it("merges the three tools, oldest first, each with its kind and link", () => {
    const items = buildWorkItems({
      plans: [{ ...row("p1", "draft", 2, "2026-01-01T00:00:00Z"), title: "Plan" }],
      personas: [{ ...row("s1", "completed", 6, "2026-01-03T00:00:00Z"), name: "Persona" }],
      analyses: [{ ...row("a1", "draft", 3, "2026-01-02T00:00:00Z"), title: "Analysis" }],
    });
    expect(items.map((i) => [i.kind, i.title])).toEqual([
      ["plan", "Plan"],
      ["analysis", "Analysis"],
      ["persona", "Persona"],
    ]);
    expect(items[0].href).toBe("/tools/research-planner/p1");
    expect(items[1].href).toBe("/tools/competitor-analyzer/a1");
    expect(items[2].href).toBe("/tools/persona-builder/s1");
  });

  it("reports progress only for unfinished work, against each tool's own step count", () => {
    const [analysis, plan, done] = buildWorkItems({
      plans: [{ ...row("p", "draft", 2, "2026-01-02T00:00:00Z"), title: "P" }],
      personas: [{ ...row("s", "completed", 6, "2026-01-03T00:00:00Z"), name: "S" }],
      analyses: [{ ...row("a", "draft", 3, "2026-01-01T00:00:00Z"), title: "A" }],
    });
    expect(done).toMatchObject({ completed: true, progress: null });
    expect(plan.progress).toBe("Step 2 of 7");
    expect(analysis.progress).toBe("Step 3 of 6");
  });

  it("keeps the order work was started in, however recently it was edited", () => {
    const items = buildWorkItems({
      plans: [{ ...row("old", "draft", 1, "2026-01-01T00:00:00Z", "2026-02-01T00:00:00Z"), title: "Edited since" }],
      personas: [{ ...row("new", "draft", 1, "2026-01-02T00:00:00Z", "2026-01-02T00:00:00Z"), name: "Started later" }],
      analyses: [],
    });
    expect(items.map((i) => i.title)).toEqual(["Edited since", "Started later"]);
  });

  it("is empty when there is no work", () => {
    expect(buildWorkItems({ plans: [], personas: [], analyses: [] })).toEqual([]);
  });
});

describe("parseWorkParams", () => {
  it("defaults to cards and all", () => {
    expect(parseWorkParams({})).toEqual({ view: "cards", type: "all" });
  });
  it("accepts known values", () => {
    expect(parseWorkParams({ view: "table", type: "persona" })).toEqual({ view: "table", type: "persona" });
  });
  it("ignores unknown or repeated values", () => {
    expect(parseWorkParams({ view: "grid", type: ["plan", "persona"] })).toEqual({ view: "cards", type: "all" });
  });
});

describe("mergeRecent", () => {
  const item = (id: string, updatedAt: string): RecentItem => ({ kind: "plan", id, title: id, href: `/x/${id}`, project: null, updatedAt });
  it("sorts newest first and caps the list", () => {
    const merged = mergeRecent([item("a", "2026-01-01T00:00:00Z"), item("c", "2026-01-03T00:00:00Z"), item("b", "2026-01-02T00:00:00Z")], 2);
    expect(merged.map((i) => i.id)).toEqual(["c", "b"]);
  });
});

describe("groupRecent", () => {
  const item = (id: string, updatedAt: string): RecentItem => ({ kind: "persona", id, title: id, href: `/x/${id}`, project: null, updatedAt });
  const now = "2026-10-31T12:00:00Z";

  it("buckets by day like a file manager and keeps the order", () => {
    const groups = groupRecent(
      [item("a", "2026-10-31T09:00:00Z"), item("b", "2026-10-30T20:00:00Z"), item("c", "2026-10-27T08:00:00Z"), item("d", "2026-10-10T08:00:00Z"), item("e", "2026-08-02T08:00:00Z"), item("f", "2025-12-25T08:00:00Z")],
      now,
      "UTC",
    );
    expect(groups.map((g) => [g.label, g.items.map((i) => i.id)])).toEqual([
      ["Today", ["a"]],
      ["Yesterday", ["b"]],
      ["Previous 7 days", ["c"]],
      ["Previous 30 days", ["d"]],
      ["August", ["e"]],
      ["December 2025", ["f"]],
    ]);
  });

  it("puts several items from the same day under one heading", () => {
    const groups = groupRecent([item("a", "2026-10-31T11:00:00Z"), item("b", "2026-10-31T10:00:00Z"), item("c", "2026-10-31T01:00:00Z")], now, "UTC");
    expect(groups).toHaveLength(1);
    expect(groups[0].items.map((i) => i.id)).toEqual(["a", "b", "c"]);
  });

  it("follows the reader's time zone for where a day starts", () => {
    // 23:30 UTC on the 30th is already the 31st in Tokyo, but still the 30th in New York.
    const late = [item("a", "2026-10-30T23:30:00Z")];
    expect(groupRecent(late, now, "Asia/Tokyo")[0].label).toBe("Today");
    expect(groupRecent(late, now, "America/New_York")[0].label).toBe("Yesterday");
  });

  it("is empty for no items", () => {
    expect(groupRecent([], now, "UTC")).toEqual([]);
  });
});

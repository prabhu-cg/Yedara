import { describe, expect, it } from "vitest";
import { completionIssues, EMPATHY_LIMITS, isQuadrant, QUADRANT_INFO, QUADRANTS, quadrantCounts } from "@/lib/empathy/constants";
import { empathyItemInputSchema, empathyMetaSchema, empathyPatchSchema } from "@/lib/empathy/schemas";

const id = "6f1c9a52-0e0e-4d6f-8a47-3f2a1d9c7b10";
const note = (quadrant: string, observation_id: string | null = null) => ({ quadrant, observation_id });

describe("empathy map quadrants", () => {
  it("are the classic four, in cross order, with observed on the left and inferred on the right", () => {
    expect(QUADRANTS).toEqual(["says", "thinks", "does", "feels"]);
    expect(QUADRANT_INFO.says.basis).toBe("observed");
    expect(QUADRANT_INFO.does.basis).toBe("observed");
    expect(QUADRANT_INFO.thinks.basis).toBe("inferred");
    expect(QUADRANT_INFO.feels.basis).toBe("inferred");
    // Left column of the 2x2 (index 0 and 2) is observed; right column (1 and 3) is inferred.
    expect([0, 2].every((i) => QUADRANT_INFO[QUADRANTS[i]].basis === "observed")).toBe(true);
    expect([1, 3].every((i) => QUADRANT_INFO[QUADRANTS[i]].basis === "inferred")).toBe(true);
  });

  it("recognises only real quadrants", () => {
    expect(isQuadrant("says")).toBe(true);
    expect(isQuadrant("pains")).toBe(false);
    expect(isQuadrant(undefined)).toBe(false);
  });
});

describe("quadrantCounts", () => {
  it("counts notes and how many cite evidence, ignoring unknown quadrants", () => {
    const counts = quadrantCounts([note("says", id), note("says"), note("does"), note("wants", id)]);
    expect(counts.says).toEqual({ notes: 2, evidenced: 1 });
    expect(counts.does).toEqual({ notes: 1, evidenced: 0 });
    expect(counts.thinks).toEqual({ notes: 0, evidenced: 0 });
    expect(counts.feels).toEqual({ notes: 0, evidenced: 0 });
  });
});

describe("completionIssues", () => {
  it("lists the quadrants that are neither filled nor marked not yet researched", () => {
    expect(completionIssues([], [])).toEqual(["says", "thinks", "does", "feels"]);
    expect(completionIssues([note("says"), note("does")], [])).toEqual(["thinks", "feels"]);
  });

  it("treats a quadrant marked not yet researched as a decision, not a gap", () => {
    expect(completionIssues([note("says"), note("does")], ["thinks", "feels"])).toEqual([]);
    expect(completionIssues([note("says")], ["says"])).toEqual(["thinks", "does", "feels"]);
  });
});

describe("empathy schemas", () => {
  it("requires a title and a project, and trims the text", () => {
    expect(empathyMetaSchema.safeParse({ title: "  ", projectId: id }).success).toBe(false);
    expect(empathyMetaSchema.safeParse({ title: "Maya", projectId: "nope" }).success).toBe(false);
    const parsed = empathyMetaSchema.parse({ title: "  Maya on a weeknight ", projectId: id, subject: " Planner " });
    expect(parsed).toMatchObject({ title: "Maya on a weeknight", subject: "Planner", personaId: "", context: "" });
  });

  it("does not require a persona", () => {
    expect(empathyMetaSchema.safeParse({ title: "Map", projectId: id }).success).toBe(true);
    expect(empathyMetaSchema.safeParse({ title: "Map", projectId: id, personaId: "not-a-uuid" }).success).toBe(false);
  });

  it("limits note length and only accepts the four quadrants", () => {
    expect(empathyItemInputSchema.safeParse({ quadrant: "wants", content: "x" }).success).toBe(false);
    expect(empathyItemInputSchema.safeParse({ quadrant: "says", content: "   " }).success).toBe(false);
    expect(empathyItemInputSchema.safeParse({ quadrant: "says", content: "x".repeat(EMPATHY_LIMITS.itemChars + 1) }).success).toBe(false);
    expect(empathyItemInputSchema.parse({ quadrant: "feels", content: " Anxious " })).toMatchObject({ content: "Anxious", observationId: "" });
  });

  it("a patch only contains the fields it names, so a rename cannot blank the subject or situation", () => {
    expect(empathyPatchSchema.parse({ title: "Renamed" })).toEqual({ title: "Renamed" });
    expect(empathyPatchSchema.parse({ context: "A Sunday evening" })).toEqual({ context: "A Sunday evening" });
    expect(empathyPatchSchema.parse({ subject: "" })).toEqual({ subject: "" });
  });

  it("accepts a partial patch with a not-researched list drawn from the quadrants", () => {
    expect(empathyPatchSchema.safeParse({ notResearched: ["thinks", "feels"] }).success).toBe(true);
    expect(empathyPatchSchema.safeParse({ notResearched: ["pains"] }).success).toBe(false);
    expect(empathyPatchSchema.safeParse({}).success).toBe(true);
  });
});

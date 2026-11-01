import { describe, expect, it } from "vitest";
import { curvePaths, curvePoints } from "@/lib/journeys/curve";
import { candidateFromItem } from "@/lib/journeys/opportunities";
import { itemInputSchema, itemPatchSchema, journeyMetaSchema, stagePatchSchema } from "@/lib/journeys/schemas";
import { ITEM_KINDS, ITEM_KIND_INFO, CONVERTIBLE_KINDS, EVIDENCE_KINDS, SUGGESTED_STAGES } from "@/lib/journeys/constants";

const stages = (...emotions: (number | null)[]) => emotions.map((emotion) => ({ emotion }));

describe("emotion curve", () => {
  it("places a point at the centre of each rated stage's column, higher for happier", () => {
    const pts = curvePoints(stages(5, 3, 1), 200, 132);
    expect(pts.map((p) => p.x)).toEqual([100, 300, 500]);
    expect(pts[0].y).toBeLessThan(pts[1].y);
    expect(pts[1].y).toBeLessThan(pts[2].y);
    expect(pts[0].y).toBe(16);
    expect(pts[2].y).toBe(132 - 16);
  });

  it("gives an unrated stage no point, so it is never drawn as neutral", () => {
    const pts = curvePoints(stages(4, null, 2), 100, 100);
    expect(pts.map((p) => p.index)).toEqual([0, 2]);
  });

  it("breaks the line across an unrated stage instead of joining over it", () => {
    expect(curvePaths(curvePoints(stages(4, null, 2), 100, 100))).toEqual([]);
    expect(curvePaths(curvePoints(stages(4, 3, null, 2, 5), 100, 100))).toHaveLength(2);
    expect(curvePaths(curvePoints(stages(1, 2, 3), 100, 100))).toHaveLength(1);
  });

  it("draws nothing for a single point or an empty journey", () => {
    expect(curvePaths(curvePoints(stages(3), 100, 100))).toEqual([]);
    expect(curvePaths(curvePoints([], 100, 100))).toEqual([]);
  });
});

describe("candidateFromItem", () => {
  const stage = { id: "s1", name: "Onboarding" };
  const journey = { id: "j1", name: "First week", project_id: "p1" };
  const item = { id: "i1", kind: "pain_point", content: "  Cannot find pricing  ", evidence_note: " P1 said so ", observation_id: "o1" };

  it("keeps the stage, journey, evidence note and linked observation", () => {
    expect(candidateFromItem(item, stage, journey)).toEqual({
      project_id: "p1", journey_id: "j1", stage_id: "s1", source_item_id: "i1", observation_id: "o1",
      title: "Cannot find pricing", origin_kind: "pain_point", journey_name: "First week", stage_name: "Onboarding", evidence_note: "P1 said so",
    });
  });

  it("works for opportunities and records no evidence as null", () => {
    const c = candidateFromItem({ ...item, kind: "opportunity", evidence_note: "  ", observation_id: null }, stage, journey);
    expect(c).toMatchObject({ origin_kind: "opportunity", evidence_note: null, observation_id: null });
  });

  it("refuses anything that is not a pain point or an opportunity", () => {
    for (const kind of ITEM_KINDS.filter((k) => !CONVERTIBLE_KINDS.includes(k))) {
      expect(candidateFromItem({ ...item, kind }, stage, journey)).toBeNull();
    }
  });

  it("trims long text to what the database allows", () => {
    const c = candidateFromItem({ ...item, content: "x".repeat(900) }, { id: "s", name: "y".repeat(200) }, { ...journey, name: "z".repeat(300) });
    expect(c!.title).toHaveLength(300);
    expect(c!.stage_name).toHaveLength(80);
    expect(c!.journey_name).toHaveLength(160);
  });
});

describe("journey schemas", () => {
  const project = "11111111-1111-4111-8111-111111111111";
  it("needs a name and a project, with sensible defaults", () => {
    expect(journeyMetaSchema.safeParse({ name: " ", projectId: project }).success).toBe(false);
    expect(journeyMetaSchema.safeParse({ name: "J", projectId: "nope" }).success).toBe(false);
    expect(journeyMetaSchema.parse({ name: " First week ", projectId: project })).toMatchObject({ name: "First week", personaId: "", journeyType: "customer", state: "current", scenario: "" });
  });

  it("only allows the four journey types and two states", () => {
    expect(journeyMetaSchema.safeParse({ name: "J", projectId: project, journeyType: "dream" }).success).toBe(false);
    expect(journeyMetaSchema.safeParse({ name: "J", projectId: project, state: "someday" }).success).toBe(false);
    for (const state of ["current", "future"]) expect(journeyMetaSchema.safeParse({ name: "J", projectId: project, state }).success).toBe(true);
  });

  it("keeps emotion between 1 and 5 or unrated", () => {
    for (const emotion of [1, 3, 5, null]) expect(stagePatchSchema.safeParse({ emotion }).success).toBe(true);
    for (const emotion of [0, 6, 2.5]) expect(stagePatchSchema.safeParse({ emotion }).success).toBe(false);
    expect(stagePatchSchema.safeParse({ name: "  " }).success).toBe(false);
  });

  it("requires item text, a known kind and a stage", () => {
    const stageId = "22222222-2222-4222-8222-222222222222";
    expect(itemInputSchema.safeParse({ stageId, kind: "action", content: " " }).success).toBe(false);
    expect(itemInputSchema.safeParse({ stageId, kind: "mood", content: "x" }).success).toBe(false);
    expect(itemInputSchema.safeParse({ stageId: "x", kind: "action", content: "x" }).success).toBe(false);
    expect(itemInputSchema.safeParse({ stageId, kind: "action", content: "x".repeat(1001) }).success).toBe(false);
    expect(itemInputSchema.parse({ stageId, kind: "pain_point", content: " Slow " })).toMatchObject({ content: "Slow", evidenceNote: "", observationId: "" });
  });

  it("allows clearing a linked observation with an empty string", () => {
    expect(itemPatchSchema.safeParse({ observationId: "" }).success).toBe(true);
    expect(itemPatchSchema.safeParse({ observationId: "not-a-uuid" }).success).toBe(false);
  });
});

describe("journey constants", () => {
  it("covers every stage element the brief lists, in reading order", () => {
    expect(ITEM_KINDS).toEqual(["action", "goal", "thought", "touchpoint", "channel", "pain_point", "opportunity", "evidence"]);
    for (const k of ITEM_KINDS) expect(ITEM_KIND_INFO[k].plural.length).toBeGreaterThan(0);
  });
  it("only pain points and opportunities can be converted, and they carry evidence", () => {
    expect([...CONVERTIBLE_KINDS]).toEqual(["pain_point", "opportunity"]);
    for (const k of CONVERTIBLE_KINDS) expect(EVIDENCE_KINDS).toContain(k);
  });
  it("offers stage suggestions as plain, optional names", () => {
    expect(SUGGESTED_STAGES.length).toBeGreaterThan(3);
  });
});

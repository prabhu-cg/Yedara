import { describe, expect, it } from "vitest";
import { clampStep } from "@/lib/research-planner/constants";
import {
  SECTION_SCHEMAS,
  emptyContent,
  methodsSchema,
  normalizeContent,
  parseContent,
  participantsSchema,
} from "@/lib/research-planner/schemas";
import { firstInvalidStepBefore, getCompletionIssues, getStepIssues, type CoreContents, type PlanMeta } from "@/lib/research-planner/validation";

const core = (over: Partial<{ [K in keyof CoreContents]: Partial<CoreContents[K]> }> = {}): CoreContents => ({
  context: { ...emptyContent("context"), ...over.context },
  goals: { ...emptyContent("goals"), ...over.goals },
  methods: { ...emptyContent("methods"), ...over.methods },
  participants: { ...emptyContent("participants"), ...over.participants },
});
const meta: PlanMeta = { title: "Plan", projectId: "p1" };
const fields = (step: number, m = meta, c = core()) => getStepIssues(step, m, c).map((i) => i.field);

describe("required fields per step", () => {
  it("step 1 needs a title, a project and a product description", () => {
    expect(fields(1, { title: "  ", projectId: null })).toEqual(["title", "projectId", "product_description"]);
    expect(fields(1, meta, core({ context: { product_description: "An app" } }))).toEqual([]);
  });

  it("step 2 needs a primary goal and one non-blank research question", () => {
    expect(fields(2)).toEqual(["primary_goal", "research_questions"]);
    expect(fields(2, meta, core({ goals: { primary_goal: "Goal", research_questions: ["", "  "] } }))).toEqual(["research_questions"]);
    expect(fields(2, meta, core({ goals: { primary_goal: "Goal", research_questions: ["Why?"] } }))).toEqual([]);
  });

  it("step 3 needs at least one method, and a description for 'other'", () => {
    expect(fields(3)).toEqual(["selected"]);
    expect(fields(3, meta, core({ methods: { selected: ["other"] } }))).toEqual(["other_description"]);
    expect(fields(3, meta, core({ methods: { selected: ["other"], other_description: "Workshop" } }))).toEqual([]);
  });

  it("step 4 needs a participant profile only when a method involves participants", () => {
    expect(fields(4, meta, core({ methods: { selected: ["user_interviews"] } }))).toEqual(["profile"]);
    expect(fields(4, meta, core({ methods: { selected: ["desk_research"] } }))).toEqual([]);
    expect(fields(4, meta, core({ methods: { selected: ["user_interviews"] }, participants: { profile: "Freelancers" } }))).toEqual([]);
  });

  it("optional steps and fields never block", () => {
    for (const step of [5, 6, 7]) expect(fields(step)).toEqual([]);
    // Nothing but the required fields is filled in.
    const minimal = core({
      context: { product_description: "x" },
      goals: { primary_goal: "g", research_questions: ["q"] },
      methods: { selected: ["desk_research"] },
    });
    expect(getCompletionIssues(meta, minimal)).toEqual([]);
  });

  it("completion collects issues across all required steps with their step numbers", () => {
    const issues = getCompletionIssues({ title: "", projectId: null }, core({ methods: { selected: ["surveys"] } }));
    expect(new Set(issues.map((i) => i.step))).toEqual(new Set([1, 2, 4]));
    expect(issues.every((i) => i.message.length > 5)).toBe(true);
  });

  it("finds the first incomplete required step before a target step", () => {
    expect(firstInvalidStepBefore(3, meta, core())).toBe(1);
    const c = core({ context: { product_description: "x" } });
    expect(firstInvalidStepBefore(3, meta, c)).toBe(2);
    expect(firstInvalidStepBefore(2, meta, c)).toBeNull();
    expect(firstInvalidStepBefore(1, meta, core())).toBeNull();
  });
});

describe("content schemas", () => {
  it("parse an empty object into complete, empty content for every section", () => {
    for (const key of Object.keys(SECTION_SCHEMAS) as (keyof typeof SECTION_SCHEMAS)[]) {
      expect(() => emptyContent(key)).not.toThrow();
    }
    expect(emptyContent("goals")).toEqual({
      primary_goal: "",
      objectives: [],
      research_questions: [],
      business_questions: [],
      user_questions: [],
      desired_outcomes: [],
    });
  });

  it("de-duplicates selected methods and rejects unknown ones", () => {
    expect(methodsSchema.parse({ selected: ["surveys", "surveys", "user_interviews"] }).selected).toEqual(["surveys", "user_interviews"]);
    expect(methodsSchema.safeParse({ selected: ["telepathy"] }).success).toBe(false);
  });

  it("enforces size limits and types", () => {
    expect(SECTION_SCHEMAS.context.safeParse({ product_description: "x".repeat(5001) }).success).toBe(false);
    expect(SECTION_SCHEMAS.goals.safeParse({ research_questions: Array(61).fill("q") }).success).toBe(false);
    expect(SECTION_SCHEMAS.goals.safeParse({ research_questions: ["x".repeat(1001)] }).success).toBe(false);
    expect(participantsSchema.safeParse({ count: 0 }).success).toBe(false);
    expect(participantsSchema.safeParse({ count: 2.5 }).success).toBe(false);
    expect(participantsSchema.safeParse({ count: "8" }).success).toBe(false);
    expect(participantsSchema.parse({ count: 8 }).count).toBe(8);
    expect(participantsSchema.parse({}).count).toBeNull();
  });

  it("strips unknown fields", () => {
    const parsed = SECTION_SCHEMAS.context.parse({ product_description: "x", is_admin: true });
    expect(parsed).not.toHaveProperty("is_admin");
  });

  it("falls back to empty content for corrupt stored data", () => {
    expect(parseContent("goals", { objectives: "not-a-list" })).toBeNull();
    expect(normalizeContent("goals", { objectives: "not-a-list" })).toEqual(emptyContent("goals"));
    expect(normalizeContent("context", null)).toEqual(emptyContent("context"));
  });

  it("validates structured material content", () => {
    expect(SECTION_SCHEMAS.survey_questions.safeParse({ questions: [{ text: "Q", type: "ranking", options: [] }] }).success).toBe(false);
    expect(SECTION_SCHEMAS.survey_questions.parse({ questions: [{ text: "Q" }] }).questions[0].type).toBe("open");
    expect(SECTION_SCHEMAS.interview_guide.safeParse({ blocks: [{ title: "T", minutes: -1, prompts: [] }] }).success).toBe(false);
  });
});

describe("clampStep", () => {
  it("accepts 1 to 7 and falls back to 1", () => {
    expect(clampStep("3")).toBe(3);
    expect(clampStep(7)).toBe(7);
    for (const bad of ["0", "8", "abc", "2.5", undefined, null, ""]) expect(clampStep(bad)).toBe(1);
  });
});

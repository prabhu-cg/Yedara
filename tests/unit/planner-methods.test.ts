import { describe, expect, it } from "vitest";
import { METHOD_IDS, MATERIAL_KEYS } from "@/lib/research-planner/constants";
import {
  GUIDANCE_DISCLAIMER,
  METHODS,
  applicableMaterialKeys,
  considerations,
  getMethod,
  methodsNeedParticipants,
  sampleHints,
  suggestMethods,
  type GuidanceInput,
} from "@/lib/research-planner/methods";

const input = (over: Partial<GuidanceInput> = {}): GuidanceInput => ({
  primary_goal: "",
  objectives: [],
  research_questions: [],
  business_questions: [],
  user_questions: [],
  ...over,
});
const ids = (i: GuidanceInput) => suggestMethods(i).map((s) => s.method);

describe("method catalogue", () => {
  it("covers every method with an explanation and use cases", () => {
    expect(METHODS.map((m) => m.id).sort()).toEqual([...METHOD_IDS].sort());
    for (const m of METHODS) {
      expect(m.name.length, m.id).toBeGreaterThan(2);
      expect(m.summary.length, m.id).toBeGreaterThan(20);
      expect(m.useWhen.length, m.id).toBeGreaterThan(0);
    }
  });

  it("states sample sizes only as rules of thumb", () => {
    for (const { hint } of sampleHints(METHOD_IDS)) expect(hint).toMatch(/commonly|often|many teams|depends|typically/i);
  });

  it("knows which methods involve participants", () => {
    expect(methodsNeedParticipants(["user_interviews"])).toBe(true);
    expect(methodsNeedParticipants(["desk_research", "competitive_research"])).toBe(false);
    expect(methodsNeedParticipants(["desk_research", "surveys"])).toBe(true);
    expect(methodsNeedParticipants([])).toBe(false);
  });
});

describe("suggestMethods (deterministic guidance)", () => {
  it("suggests nothing without input", () => {
    expect(suggestMethods(input())).toEqual([]);
  });

  it.each([
    ["behavioural questions", "How do freelancers currently manage their invoices?", ["user_interviews", "contextual_inquiry"]],
    ["motivation questions", "Why do customers abandon their carts?", ["user_interviews"]],
    ["task completion questions", "Can users complete checkout without help?", ["usability_testing"]],
    ["preference and distribution questions", "What percentage of users prefer the annual plan?", ["surveys"]],
    ["information architecture questions", "How would people group and label our help articles?", ["card_sorting", "tree_testing"]],
    ["longitudinal questions", "How does usage change over time?", ["diary_studies"]],
    ["competitive questions", "How do competitors handle onboarding?", ["competitive_research"]],
    ["existing knowledge questions", "What does existing research already tell us?", ["desk_research"]],
  ])("maps %s to the matching methods", (_name, question, expected) => {
    const result = ids(input({ research_questions: [question] }));
    for (const method of expected) expect(result, method).toContain(method);
  });

  it("reads the goal, objectives and every question list", () => {
    expect(ids(input({ primary_goal: "Find out if people can complete the sign-up flow" }))).toContain("usability_testing");
    expect(ids(input({ objectives: ["Learn how many users prefer dark mode"] }))).toContain("surveys");
    expect(ids(input({ business_questions: ["Which competitors do we lose to?"] }))).toContain("competitive_research");
    expect(ids(input({ user_questions: ["What are users' biggest frustrations?"] }))).toContain("user_interviews");
  });

  it("explains each suggestion with reasons and the user's own words", () => {
    const [first] = suggestMethods(input({ research_questions: ["Why do users abandon onboarding?"] }));
    expect(first.reasons.length).toBeGreaterThan(0);
    expect(first.signals.length).toBeGreaterThan(0);
    expect(first.matchedText).toEqual(["Why do users abandon onboarding?"]);
  });

  it("distinguishes a possible fit from several questions pointing the same way", () => {
    const one = suggestMethods(input({ research_questions: ["Why do users leave?"] })).find((s) => s.method === "user_interviews");
    const many = suggestMethods(input({ research_questions: ["Why do users leave?", "What motivates people to stay?"] })).find((s) => s.method === "user_interviews");
    expect(one?.strength).toBe("possible");
    expect(many?.strength).toBe("strong");
  });

  it("is deterministic and never mutates its input", () => {
    const i = input({ research_questions: ["Why do users abandon onboarding?", "Can they find the pricing page?"] });
    const copy = structuredClone(i);
    expect(suggestMethods(i)).toEqual(suggestMethods(i));
    expect(i).toEqual(copy);
  });

  it("truncates long excerpts", () => {
    const [s] = suggestMethods(input({ research_questions: [`Why ${"very ".repeat(60)}long`] }));
    expect(s.matchedText[0].length).toBeLessThanOrEqual(90);
  });

  it("never claims a method is universally correct", () => {
    expect(GUIDANCE_DISCLAIMER).toMatch(/starting point, not a rule/);
    expect(GUIDANCE_DISCLAIMER).toMatch(/choices always take priority/);
  });
});

describe("considerations", () => {
  const texts = (selected: Parameters<typeof considerations>[0]) => considerations(selected).map((c) => c.id);

  it("gently flags common gaps without blocking anything", () => {
    expect(texts(["surveys"])).toContain("survey-only");
    expect(texts(["surveys", "user_interviews"])).not.toContain("survey-only");
    expect(texts(["card_sorting"])).toContain("card-sort-tree");
    expect(texts(["card_sorting", "tree_testing"])).not.toContain("card-sort-tree");
    expect(texts(["tree_testing"])).toContain("tree-card-sort");
    expect(texts(["desk_research"])).toContain("no-users");
    expect(texts(METHOD_IDS.filter((m) => m !== "other"))).toContain("many-methods");
  });

  it("stays quiet when there is nothing useful to say", () => {
    expect(considerations([])).toEqual([]);
    expect(texts(["user_interviews"])).toEqual([]);
    expect(texts(["other"])).toEqual([]);
  });

  it("uses tentative language", () => {
    for (const c of considerations(["surveys"])) expect(c.text).toMatch(/some teams|often|may|can|if you/i);
  });
});

describe("applicable materials", () => {
  it("only offers materials relevant to the selected methods", () => {
    expect(applicableMaterialKeys(["user_interviews"], MATERIAL_KEYS)).toEqual(["interview_guide", "interview_questions"]);
    expect(applicableMaterialKeys(["surveys"], MATERIAL_KEYS)).toEqual(["survey_questions"]);
    expect(applicableMaterialKeys(["usability_testing"], MATERIAL_KEYS)).toEqual([
      "usability_tasks",
      "task_scenarios",
      "pre_test_questions",
      "post_test_questions",
      "observation_checklist",
    ]);
    expect(applicableMaterialKeys(["desk_research", "competitive_research", "card_sorting"], MATERIAL_KEYS)).toEqual([]);
  });

  it("combines and de-duplicates across methods, in default order", () => {
    const keys = applicableMaterialKeys(["contextual_inquiry", "user_interviews", "usability_testing"], MATERIAL_KEYS);
    expect(new Set(keys).size).toBe(keys.length);
    expect(keys.indexOf("interview_guide")).toBeLessThan(keys.indexOf("observation_checklist"));
    expect(getMethod("contextual_inquiry").materials).toContain("observation_checklist");
  });
});

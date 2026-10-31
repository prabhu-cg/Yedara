import { describe, expect, it } from "vitest";
import { MATERIAL_KEYS } from "@/lib/research-planner/constants";
import { applicableMaterials, generateMaterial, toParticipantVoice, type MaterialContext } from "@/lib/research-planner/materials";
import { SECTION_SCHEMAS, emptyContent } from "@/lib/research-planner/schemas";
import { materialContext } from "./fixtures/plan";

const bare: MaterialContext = {
  subject: "Acme",
  title: "Plan",
  context: emptyContent("context"),
  goals: emptyContent("goals"),
  participants: emptyContent("participants"),
  logistics: emptyContent("logistics"),
};

describe("material generation", () => {
  it.each(MATERIAL_KEYS)("%s produces content that satisfies its schema", (key) => {
    for (const ctx of [materialContext, bare]) {
      const content = generateMaterial(key, ctx);
      expect(SECTION_SCHEMAS[key].safeParse(content).success).toBe(true);
      // `minutes: null` is legitimate (untimed block); anything else would be a bug.
      expect(JSON.stringify(content).replace(/"minutes":null/g, "")).not.toMatch(/undefined|null|\[object/);
    }
  });

  it("is deterministic", () => {
    for (const key of MATERIAL_KEYS) {
      expect(generateMaterial(key, materialContext)).toEqual(generateMaterial(key, materialContext));
    }
  });

  it("uses the user's questions and the subject name", () => {
    const guide = generateMaterial("interview_guide", materialContext);
    const core = guide.blocks.find((b) => b.title === "Core topics")!;
    expect(core.prompts).toContain("Why do you abandon onboarding?");
    expect(guide.introduction).toContain("Budgeto");
    const survey = generateMaterial("survey_questions", materialContext);
    expect(survey.questions[0].text).toContain("Budgeto");
  });

  it("falls back to sensible generic content when the user has not written questions", () => {
    const guide = generateMaterial("interview_guide", bare);
    expect(guide.blocks.find((b) => b.title === "Core topics")!.prompts.length).toBeGreaterThan(0);
    expect(generateMaterial("interview_questions", bare).questions.length).toBeGreaterThan(0);
  });

  it("builds usability tasks as clearly marked placeholders rather than guessing user actions", () => {
    const tasks = generateMaterial("usability_tasks", materialContext).tasks;
    expect(tasks.length).toBeGreaterThanOrEqual(3);
    for (const t of tasks) expect(t.goal).toMatch(/\[.+\]/);
    expect(tasks[0].goal).toContain("Identify the main barriers");
    const scenarios = generateMaterial("task_scenarios", materialContext).scenarios;
    expect(scenarios).toHaveLength(tasks.length);
    for (const s of scenarios) expect(s.scenario).toContain("Budgeto");
  });

  it("offers answer options only where the question type needs them", () => {
    for (const q of generateMaterial("survey_questions", materialContext).questions) {
      if (q.type === "open") expect(q.options).toEqual([]);
      else expect(q.options.length).toBeGreaterThan(1);
    }
  });

  it("applies only to the selected methods", () => {
    expect(applicableMaterials(["surveys"])).toEqual(["survey_questions"]);
    expect(applicableMaterials([])).toEqual([]);
  });
});

describe("toParticipantVoice", () => {
  it.each([
    ["How do users decide which plan to choose?", "How do you decide which plan to choose?"],
    ["Why do customers abandon checkout?", "Why do you abandon checkout?"],
    ["What are users' biggest frustrations?", "What are your biggest frustrations?"],
    ["What do people expect from their dashboard?", "What do you expect from your dashboard?"],
    ["Does a user trust the app?", "Do you trust the app?"],
    ["How do users' goals change?", "How do your goals change?"],
  ])("%s", (question, expected) => {
    expect(toParticipantVoice(question)).toBe(expected);
  });

  it("leaves questions about an unknown group in the researcher's voice instead of mixing voices", () => {
    expect(toParticipantVoice("How do freelancers currently track their money?")).toBe("How do freelancers currently track their money?");
  });

  it("always ends with exactly one question mark and a capital letter", () => {
    expect(toParticipantVoice("why do users leave??")).toBe("Why do you leave?");
    expect(toParticipantVoice("what is hard.")).toBe("What is hard?");
  });
});

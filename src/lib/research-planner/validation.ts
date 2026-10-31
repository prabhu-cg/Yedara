import { methodsNeedParticipants } from "@/lib/research-planner/methods";
import type { SectionContentMap } from "@/lib/research-planner/schemas";

export type StepIssue = { field: string; message: string; step: number };

export type PlanMeta = { title: string; projectId: string | null };
export type CoreContents = Pick<
  SectionContentMap,
  "context" | "goals" | "methods" | "participants"
>;

const filled = (value: string) => value.trim().length > 0;

/**
 * Required-field rules for each step. Everything not listed here is optional
 * and never blocks progress. Used by the wizard (before moving on) and by the
 * server (before marking a plan complete).
 */
export function getStepIssues(step: number, meta: PlanMeta, c: CoreContents): StepIssue[] {
  const issues: StepIssue[] = [];
  const add = (field: string, message: string) => issues.push({ field, message, step });

  if (step === 1) {
    if (!filled(meta.title)) add("title", "Give your research a title");
    if (!meta.projectId) add("projectId", "Choose the project this research belongs to");
    if (!filled(c.context.product_description)) {
      add("product_description", "Briefly describe the product or service");
    }
  }
  if (step === 2) {
    if (!filled(c.goals.primary_goal)) add("primary_goal", "State your primary research goal");
    if (!c.goals.research_questions.some(filled)) {
      add("research_questions", "Add at least one key research question");
    }
  }
  if (step === 3) {
    if (c.methods.selected.length === 0) add("selected", "Choose at least one research method");
    if (c.methods.selected.includes("other") && !filled(c.methods.other_description)) {
      add("other_description", "Describe the other method you plan to use");
    }
  }
  if (step === 4 && methodsNeedParticipants(c.methods.selected)) {
    if (!filled(c.participants.profile)) add("profile", "Describe who you want to take part");
  }
  return issues;
}

export const REQUIRED_STEPS = [1, 2, 3, 4] as const;

export function getCompletionIssues(meta: PlanMeta, c: CoreContents): StepIssue[] {
  return REQUIRED_STEPS.flatMap((step) => getStepIssues(step, meta, c));
}

export function firstInvalidStepBefore(target: number, meta: PlanMeta, c: CoreContents) {
  for (const step of REQUIRED_STEPS) {
    if (step >= target) break;
    if (getStepIssues(step, meta, c).length) return step;
  }
  return null;
}

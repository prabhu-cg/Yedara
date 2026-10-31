import type { PlanDocumentInput } from "@/lib/research-planner/document";
import { DEFAULT_POSITIONS } from "@/lib/research-planner/constants";
import { generateMaterial, type MaterialContext } from "@/lib/research-planner/materials";
import { emptyContent, type SectionContentMap } from "@/lib/research-planner/schemas";

export const context: SectionContentMap["context"] = {
  product_description: "A budgeting app for freelancers.\n\nIt syncs with bank accounts.",
  business_background: "Seed-stage startup, 12k monthly active users.",
  target_audience: "Freelance designers and developers",
  industry: "Fintech",
  problem: "Users abandon onboarding before connecting a bank account.",
};

export const goals: SectionContentMap["goals"] = {
  primary_goal: "Understand why freelancers drop off during onboarding",
  objectives: ["Identify the main barriers to connecting a bank account", "Learn what builds trust"],
  research_questions: ["Why do users abandon onboarding?", "How do users decide whether to trust the app?"],
  business_questions: ["How can we raise activation?"],
  user_questions: ["How do freelancers currently track their money?"],
  desired_outcomes: ["A prioritised list of onboarding fixes"],
};

export const methods: SectionContentMap["methods"] = {
  selected: ["user_interviews", "usability_testing", "surveys"],
  other_description: "",
  rationale: { user_interviews: "To understand reasons behind drop-off" },
  notes: "Run interviews before usability tests.",
};

export const participants: SectionContentMap["participants"] = {
  profile: "Freelancers who earn irregular income",
  segment: "Designers and developers",
  inclusion: ["Freelances at least 20 hours per week"],
  exclusion: ["Works for a competitor"],
  count: 8,
  recruitment_method: "Customer email list",
  screening_questions: ["How do you get paid?", "Do you use a budgeting tool?"],
};

export const logistics: SectionContentMap["logistics"] = {
  duration: "4 weeks",
  timeline: [
    { phase: "Recruit", timing: "Week 1" },
    { phase: "Sessions", timing: "Weeks 2–3" },
  ],
  session_duration_minutes: 45,
  tools: ["Zoom", "Notion"],
  team: [{ role: "Lead researcher", responsibility: "Moderates sessions" }],
  deliverables: ["Insights report", "Highlight reel"],
  risks: [{ risk: "Low recruitment turnout", mitigation: "Over-recruit by 30%" }],
};

export const materialContext: MaterialContext = {
  subject: "Budgeto",
  title: "Onboarding research",
  context,
  goals,
  participants,
  logistics,
};

export function fullPlanInput(overrides: Partial<PlanDocumentInput> = {}): PlanDocumentInput {
  const sections: PlanDocumentInput["sections"] = {
    context: { content: context, position: DEFAULT_POSITIONS.context },
    goals: { content: goals, position: DEFAULT_POSITIONS.goals },
    methods: { content: methods, position: DEFAULT_POSITIONS.methods },
    participants: { content: participants, position: DEFAULT_POSITIONS.participants },
    logistics: { content: logistics, position: DEFAULT_POSITIONS.logistics },
  };
  for (const key of [
    "interview_guide",
    "interview_questions",
    "survey_questions",
    "usability_tasks",
    "task_scenarios",
    "pre_test_questions",
    "post_test_questions",
    "observation_checklist",
  ] as const) {
    sections[key] = { content: generateMaterial(key, materialContext), position: DEFAULT_POSITIONS[key] };
  }
  return {
    title: "Onboarding research plan",
    status: "draft",
    updatedAt: "2026-10-31T10:00:00Z",
    project: { name: "Budgeto", client: "Acme | Co", industry: null },
    preparedBy: "Maya Patel",
    sections,
    ...overrides,
  };
}

export { emptyContent };

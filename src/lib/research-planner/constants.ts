export const METHOD_IDS = [
  "user_interviews",
  "surveys",
  "usability_testing",
  "contextual_inquiry",
  "diary_studies",
  "card_sorting",
  "tree_testing",
  "competitive_research",
  "desk_research",
  "other",
] as const;
export type MethodId = (typeof METHOD_IDS)[number];

export const CORE_SECTION_KEYS = ["context", "goals", "methods", "participants", "logistics"] as const;
export const MATERIAL_KEYS = [
  "interview_guide",
  "interview_questions",
  "survey_questions",
  "usability_tasks",
  "task_scenarios",
  "pre_test_questions",
  "post_test_questions",
  "observation_checklist",
] as const;
export const SECTION_KEYS = [...CORE_SECTION_KEYS, ...MATERIAL_KEYS] as const;

export type CoreSectionKey = (typeof CORE_SECTION_KEYS)[number];
export type MaterialKey = (typeof MATERIAL_KEYS)[number];
export type SectionKey = (typeof SECTION_KEYS)[number];

export function isSectionKey(value: string): value is SectionKey {
  return (SECTION_KEYS as readonly string[]).includes(value);
}
export function isMaterialKey(value: string): value is MaterialKey {
  return (MATERIAL_KEYS as readonly string[]).includes(value);
}

export const SECTION_TITLES: Record<SectionKey, string> = {
  context: "Project context",
  goals: "Research goals",
  methods: "Methodology",
  participants: "Participants",
  logistics: "Logistics",
  interview_guide: "Interview discussion guide",
  interview_questions: "Interview questions",
  survey_questions: "Survey questions",
  usability_tasks: "Usability testing tasks",
  task_scenarios: "Task scenarios",
  pre_test_questions: "Pre-test questions",
  post_test_questions: "Post-test questions",
  observation_checklist: "Observation checklist",
};

/**
 * Default document order. Positions are spaced by 10 so a user's custom order
 * (stored by the reorder RPC with the same spacing) stays easy to reason about.
 */
export const DEFAULT_POSITIONS: Record<SectionKey, number> = {
  context: 0,
  goals: 10,
  methods: 20,
  participants: 30,
  interview_guide: 40,
  interview_questions: 50,
  survey_questions: 60,
  usability_tasks: 70,
  task_scenarios: 80,
  pre_test_questions: 90,
  post_test_questions: 100,
  observation_checklist: 110,
  logistics: 120,
};

export const PLAN_STEPS = [
  {
    id: 1,
    slug: "context",
    title: "Project context",
    short: "Context",
    description: "Tell us what you're researching and why.",
  },
  {
    id: 2,
    slug: "goals",
    title: "Research goals",
    short: "Goals",
    description: "Define what you want to learn and the questions to answer.",
  },
  {
    id: 3,
    slug: "methods",
    title: "Research method",
    short: "Methods",
    description: "Choose how you'll gather evidence.",
  },
  {
    id: 4,
    slug: "participants",
    title: "Participants",
    short: "Participants",
    description: "Describe who you'll talk to and how you'll find them.",
  },
  {
    id: 5,
    slug: "materials",
    title: "Research materials",
    short: "Materials",
    description: "Prepare guides, questions and tasks for your sessions.",
  },
  {
    id: 6,
    slug: "logistics",
    title: "Research logistics",
    short: "Logistics",
    description: "Plan timing, tools, people and deliverables.",
  },
  {
    id: 7,
    slug: "review",
    title: "Review and export",
    short: "Review",
    description: "Check the whole plan, then preview and export it.",
  },
] as const;

export const TOTAL_STEPS = PLAN_STEPS.length;
export const REVIEW_STEP = 7;

export function clampStep(value: unknown) {
  const n = Number(value);
  return Number.isInteger(n) && n >= 1 && n <= TOTAL_STEPS ? n : 1;
}

export type PlanStatus = "draft" | "completed";
export type ContentSource = "manual" | "template" | "ai";

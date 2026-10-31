import { z } from "zod";
import { METHOD_IDS, type MaterialKey, type SectionKey } from "@/lib/research-planner/constants";

/**
 * Storage schemas are deliberately lenient: drafts may be incomplete, so every
 * field has a default and only shape and size are enforced. "Required to
 * complete" rules live in `validation.ts`. Parsing `{}` yields empty content.
 */
const LONG = 5000;
const ITEM = 1000;
const shortText = z.string().max(300).default("");
const longText = z.string().max(LONG).default("");
const list = (max = 60) => z.array(z.string().max(ITEM)).max(max).default([]);

export const contextSchema = z.object({
  product_description: longText,
  business_background: longText,
  target_audience: longText,
  industry: shortText,
  problem: longText,
});

export const goalsSchema = z.object({
  primary_goal: longText,
  objectives: list(),
  research_questions: list(),
  business_questions: list(),
  user_questions: list(),
  desired_outcomes: list(),
});

export const methodsSchema = z.object({
  selected: z
    .array(z.enum(METHOD_IDS))
    .max(METHOD_IDS.length)
    .default([])
    .transform((ids) => [...new Set(ids)]),
  other_description: z.string().max(1000).default(""),
  rationale: z.partialRecord(z.enum(METHOD_IDS), z.string().max(1000)).default({}),
  notes: longText,
});

export const participantsSchema = z.object({
  profile: longText,
  segment: z.string().max(1000).default(""),
  inclusion: list(),
  exclusion: list(),
  count: z.number().int().min(1).max(100000).nullable().default(null),
  recruitment_method: z.string().max(1000).default(""),
  screening_questions: list(),
});

export const logisticsSchema = z.object({
  duration: shortText,
  timeline: z.array(z.object({ phase: z.string().max(300), timing: z.string().max(300) })).max(40).default([]),
  session_duration_minutes: z.number().int().min(1).max(1440).nullable().default(null),
  tools: list(),
  team: z.array(z.object({ role: z.string().max(300), responsibility: z.string().max(ITEM) })).max(40).default([]),
  deliverables: list(),
  risks: z.array(z.object({ risk: z.string().max(ITEM), mitigation: z.string().max(ITEM) })).max(40).default([]),
});

export const interviewGuideSchema = z.object({
  introduction: longText,
  blocks: z
    .array(
      z.object({
        title: z.string().max(300),
        minutes: z.number().int().min(0).max(600).nullable().default(null),
        prompts: list(),
      }),
    )
    .max(30)
    .default([]),
  wrap_up: longText,
});

export const interviewQuestionsSchema = z.object({
  questions: z.array(z.object({ text: z.string().max(ITEM), probes: list(20) })).max(100).default([]),
});

export const SURVEY_QUESTION_TYPES = ["single", "multiple", "scale", "open"] as const;
export type SurveyQuestionType = (typeof SURVEY_QUESTION_TYPES)[number];
export const SURVEY_TYPE_LABELS: Record<SurveyQuestionType, string> = {
  single: "Single choice",
  multiple: "Multiple choice",
  scale: "Rating scale",
  open: "Open text",
};

export const surveyQuestionsSchema = z.object({
  questions: z
    .array(
      z.object({
        text: z.string().max(ITEM),
        type: z.enum(SURVEY_QUESTION_TYPES).default("open"),
        options: list(20),
      }),
    )
    .max(100)
    .default([]),
});

export const usabilityTasksSchema = z.object({
  tasks: z
    .array(z.object({ title: z.string().max(300), goal: z.string().max(ITEM), success_criteria: z.string().max(ITEM) }))
    .max(40)
    .default([]),
});

export const taskScenariosSchema = z.object({
  scenarios: z.array(z.object({ title: z.string().max(300), scenario: z.string().max(2000) })).max(40).default([]),
});

export const questionListSchema = z.object({ questions: list(100) });
export const checklistSchema = z.object({ items: list(100) });

export const SECTION_SCHEMAS = {
  context: contextSchema,
  goals: goalsSchema,
  methods: methodsSchema,
  participants: participantsSchema,
  logistics: logisticsSchema,
  interview_guide: interviewGuideSchema,
  interview_questions: interviewQuestionsSchema,
  survey_questions: surveyQuestionsSchema,
  usability_tasks: usabilityTasksSchema,
  task_scenarios: taskScenariosSchema,
  pre_test_questions: questionListSchema,
  post_test_questions: questionListSchema,
  observation_checklist: checklistSchema,
} as const satisfies Record<SectionKey, z.ZodType>;

export type ContextContent = z.output<typeof contextSchema>;
export type GoalsContent = z.output<typeof goalsSchema>;
export type MethodsContent = z.output<typeof methodsSchema>;
export type ParticipantsContent = z.output<typeof participantsSchema>;
export type LogisticsContent = z.output<typeof logisticsSchema>;
export type InterviewGuideContent = z.output<typeof interviewGuideSchema>;
export type InterviewQuestionsContent = z.output<typeof interviewQuestionsSchema>;
export type SurveyQuestionsContent = z.output<typeof surveyQuestionsSchema>;
export type UsabilityTasksContent = z.output<typeof usabilityTasksSchema>;
export type TaskScenariosContent = z.output<typeof taskScenariosSchema>;
export type QuestionListContent = z.output<typeof questionListSchema>;
export type ChecklistContent = z.output<typeof checklistSchema>;

export type SectionContentMap = {
  context: ContextContent;
  goals: GoalsContent;
  methods: MethodsContent;
  participants: ParticipantsContent;
  logistics: LogisticsContent;
  interview_guide: InterviewGuideContent;
  interview_questions: InterviewQuestionsContent;
  survey_questions: SurveyQuestionsContent;
  usability_tasks: UsabilityTasksContent;
  task_scenarios: TaskScenariosContent;
  pre_test_questions: QuestionListContent;
  post_test_questions: QuestionListContent;
  observation_checklist: ChecklistContent;
};

export type AnySectionContent = SectionContentMap[SectionKey];

export function emptyContent<K extends SectionKey>(key: K): SectionContentMap[K] {
  return SECTION_SCHEMAS[key].parse({}) as SectionContentMap[K];
}

/** Parses stored/untrusted content. Returns null when it doesn't match the schema. */
export function parseContent<K extends SectionKey>(key: K, raw: unknown): SectionContentMap[K] | null {
  const result = SECTION_SCHEMAS[key].safeParse(raw ?? {});
  return result.success ? (result.data as SectionContentMap[K]) : null;
}

/** Like parseContent but falls back to empty content for corrupt rows. */
export function normalizeContent<K extends SectionKey>(key: K, raw: unknown): SectionContentMap[K] {
  return parseContent(key, raw) ?? emptyContent(key);
}

export type MaterialContentMap = Pick<SectionContentMap, MaterialKey>;

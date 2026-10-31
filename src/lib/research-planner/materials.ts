import { MATERIAL_KEYS, type MaterialKey, type MethodId } from "@/lib/research-planner/constants";
import { applicableMaterialKeys } from "@/lib/research-planner/methods";
import type {
  ContextContent,
  GoalsContent,
  LogisticsContent,
  MaterialContentMap,
  ParticipantsContent,
} from "@/lib/research-planner/schemas";

export type MaterialContext = {
  /** Short name of the thing being researched (usually the project name). */
  subject: string;
  title: string;
  context: ContextContent;
  goals: GoalsContent;
  participants: ParticipantsContent;
  logistics: LogisticsContent;
};

export function applicableMaterials(selected: readonly MethodId[]) {
  return applicableMaterialKeys(selected, MATERIAL_KEYS);
}

const clean = (items: string[]) => items.map((s) => s.trim()).filter(Boolean);
const stripQuestionMark = (s: string) => s.trim().replace(/[?.\s]+$/, "");

/**
 * Rewrites an analyst-facing question ("How do users decide?") into a
 * participant-facing one ("How do you decide?"). Heuristic; the result is a
 * starting point for the researcher to edit.
 */
export function toParticipantVoice(question: string) {
  const SUBJECT = "users|people|customers|participants|shoppers|clients|visitors";
  let converted = false;
  const swap = (pattern: RegExp, replacement: string | ((...m: string[]) => string)) => {
    return (input: string) =>
      input.replace(pattern, (...args: string[]) => {
        converted = true;
        return typeof replacement === "function" ? replacement(...args) : replacement;
      });
  };
  const verbs: Record<string, string> = { does: "do", is: "are", has: "have", was: "were" };
  let text = stripQuestionMark(question);
  text = swap(new RegExp(`\\b(${SUBJECT})['’]s?(?!\\w)`, "gi"), "your")(text);
  text = swap(new RegExp(`\\b(a|the|each|every) (user|customer|participant|person|shopper|client|visitor)['’]s(?!\\w)`, "gi"), "your")(text);
  text = swap(
    new RegExp(`\\b(do|does|are|is|can|could|would|will|have|has|did|were|was) (${SUBJECT}|they|a user|the user|a customer|the customer)\\b`, "gi"),
    (_m, verb) => `${verbs[verb.toLowerCase()] ?? verb.toLowerCase()} you`,
  )(text);
  text = swap(new RegExp(`\\b(${SUBJECT})\\b`, "gi"), "you")(text);
  // "their/them" only make sense to rewrite once we know who the question is about.
  if (converted) {
    text = text.replace(/\b(their|them)\b/gi, (m) => (m.toLowerCase() === "their" ? "your" : "you"));
  }
  return `${text.charAt(0).toUpperCase()}${text.slice(1)}?`;
}

function sourceQuestions(ctx: MaterialContext, max: number) {
  return clean([...ctx.goals.user_questions, ...ctx.goals.research_questions]).slice(0, max);
}

const PROBES = ["Can you give me an example?", "What happened next?", "Why was that important to you?"];

function interviewGuide(ctx: MaterialContext): MaterialContentMap["interview_guide"] {
  const topics = sourceQuestions(ctx, 8).map((q) => toParticipantVoice(q));
  return {
    introduction:
      `Thank you for taking the time to speak with me. We're doing some research about ${ctx.subject} so we can understand people's experiences and make it better. ` +
      `There are no right or wrong answers; we're interested in your honest opinions. You can skip any question or stop at any time. ` +
      `With your permission, I'd like to record the session for note-taking only. Do you have any questions before we begin?`,
    blocks: [
      {
        title: "Warm-up",
        minutes: 5,
        prompts: [
          "Tell me a little about yourself and what you do.",
          `How does ${ctx.subject}, or something similar, fit into your day-to-day?`,
        ],
      },
      {
        title: "Background and context",
        minutes: 10,
        prompts: [
          `Walk me through the last time you used ${ctx.subject} or something like it.`,
          "What were you trying to achieve?",
          "What tools or alternatives did you use?",
        ],
      },
      {
        title: "Core topics",
        minutes: 25,
        prompts: topics.length
          ? topics
          : [`What works well about ${ctx.subject}?`, "What gets in your way?", "What would you change first?"],
      },
      { title: "Probes to use throughout", minutes: null, prompts: PROBES },
      {
        title: "Wrap-up",
        minutes: 5,
        prompts: [
          "Is there anything I didn't ask that you think is important?",
          "If you could change one thing, what would it be?",
        ],
      },
    ],
    wrap_up: "Thank the participant, explain what happens next, and confirm how and when the incentive will be sent.",
  };
}

function interviewQuestions(ctx: MaterialContext): MaterialContentMap["interview_questions"] {
  const fromGoals = sourceQuestions(ctx, 10).map((q) => ({ text: toParticipantVoice(q), probes: PROBES }));
  const general = [
    {
      text: `Tell me about the last time you used ${ctx.subject} or something similar.`,
      probes: ["What were you trying to do?", "What happened?", "How did you feel about it?"],
    },
    {
      text: "What is the hardest part of this for you today?",
      probes: ["Can you give me an example?", "What do you do when that happens?"],
    },
  ];
  return { questions: fromGoals.length ? [...general.slice(0, 1), ...fromGoals] : general };
}

function surveyQuestions(ctx: MaterialContext): MaterialContentMap["survey_questions"] {
  const open = sourceQuestions(ctx, 4).map((q) => ({
    text: toParticipantVoice(q),
    type: "open" as const,
    options: [] as string[],
  }));
  return {
    questions: [
      {
        text: `How often do you use ${ctx.subject} or similar products?`,
        type: "single",
        options: ["Daily", "Weekly", "Monthly", "Less than monthly", "I have never used one"],
      },
      {
        text: `Overall, how satisfied are you with ${ctx.subject}?`,
        type: "scale",
        options: ["Very dissatisfied", "Dissatisfied", "Neutral", "Satisfied", "Very satisfied"],
      },
      {
        text: "Which of these matter most to you? Select up to three.",
        type: "multiple",
        options: ["Option A (replace)", "Option B (replace)", "Option C (replace)", "Other"],
      },
      ...open,
      { text: "Is there anything else you'd like to tell us?", type: "open", options: [] },
    ],
  };
}

function usabilityTasks(ctx: MaterialContext): MaterialContentMap["usability_tasks"] {
  // Objectives are the researcher's goals, not participant actions, so tasks are
  // placeholders that point back at the objective they should help answer.
  const objectives = clean(ctx.goals.objectives).slice(0, 5);
  const count = Math.max(objectives.length, 3);
  return {
    tasks: Array.from({ length: count }, (_, i) => ({
      title: `Task ${i + 1}`,
      goal: objectives[i]
        ? `[Describe what the participant should try to do] (helps answer: ${stripQuestionMark(objectives[i])})`
        : "[Describe what the participant should try to do]",
      success_criteria: "[Define what counts as success, e.g. completes without help within a set time]",
    })),
  };
}

function taskScenarios(ctx: MaterialContext): MaterialContentMap["task_scenarios"] {
  return {
    scenarios: usabilityTasks(ctx).tasks.map((t) => ({
      title: t.title,
      scenario: `You are [describe the situation and why it matters to you]. Without any help, show me how you would [describe the task] using ${ctx.subject}.`,
    })),
  };
}

function preTest(ctx: MaterialContext): MaterialContentMap["pre_test_questions"] {
  return {
    questions: [
      `How familiar are you with ${ctx.subject} or similar products? (1 = not at all, 5 = very familiar)`,
      "How often do you use products like this?",
      "Which devices do you usually use for this?",
      "What do you usually use it for?",
    ],
  };
}

function postTest(ctx: MaterialContext): MaterialContentMap["post_test_questions"] {
  return {
    questions: [
      "Overall, how easy or difficult was it to complete the tasks? (1 = very difficult, 7 = very easy)",
      "What was the most difficult part?",
      "What did you like most?",
      "Was anything confusing or unexpected?",
      `How likely would you be to use ${ctx.subject} again?`,
      "Is there anything else you'd like to share?",
    ],
  };
}

function observationChecklist(): MaterialContentMap["observation_checklist"] {
  return {
    items: [
      "Task outcome: completed independently, completed with help, or not completed",
      "Time taken for each task",
      "Errors, wrong turns and backtracking",
      "Moments of hesitation or confusion",
      "Unprompted comments, positive and negative",
      "Workarounds or unexpected behaviour",
      "Path or navigation taken",
      "Questions the participant asked",
    ],
  };
}

const GENERATORS: { [K in MaterialKey]: (ctx: MaterialContext) => MaterialContentMap[K] } = {
  interview_guide: interviewGuide,
  interview_questions: interviewQuestions,
  survey_questions: surveyQuestions,
  usability_tasks: usabilityTasks,
  task_scenarios: taskScenarios,
  pre_test_questions: preTest,
  post_test_questions: postTest,
  observation_checklist: () => observationChecklist(),
};

/** Deterministic starter content. Editable by the user and replaceable by AI later. */
export function generateMaterial<K extends MaterialKey>(key: K, ctx: MaterialContext): MaterialContentMap[K] {
  return GENERATORS[key](ctx);
}

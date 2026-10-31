import type { MaterialKey, MethodId } from "@/lib/research-planner/constants";

export type MethodInfo = {
  id: MethodId;
  name: string;
  summary: string;
  useWhen: string[];
  lessSuitedFor: string[];
  effort: "Low" | "Medium" | "High";
  participantBased: boolean;
  /** Commonly cited rule of thumb. Never presented as a requirement. */
  sampleHint?: string;
  materials: MaterialKey[];
};

export const METHODS: MethodInfo[] = [
  {
    id: "user_interviews",
    name: "User interviews",
    summary: "One-to-one conversations to understand people's experiences, motivations and needs in their own words.",
    useWhen: [
      "You need to understand why people do things",
      "You're exploring a new area and don't yet know what to measure",
      "You want rich stories, language and context",
    ],
    lessSuitedFor: ["Measuring how common something is", "Judging whether a design works through use"],
    effort: "Medium",
    participantBased: true,
    sampleHint: "Many teams run about 5–12 interviews per user segment and stop when sessions stop surfacing new themes.",
    materials: ["interview_guide", "interview_questions"],
  },
  {
    id: "surveys",
    name: "Surveys",
    summary: "Structured questionnaires sent to many people to measure attitudes, behaviours and preferences.",
    useWhen: [
      "You need numbers: how many, how often, how much",
      "You want to compare groups or track change over time",
      "You already know what to ask and need scale",
    ],
    lessSuitedFor: ["Understanding the reasons behind answers", "Discovering things you didn't think to ask"],
    effort: "Medium",
    participantBased: true,
    sampleHint: "The right number depends on the precision you need; comparing groups often calls for hundreds of responses.",
    materials: ["survey_questions"],
  },
  {
    id: "usability_testing",
    name: "Usability testing",
    summary: "Watching people attempt realistic tasks with a product or prototype to find where they struggle.",
    useWhen: [
      "You want to know whether people can complete key tasks",
      "You have a prototype or live product to evaluate",
      "You need to find and prioritise usability problems",
    ],
    lessSuitedFor: ["Deciding what to build in the first place", "Measuring market size or demand"],
    effort: "Medium",
    participantBased: true,
    sampleHint: "Qualitative usability studies commonly use about 5–8 participants per user group, repeated across rounds.",
    materials: ["usability_tasks", "task_scenarios", "pre_test_questions", "post_test_questions", "observation_checklist"],
  },
  {
    id: "contextual_inquiry",
    name: "Contextual inquiry",
    summary: "Observing and questioning people in their real environment while they do their actual work.",
    useWhen: [
      "Behaviour depends heavily on the environment or tools around people",
      "People can't easily describe what they do from memory",
      "You want to see workarounds and unspoken steps",
    ],
    lessSuitedFor: ["Quick turnaround studies", "Participants who can't be observed on site or remotely"],
    effort: "High",
    participantBased: true,
    sampleHint: "Studies often involve about 4–8 sessions, each lasting an hour or more.",
    materials: ["interview_guide", "observation_checklist"],
  },
  {
    id: "diary_studies",
    name: "Diary studies",
    summary: "Participants record their experiences over days or weeks, capturing behaviour as it happens.",
    useWhen: [
      "You need to understand behaviour over time or across moments",
      "Events are infrequent or hard to observe directly",
      "You want to reduce reliance on memory",
    ],
    lessSuitedFor: ["Fast projects", "Participants unlikely to keep up daily entries"],
    effort: "High",
    participantBased: true,
    sampleHint: "Often about 8–15 participants over one to four weeks, allowing for drop-out.",
    materials: [],
  },
  {
    id: "card_sorting",
    name: "Card sorting",
    summary: "Participants group and label topics to reveal how they expect information to be organised.",
    useWhen: [
      "You're designing or revising navigation or content structure",
      "You want to learn the labels and groupings people naturally use",
    ],
    lessSuitedFor: ["Evaluating an existing structure (consider tree testing)", "Task-based usability questions"],
    effort: "Low",
    participantBased: true,
    sampleHint: "Open card sorts often use around 15–30 participants.",
    materials: [],
  },
  {
    id: "tree_testing",
    name: "Tree testing",
    summary: "Participants try to find items in a text-only menu structure to check whether it works.",
    useWhen: [
      "You want to check whether people can find things in a proposed or existing structure",
      "You want to compare two navigation structures",
    ],
    lessSuitedFor: ["Generating a new structure (consider card sorting)", "Judging visual design"],
    effort: "Low",
    participantBased: true,
    sampleHint: "Often around 30–50 or more participants, because results are quantitative.",
    materials: [],
  },
  {
    id: "competitive_research",
    name: "Competitive research",
    summary: "Reviewing competitors' and alternatives' products to understand the landscape and spot gaps.",
    useWhen: [
      "You need to understand what alternatives people already have",
      "You want to benchmark features, language or experience",
    ],
    lessSuitedFor: ["Learning why your own users behave as they do", "Validating decisions with real users"],
    effort: "Low",
    participantBased: false,
    materials: [],
  },
  {
    id: "desk_research",
    name: "Secondary / desk research",
    summary: "Reviewing existing data, studies, analytics and literature before collecting anything new.",
    useWhen: [
      "You want to learn what is already known before running new studies",
      "Time or budget for primary research is limited",
    ],
    lessSuitedFor: ["Answering questions specific to your users and product", "Understanding current behaviour in depth"],
    effort: "Low",
    participantBased: false,
    materials: [],
  },
  {
    id: "other",
    name: "Other",
    summary: "Any other method not listed here. Describe it so your plan stays complete.",
    useWhen: ["You plan to use a method not covered above"],
    lessSuitedFor: [],
    effort: "Medium",
    participantBased: false,
    materials: [],
  },
];

const BY_ID = new Map(METHODS.map((m) => [m.id, m]));

export function getMethod(id: MethodId) {
  return BY_ID.get(id)!;
}

export function methodsNeedParticipants(selected: readonly MethodId[]) {
  return selected.some((id) => BY_ID.get(id)?.participantBased);
}

/** Materials relevant to the chosen methods, in their default order. */
export function applicableMaterialKeys(selected: readonly MethodId[], order: readonly MaterialKey[]) {
  const set = new Set(selected.flatMap((id) => BY_ID.get(id)?.materials ?? []));
  return order.filter((key) => set.has(key));
}

export function sampleHints(selected: readonly MethodId[]) {
  return selected.flatMap((id) => {
    const m = BY_ID.get(id);
    return m?.sampleHint ? [{ method: m.name, hint: m.sampleHint }] : [];
  });
}

/* ------------------------------------------------------------------ */
/* Optional, deterministic method guidance                             */
/* ------------------------------------------------------------------ */

export const GUIDANCE_DISCLAIMER =
  "These suggestions come from keywords in your goals and questions. They are a starting point, not a rule: the best method depends on your context, constraints and what you already know. Your choices always take priority.";

type Rule = {
  id: string;
  signal: string;
  pattern: RegExp;
  methods: { id: MethodId; reason: string }[];
};

const RULES: Rule[] = [
  {
    id: "behaviour",
    signal: "Behaviour and current practice",
    pattern: /\b(how do|how does|how often|what do (they|users|people|customers)|behaviou?rs?|habits?|workflows?|routines?|currently|in practice|day[- ]to[- ]day|the way (they|people))\b/i,
    methods: [
      { id: "user_interviews", reason: "Interviews can explore how people describe what they do and why." },
      { id: "contextual_inquiry", reason: "Observing people in context can show what they actually do, beyond what they recall." },
    ],
  },
  {
    id: "motivation",
    signal: "Reasons, motivations and perceptions",
    pattern: /\b(why|motivat\w*|reasons?|attitudes?|perception|perceive|feelings?|needs?|pain points?|frustrat\w*|expectations?|mental models?|decide|decision)\b/i,
    methods: [{ id: "user_interviews", reason: "Open conversations suit questions about reasons, needs and expectations." }],
  },
  {
    id: "tasks",
    signal: "Task completion and usability",
    pattern: /\b(complete|completion|find|finding|navigate|can (users|they|people|customers)|able to|struggl\w*|difficult\w*|confus\w*|usab\w*|errors?|friction|drop[- ]?off|abandon\w*|checkout|sign[- ]?up|onboarding|task)\b/i,
    methods: [{ id: "usability_testing", reason: "Watching people attempt tasks shows where they succeed or struggle." }],
  },
  {
    id: "measurement",
    signal: "Preferences, frequency and distribution",
    pattern: /\b(how many|what (percentage|proportion|share)|how much|prefer\w*|satisf\w*|rate|rating|rank\w*|priorit\w*|which (feature|option|one)|most important|likelihood|nps|segments?|across|compare|statistic\w*)\b/i,
    methods: [{ id: "surveys", reason: "Surveys can measure how common attitudes or behaviours are across many people." }],
  },
  {
    id: "structure",
    signal: "Information architecture and labelling",
    pattern: /\b(categor\w*|group\w*|label\w*|naming|terminology|organi[sz]\w*|information architecture|navigation|menu|taxonomy|findab\w*|where would (they|users|people) (look|expect))\b/i,
    methods: [
      { id: "card_sorting", reason: "Card sorting reveals how people group and label content." },
      { id: "tree_testing", reason: "Tree testing checks whether people can find things in a given structure." },
    ],
  },
  {
    id: "over_time",
    signal: "Behaviour over time",
    pattern: /\b(over time|long[- ]term|daily|weekly|each day|throughout|retention|learning curve|in the moment|diary|habit formation)\b/i,
    methods: [{ id: "diary_studies", reason: "Diary entries capture experiences as they happen across days or weeks." }],
  },
  {
    id: "landscape",
    signal: "Competitors and the market",
    pattern: /\b(competitors?|competitive|alternatives?|market|benchmark\w*|industry standard|best practices?|other (products|apps|services|tools))\b/i,
    methods: [{ id: "competitive_research", reason: "Reviewing alternatives helps map the landscape and spot gaps." }],
  },
  {
    id: "existing",
    signal: "Existing knowledge and data",
    pattern: /\b(existing (research|data|reports?|studies)|already know|literature|analytics|previous (research|studies)|background|trends|secondary)\b/i,
    methods: [{ id: "desk_research", reason: "Reviewing what is already known can narrow the questions left to answer." }],
  },
];

export type GuidanceInput = {
  primary_goal: string;
  objectives: string[];
  research_questions: string[];
  business_questions: string[];
  user_questions: string[];
};

export type MethodSuggestion = {
  method: MethodId;
  name: string;
  strength: "possible" | "strong";
  reasons: string[];
  signals: string[];
  /** Short excerpts of the user's own wording that triggered the suggestion. */
  matchedText: string[];
};

function excerpt(text: string, max = 90) {
  const t = text.trim().replace(/\s+/g, " ");
  return t.length > max ? `${t.slice(0, max - 1)}…` : t;
}

/**
 * Deterministic: the same input always yields the same suggestions. Never
 * selects anything; callers present the result as optional.
 */
export function suggestMethods(input: GuidanceInput): MethodSuggestion[] {
  const texts = [
    input.primary_goal,
    ...input.objectives,
    ...input.research_questions,
    ...input.business_questions,
    ...input.user_questions,
  ]
    .map((t) => t.trim())
    .filter(Boolean);

  const acc = new Map<
    MethodId,
    { reasons: Set<string>; signals: Set<string>; texts: Set<string>; rules: Set<string> }
  >();

  for (const text of texts) {
    for (const rule of RULES) {
      if (!rule.pattern.test(text)) continue;
      for (const m of rule.methods) {
        const entry =
          acc.get(m.id) ?? { reasons: new Set(), signals: new Set(), texts: new Set(), rules: new Set() };
        entry.reasons.add(m.reason);
        entry.signals.add(rule.signal);
        entry.texts.add(text);
        entry.rules.add(rule.id);
        acc.set(m.id, entry);
      }
    }
  }

  const order = new Map(METHODS.map((m, i) => [m.id, i]));
  return [...acc.entries()]
    .map(([id, e]) => ({
      method: id,
      name: getMethod(id).name,
      strength: (e.texts.size >= 2 ? "strong" : "possible") as "strong" | "possible",
      reasons: [...e.reasons],
      signals: [...e.signals],
      matchedText: [...e.texts].slice(0, 2).map((t) => excerpt(t)),
      count: e.texts.size,
    }))
    .sort((a, b) => b.count - a.count || order.get(a.method)! - order.get(b.method)!)
    .map((s) => ({ method: s.method, name: s.name, strength: s.strength, reasons: s.reasons, signals: s.signals, matchedText: s.matchedText }));
}

export type Consideration = { id: string; text: string };

/** Gentle prompts about the chosen combination. Informational, never blocking. */
export function considerations(selected: readonly MethodId[]): Consideration[] {
  const has = (id: MethodId) => selected.includes(id);
  const out: Consideration[] = [];
  const participantMethods = selected.filter((id) => BY_ID.get(id)?.participantBased);

  if (has("surveys") && !has("user_interviews") && !has("contextual_inquiry") && !has("usability_testing")) {
    out.push({
      id: "survey-only",
      text: "Surveys show what people say and how many agree, but not why. Some teams pair them with a few interviews to explain the results. Skip this if you already understand the reasons.",
    });
  }
  if (has("card_sorting") && !has("tree_testing")) {
    out.push({
      id: "card-sort-tree",
      text: "Card sorting helps shape a structure; tree testing is often used afterwards to check it. Optional if you will validate the structure another way.",
    });
  }
  if (has("tree_testing") && !has("card_sorting")) {
    out.push({
      id: "tree-card-sort",
      text: "Tree testing checks an existing or proposed structure. If you have not yet designed one, card sorting can help generate it.",
    });
  }
  if (selected.length > 0 && participantMethods.length === 0 && !selected.every((id) => id === "other")) {
    out.push({
      id: "no-users",
      text: "None of these methods involve talking to users directly. That can be right for early scoping, but you may want primary research to confirm what you learn.",
    });
  }
  if (selected.length >= 5) {
    out.push({
      id: "many-methods",
      text: "That is a lot of methods. A smaller set that fits your timeline and questions is often easier to deliver well.",
    });
  }
  return out;
}

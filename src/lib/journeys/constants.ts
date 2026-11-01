export const JOURNEY_TYPES = ["customer", "user", "service", "employee"] as const;
export type JourneyType = (typeof JOURNEY_TYPES)[number];
export const JOURNEY_TYPE_LABELS: Record<JourneyType, string> = { customer: "Customer journey", user: "User journey", service: "Service journey", employee: "Employee journey" };

export const JOURNEY_STATES = ["current", "future"] as const;
export type JourneyState = (typeof JOURNEY_STATES)[number];
export const JOURNEY_STATE_LABELS: Record<JourneyState, string> = { current: "Current state", future: "Future state" };
export const JOURNEY_STATE_HINTS: Record<JourneyState, string> = { current: "How the experience works today.", future: "How you intend it to work." };

/** The rows of a stage, in the order they read on the map. */
export const ITEM_KINDS = ["action", "goal", "thought", "touchpoint", "channel", "pain_point", "opportunity", "evidence"] as const;
export type ItemKind = (typeof ITEM_KINDS)[number];
export const ITEM_KIND_INFO: Record<ItemKind, { label: string; plural: string; addLabel: string; placeholder: string; tone: "default" | "danger" | "success" | "info" }> = {
  action: { label: "Action", plural: "User actions", addLabel: "Add an action", placeholder: "What the person does", tone: "default" },
  goal: { label: "Goal", plural: "User goals", addLabel: "Add a goal", placeholder: "What they are trying to achieve", tone: "default" },
  thought: { label: "Thought", plural: "Thoughts", addLabel: "Add a thought", placeholder: "What they think or say to themselves", tone: "default" },
  touchpoint: { label: "Touchpoint", plural: "Touchpoints", addLabel: "Add a touchpoint", placeholder: "Where they meet the product or service", tone: "info" },
  channel: { label: "Channel", plural: "Channels", addLabel: "Add a channel", placeholder: "Web, app, phone, in person…", tone: "info" },
  pain_point: { label: "Pain point", plural: "Pain points", addLabel: "Add a pain point", placeholder: "What goes wrong or frustrates", tone: "danger" },
  opportunity: { label: "Opportunity", plural: "Opportunities", addLabel: "Add an opportunity", placeholder: "What could be better", tone: "success" },
  evidence: { label: "Evidence", plural: "Supporting evidence", addLabel: "Add evidence", placeholder: "What this stage is based on", tone: "default" },
};
/** Pain points and opportunities can be handed to the Opportunity Analyzer. */
export const CONVERTIBLE_KINDS: readonly ItemKind[] = ["pain_point", "opportunity"];
/** Rows that say where they came from. */
export const EVIDENCE_KINDS: readonly ItemKind[] = ["pain_point", "opportunity", "evidence"];

export const EMOTIONS = [1, 2, 3, 4, 5] as const;
export type Emotion = (typeof EMOTIONS)[number];
export const EMOTION_LABELS: Record<Emotion, string> = { 1: "Very negative", 2: "Negative", 3: "Neutral", 4: "Positive", 5: "Very positive" };
export const NOT_RATED = "Not rated";

export const SUGGESTED_STAGES = ["Awareness", "Consideration", "Decision", "Onboarding", "Use", "Support", "Loyalty"] as const;

export const JOURNEY_TABS = [
  { key: "map", label: "Visual map" },
  { key: "table", label: "Structured table" },
  { key: "presentation", label: "Presentation" },
  { key: "edit", label: "Edit stages" },
  { key: "opportunities", label: "Opportunities" },
] as const;
export type JourneyTab = (typeof JOURNEY_TABS)[number]["key"];
export const isJourneyTab = (v: unknown): v is JourneyTab => JOURNEY_TABS.some((t) => t.key === v);

export const JOURNEY_LIMITS = { stages: 20, itemsPerJourney: 600, stageName: 80, itemChars: 1000 } as const;

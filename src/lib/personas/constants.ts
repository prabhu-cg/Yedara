export const PERSONA_TYPES = ["research_backed", "hypothesis", "proto"] as const;
export type PersonaType = (typeof PERSONA_TYPES)[number];

export type PersonaTypeInfo = {
  label: string;
  /** One line shown next to the type when choosing it. */
  summary: string;
  badge: "success" | "warning" | "info";
  /** The standing notice shown on the persona and in every export. */
  notice: string;
};

export const PERSONA_TYPE_INFO: Record<PersonaType, PersonaTypeInfo> = {
  research_backed: {
    label: "Research-backed",
    summary: "Built from real research with users: interviews, observation, surveys or analytics.",
    badge: "success",
    notice: "This persona is based on research. Check the Evidence section for the sources and how confident they are.",
  },
  hypothesis: {
    label: "Hypothesis",
    summary: "A structured set of beliefs about a user group that you have not yet tested with real people.",
    badge: "warning",
    notice: "This persona is a hypothesis. It is based on assumptions and has not been validated with users. Treat it as something to test, not as fact.",
  },
  proto: {
    label: "Proto-persona",
    summary: "A quick, team-built sketch from existing knowledge and experience, to align before research.",
    badge: "info",
    notice: "This is a proto-persona: the team's early best guess from existing knowledge. It has not been validated with users, so validate it before relying on it for design decisions.",
  },
};

export const PERSONA_STEPS = [
  { id: 1, slug: "context", title: "Persona context", short: "Context", description: "Name the persona and say what it is for." },
  { id: 2, slug: "profile", title: "User profile", short: "Profile", description: "Who this person is and the context they work in." },
  { id: 3, slug: "behaviour", title: "Behaviour", short: "Behaviour", description: "What they want, do and struggle with." },
  { id: 4, slug: "needs", title: "User needs", short: "Needs", description: "The jobs they are trying to get done, and how they cope today." },
  { id: 5, slug: "evidence", title: "Evidence", short: "Evidence", description: "Where this persona comes from, and how sure you are." },
  { id: 6, slug: "output", title: "Persona output", short: "Output", description: "Review the finished profile, then export or compare it." },
] as const;

export const PERSONA_TOTAL_STEPS = PERSONA_STEPS.length;
export const PERSONA_OUTPUT_STEP = 6;

export const PERSONA_SECTION_KEYS = ["context", "profile", "behaviour", "needs", "evidence", "output"] as const;
export type PersonaSectionKey = (typeof PERSONA_SECTION_KEYS)[number];

export const EVIDENCE_KINDS = ["research_source", "observation", "quote", "assumption", "hypothesis"] as const;
export type EvidenceKind = (typeof EVIDENCE_KINDS)[number];

export const EVIDENCE_KIND_INFO: Record<EvidenceKind, { label: string; plural: string; help: string }> = {
  research_source: {
    label: "Research source",
    plural: "Research sources",
    help: "A study, interview round, survey or dataset this persona draws on.",
  },
  observation: {
    label: "Supporting observation",
    plural: "Supporting observations",
    help: "Something you saw or measured. Describe what happened, not what it means.",
  },
  quote: {
    label: "Participant quote",
    plural: "Participant quotes",
    help: "Words a participant actually said, copied exactly. Never paraphrase or write one yourself.",
  },
  assumption: {
    label: "Assumption",
    plural: "Assumptions",
    help: "Something you are taking as true without evidence yet.",
  },
  hypothesis: {
    label: "Unvalidated hypothesis",
    plural: "Unvalidated hypotheses",
    help: "A testable belief about this user that you plan to check.",
  },
};

export const CONFIDENCE_LEVELS = ["high", "medium", "low"] as const;
export type Confidence = (typeof CONFIDENCE_LEVELS)[number];
export const CONFIDENCE_LABELS: Record<Confidence, string> = { high: "High confidence", medium: "Medium confidence", low: "Low confidence" };

export const VALIDATION_STATUSES = ["unvalidated", "validated", "invalidated"] as const;
export type ValidationStatus = (typeof VALIDATION_STATUSES)[number];
export const VALIDATION_LABELS: Record<ValidationStatus, string> = {
  unvalidated: "Unvalidated",
  validated: "Validated",
  invalidated: "Disproved",
};

export const EXPERIENCE_LEVELS = ["novice", "intermediate", "expert"] as const;
export const EXPERIENCE_LABELS: Record<(typeof EXPERIENCE_LEVELS)[number], string> = {
  novice: "Novice",
  intermediate: "Intermediate",
  expert: "Expert",
};

export function clampPersonaStep(value: unknown) {
  const n = Number(value);
  return Number.isInteger(n) && n >= 1 && n <= PERSONA_TOTAL_STEPS ? n : 1;
}

export const PERSONA_DEFAULT_POSITIONS: Record<PersonaSectionKey, number> = {
  context: 0,
  profile: 10,
  behaviour: 20,
  needs: 30,
  evidence: 40,
  output: 50,
};

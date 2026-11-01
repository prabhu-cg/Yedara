export const OBSERVATION_KINDS = ["observation", "quote", "survey_response", "note"] as const;
export type ObservationKind = (typeof OBSERVATION_KINDS)[number];
export const OBSERVATION_KIND_LABELS: Record<ObservationKind, string> = {
  observation: "Observation",
  quote: "Quote",
  survey_response: "Survey response",
  note: "Note",
};

export const SOURCE_TYPES = ["interview", "observation_session", "survey", "document", "other"] as const;
export type SourceType = (typeof SOURCE_TYPES)[number];
export const SOURCE_TYPE_LABELS: Record<SourceType, string> = {
  interview: "Interview",
  observation_session: "Observation session",
  survey: "Survey",
  document: "Document",
  other: "Other",
};

export const INSIGHT_KINDS = ["direct_observation", "interpretation", "hypothesis", "recommendation"] as const;
export type InsightKind = (typeof INSIGHT_KINDS)[number];
export const INSIGHT_KIND_INFO: Record<InsightKind, { label: string; description: string; badge: "success" | "info" | "warning" | "default" }> = {
  direct_observation: { label: "Direct observation", description: "Something you saw or heard, stated without interpretation.", badge: "success" },
  interpretation: { label: "Research interpretation", description: "What you conclude the observations mean. Your reading, not a recorded fact.", badge: "info" },
  hypothesis: { label: "Hypothesis", description: "A possible explanation that still needs testing.", badge: "warning" },
  recommendation: { label: "Recommendation", description: "A suggested action that follows from the evidence.", badge: "default" },
};

export const CONFIDENCE_LEVELS = ["high", "medium", "low"] as const;
export type Confidence = (typeof CONFIDENCE_LEVELS)[number];
export const CONFIDENCE_LABELS: Record<Confidence, string> = { high: "High confidence", medium: "Medium confidence", low: "Low confidence" };

export const PROBLEM_KINDS = ["problem", "opportunity"] as const;
export type ProblemKind = (typeof PROBLEM_KINDS)[number];
export const PROBLEM_KIND_LABELS: Record<ProblemKind, string> = { problem: "Problem", opportunity: "Opportunity" };

export const SYNTHESIS_TABS = [
  { key: "material", label: "Research material" },
  { key: "board", label: "Affinity board" },
  { key: "insights", label: "Insights" },
  { key: "report", label: "Report" },
] as const;
export type SynthesisTab = (typeof SYNTHESIS_TABS)[number]["key"];
export const isSynthesisTab = (v: unknown): v is SynthesisTab => SYNTHESIS_TABS.some((t) => t.key === v);

/** Hard limits, enforced in the browser before reading a file and again on the server. */
export const LIMITS = {
  fileBytes: 1_000_000,
  fileExtensions: [".txt", ".md", ".csv", ".tsv"],
  importStatements: 500,
  statementChars: 2000,
  observationsPerSynthesis: 2000,
  sourcesPerSynthesis: 200,
  themes: 200,
  insights: 300,
  tags: 20,
  tagChars: 40,
  evidencePerInsight: 50,
} as const;

export const FILE_LIMIT_TEXT = "Text files only (.txt, .md, .csv, .tsv), up to 1 MB and 500 statements per import.";

export const PRIVACY_NOTICE =
  "Research notes can contain personal information. Use participant codes such as P1 instead of names, and leave out details that identify someone. Your notes stay in your Yedara account, visible only to you. Files you choose are read in your browser and are never uploaded: only the text you confirm is saved. Nothing is sent to an AI service.";

export const AI_SHARING_WARNING =
  "This would send your research notes to an external AI service. They may contain personal information about participants. Only continue if participants have agreed to this and you have removed anything that identifies them.";

export const UNGROUPED_LABEL = "Not grouped yet";

export const SYNTHESIS_REPORT_NOTE =
  "Themes and insights are the researcher's interpretation of the evidence. Each insight lists the observations it rests on.";

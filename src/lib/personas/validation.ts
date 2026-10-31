import type { EvidenceRow, PersonaContent } from "@/lib/personas/schemas";
import type { PersonaType } from "@/lib/personas/constants";

export type PersonaIssue = { field: string; message: string; step: number };

export type PersonaMeta = { name: string; projectId: string | null; type: PersonaType };
export type PersonaData = {
  context: PersonaContent["context"];
  profile: PersonaContent["profile"];
  behaviour: PersonaContent["behaviour"];
  evidence: EvidenceRow[];
};

const filled = (v: string) => v.trim().length > 0;

export function hasDemographics(profile: PersonaContent["profile"]) {
  return profile.demographics.some((d) => filled(d.value));
}

/**
 * Required fields per step. The evidence rules are what keep personas honest:
 * a research-backed persona must actually cite research, and every quote must say where it came from.
 */
export function getPersonaIssues(step: number, meta: PersonaMeta, data: PersonaData): PersonaIssue[] {
  const issues: PersonaIssue[] = [];
  const add = (field: string, message: string) => issues.push({ field, message, step });

  if (step === 1) {
    if (!filled(meta.name)) add("name", "Give the persona a name or identifier");
    if (!meta.projectId) add("projectId", "Choose the project this persona belongs to");
  }
  if (step === 2) {
    if (!filled(data.profile.background) && !filled(data.profile.role)) {
      add("background", "Say who this persona is: a background or a role");
    }
    if (hasDemographics(data.profile) && !filled(data.profile.demographics_justification)) {
      add("demographics_justification", "Explain why these demographic details matter to your research, or remove them");
    }
  }
  if (step === 3 && !data.behaviour.goals.some(filled)) {
    add("goals", "Add at least one goal");
  }
  if (step === 5) {
    const sources = data.evidence.filter((e) => e.kind === "research_source");
    const support = data.evidence.filter((e) => e.kind === "observation" || e.kind === "quote");
    if (meta.type === "research_backed") {
      if (sources.length === 0) add("evidence", "A research-backed persona needs at least one research source");
      if (support.length === 0) add("evidence", "Add at least one observation or quote from that research");
    }
    // Quotes must be attributable whatever the persona type.
    for (const quote of data.evidence.filter((e) => e.kind === "quote" && !filled(e.source_label))) {
      add(`evidence-${quote.id}`, "Every quote needs its source: say where it came from");
    }
  }
  return issues;
}

export const PERSONA_REQUIRED_STEPS = [1, 2, 3, 5] as const;

export function getPersonaCompletionIssues(meta: PersonaMeta, data: PersonaData) {
  return PERSONA_REQUIRED_STEPS.flatMap((s) => getPersonaIssues(s, meta, data));
}

export function firstInvalidPersonaStepBefore(target: number, meta: PersonaMeta, data: PersonaData) {
  for (const step of PERSONA_REQUIRED_STEPS) {
    if (step >= target) break;
    if (getPersonaIssues(step, meta, data).length) return step;
  }
  return null;
}

export type EvidenceSummary = {
  sources: number;
  observations: number;
  quotes: number;
  quotesMissingSource: number;
  assumptions: number;
  hypotheses: number;
  unvalidated: number;
  aiGenerated: number;
};

export function summariseEvidence(evidence: readonly EvidenceRow[]): EvidenceSummary {
  const count = (kind: EvidenceRow["kind"]) => evidence.filter((e) => e.kind === kind).length;
  return {
    sources: count("research_source"),
    observations: count("observation"),
    quotes: count("quote"),
    quotesMissingSource: evidence.filter((e) => e.kind === "quote" && !filled(e.source_label)).length,
    assumptions: count("assumption"),
    hypotheses: count("hypothesis"),
    unvalidated: evidence.filter((e) => (e.kind === "assumption" || e.kind === "hypothesis") && e.validation_status === "unvalidated").length,
    aiGenerated: evidence.filter((e) => e.origin === "ai").length,
  };
}

/** One honest sentence about what a persona rests on. */
export function evidenceStatement(type: PersonaType, summary: EvidenceSummary) {
  const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
  if (type === "research_backed") {
    if (summary.sources === 0) return "Marked as research-backed, but no research source has been recorded yet.";
    return `Based on ${plural(summary.sources, "research source", "research sources")}, ${plural(summary.observations, "observation", "observations")} and ${plural(summary.quotes, "participant quote", "participant quotes")}.`;
  }
  const open = summary.unvalidated;
  return open > 0
    ? `Not validated with users. ${plural(open, "assumption or hypothesis is", "assumptions and hypotheses are")} still unvalidated.`
    : "Not validated with users.";
}

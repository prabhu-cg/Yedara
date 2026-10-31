import type { ProjectBrief } from "@/lib/shared-context";

/**
 * AI readiness for the Persona Builder. Disabled in Phase 3: personas are written by people.
 *
 * Integrity rules any future provider must follow (and the UI already enforces):
 *  - It may only propose assumptions or hypotheses. It must never produce research sources,
 *    observations, participant quotes or demographic facts.
 *  - Everything it returns is stored with `origin: "ai"` and shown with an "AI-generated" label,
 *    and stays unvalidated until a person says otherwise.
 */
export const AI_ASSUMPTION_LABEL = "AI-generated assumption. Not validated with users.";

export type PersonaAiRequest = {
  personaName: string;
  brief: ProjectBrief | null;
  instructions?: string;
};

export type AiAssumption = { content: string; kind: "assumption" | "hypothesis"; origin: "ai" };

export type PersonaAiResult =
  | { ok: true; assumptions: AiAssumption[] }
  | { ok: false; reason: "disabled" | "rate_limited" | "failed"; message: string };

export interface PersonaAiService {
  readonly enabled: boolean;
  suggestAssumptions(request: PersonaAiRequest): Promise<PersonaAiResult>;
}

export const disabledPersonaAi: PersonaAiService = {
  enabled: false,
  async suggestAssumptions() {
    return { ok: false, reason: "disabled", message: "AI suggestions are not available yet." };
  },
};

let service: PersonaAiService = disabledPersonaAi;
export const getPersonaAi = () => service;
export const setPersonaAi = (next: PersonaAiService) => {
  service = next;
};

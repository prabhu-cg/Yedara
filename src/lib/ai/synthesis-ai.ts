import { AI_SHARING_WARNING } from "@/lib/synthesizer/constants";

/**
 * AI-assisted synthesis is not built yet. This file fixes the rules a provider must follow so the
 * workflow stays honest and private when one is added.
 *
 * - Suggestions only: a provider may propose themes, groupings or draft insight wording. Nothing is
 *   applied without the researcher accepting it, and anything accepted is stored as the
 *   researcher's own text (there is no hidden "AI wrote this" state to lose).
 * - Evidence is never invented: a suggested insight may only cite observation ids it was given.
 * - Consent before sharing: research notes can describe real people. The warning below must be
 *   shown, and agreed to for that synthesis, before any observation leaves Yedara.
 */
export const SHARING_WARNING = AI_SHARING_WARNING;

export type SynthesisAiInput = {
  observations: { id: string; content: string; participantRef: string | null }[];
  /** True only after the person agreed to SHARING_WARNING for this synthesis. */
  consentToShare: boolean;
};

export type SynthesisSuggestion =
  | { type: "theme"; title: string; observationIds: string[] }
  | { type: "insight"; statement: string; observationIds: string[] };

export interface SynthesisAiService {
  readonly enabled: boolean;
  suggest(input: SynthesisAiInput): Promise<SynthesisSuggestion[]>;
}

export const disabledSynthesisAi: SynthesisAiService = {
  enabled: false,
  async suggest() {
    throw new Error("AI-assisted synthesis is not available yet.");
  },
};

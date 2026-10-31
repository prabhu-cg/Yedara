import type { AnySectionContent } from "@/lib/research-planner/schemas";
import type { MaterialContext } from "@/lib/research-planner/materials";
import type { SectionKey } from "@/lib/research-planner/constants";

/**
 * AI readiness. The planner never depends on this: the deterministic workflow
 * is complete without it, and AI generation is disabled until the AI phase.
 *
 * A future provider returns content in the *same* section schemas the editors
 * already use (see `SECTION_SCHEMAS`), so AI drafts land in the same editable
 * sections, flagged with `source: "ai"`.
 */
export type AiGenerationRequest = {
  section: SectionKey;
  context: MaterialContext;
  /** Optional free-text steer from the user. */
  instructions?: string;
};

export type AiGenerationResult =
  | { ok: true; content: AnySectionContent }
  | { ok: false; reason: "disabled" | "rate_limited" | "failed"; message: string };

export interface ResearchPlanAiService {
  readonly enabled: boolean;
  generateSection(request: AiGenerationRequest): Promise<AiGenerationResult>;
}

export const disabledAiService: ResearchPlanAiService = {
  enabled: false,
  async generateSection() {
    return {
      ok: false,
      reason: "disabled",
      message: "AI generation is not available yet.",
    };
  },
};

let service: ResearchPlanAiService = disabledAiService;

export function getPlannerAi() {
  return service;
}

/** For the AI phase (and tests): register a real provider. Not called in Phase 2. */
export function setPlannerAi(next: ResearchPlanAiService) {
  service = next;
}

import { z } from "zod";
import { overridesSchema } from "@/lib/shared-context";
import {
  CONFIDENCE_LEVELS,
  EVIDENCE_KINDS,
  EXPERIENCE_LEVELS,
  PERSONA_TYPES,
  VALIDATION_STATUSES,
  type PersonaSectionKey,
} from "@/lib/personas/constants";

const ITEM = 1000;
const text = (max: number) => z.string().max(max).default("");
const list = (max = 40) => z.array(z.string().max(ITEM)).max(max).default([]);

export const personaContextSchema = z.object({
  audience_segment: text(1000),
  /** Per-field overrides of the project brief. Absent = inherit. */
  overrides: overridesSchema,
});

export const personaProfileSchema = z.object({
  background: text(3000),
  role: text(300),
  experience_level: z.enum(["", ...EXPERIENCE_LEVELS]).default(""),
  context_of_use: text(3000),
  demographics: z.array(z.object({ label: z.string().max(100), value: z.string().max(200) })).max(12).default([]),
  /** Required whenever demographics are filled in: why they matter to the research. */
  demographics_justification: text(1000),
});

export const personaBehaviourSchema = z.object({
  goals: list(),
  needs: list(),
  motivations: list(),
  behaviours: list(),
  preferences: list(),
  pain_points: list(),
  frustrations: list(),
  barriers: list(),
});

export const personaNeedsSchema = z.object({
  jobs: z.array(z.object({ situation: z.string().max(ITEM), motivation: z.string().max(ITEM), outcome: z.string().max(ITEM) })).max(15).default([]),
  functional_needs: list(),
  emotional_needs: list(),
  desired_outcomes: list(),
  alternatives: list(),
  workarounds: list(),
});

export const personaEvidenceSummarySchema = z.object({
  summary_notes: text(3000),
  overall_confidence: z.enum(["", ...CONFIDENCE_LEVELS]).default(""),
  limitations: text(3000),
});

export const personaOutputSchema = z.object({
  headline: text(160),
  summary: text(2000),
});

export const PERSONA_SCHEMAS = {
  context: personaContextSchema,
  profile: personaProfileSchema,
  behaviour: personaBehaviourSchema,
  needs: personaNeedsSchema,
  evidence: personaEvidenceSummarySchema,
  output: personaOutputSchema,
} as const satisfies Record<PersonaSectionKey, z.ZodType>;

export type PersonaContent = {
  context: z.output<typeof personaContextSchema>;
  profile: z.output<typeof personaProfileSchema>;
  behaviour: z.output<typeof personaBehaviourSchema>;
  needs: z.output<typeof personaNeedsSchema>;
  evidence: z.output<typeof personaEvidenceSummarySchema>;
  output: z.output<typeof personaOutputSchema>;
};
export type AnyPersonaContent = PersonaContent[PersonaSectionKey];

export function emptyPersonaContent<K extends PersonaSectionKey>(key: K): PersonaContent[K] {
  return PERSONA_SCHEMAS[key].parse({}) as PersonaContent[K];
}

export function normalizePersonaContent<K extends PersonaSectionKey>(key: K, raw: unknown): PersonaContent[K] {
  const parsed = PERSONA_SCHEMAS[key].safeParse(raw ?? {});
  return (parsed.success ? parsed.data : emptyPersonaContent(key)) as PersonaContent[K];
}

/* ---------------- evidence rows ---------------- */

const optionalUrl = z
  .string()
  .trim()
  .max(2048)
  .refine((v) => v === "" || /^https?:\/\/\S+$/i.test(v), "Use a link starting with http:// or https://")
  .default("");

export const evidenceInputSchema = z.object({
  kind: z.enum(EVIDENCE_KINDS),
  content: z.string().trim().min(1, "Write the evidence first").max(2000, "Use 2,000 characters or fewer"),
  source_label: z.string().trim().max(300).default(""),
  source_url: optionalUrl,
  participant_ref: z.string().trim().max(120).default(""),
  confidence: z.enum(["", ...CONFIDENCE_LEVELS]).default(""),
  validation_status: z.enum(VALIDATION_STATUSES).default("unvalidated"),
});
export type EvidenceInput = z.output<typeof evidenceInputSchema>;

export type EvidenceRow = {
  id: string;
  kind: (typeof EVIDENCE_KINDS)[number];
  content: string;
  source_label: string;
  source_url: string;
  participant_ref: string;
  confidence: "" | (typeof CONFIDENCE_LEVELS)[number];
  validation_status: (typeof VALIDATION_STATUSES)[number];
  origin: "manual" | "ai";
  position: number;
};

export const personaMetaSchema = z.object({
  name: z.string().trim().min(1, "Give the persona a name").max(120, "Use 120 characters or fewer"),
  projectId: z.uuid({ error: "Choose a project" }),
  personaType: z.enum(PERSONA_TYPES),
});

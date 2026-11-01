import { z } from "zod";
import type { Database } from "@/lib/supabase/database.types";
import { ITEM_KINDS, JOURNEY_LIMITS, JOURNEY_STATES, JOURNEY_TYPES } from "@/lib/journeys/constants";

const optionalUuid = z.union([z.literal(""), z.uuid()]).default("");

export const journeyMetaSchema = z.object({
  name: z.string().trim().min(1, "Give the journey a name").max(160, "Use 160 characters or fewer"),
  projectId: z.uuid({ error: "Choose a project" }),
  personaId: optionalUuid,
  journeyType: z.enum(JOURNEY_TYPES).default("customer"),
  scenario: z.string().trim().max(2000, "Use 2000 characters or fewer").default(""),
  state: z.enum(JOURNEY_STATES).default("current"),
});
export type JourneyMetaInput = z.input<typeof journeyMetaSchema>;

export const journeyPatchSchema = journeyMetaSchema.partial();

export const stageNameSchema = z.string().trim().min(1, "Name the stage").max(JOURNEY_LIMITS.stageName, `Use ${JOURNEY_LIMITS.stageName} characters or fewer`);

export const stagePatchSchema = z.object({
  name: stageNameSchema.optional(),
  emotion: z.number().int().min(1).max(5).nullable().optional(),
  emotionNote: z.string().trim().max(300).optional(),
});
export type StagePatch = z.infer<typeof stagePatchSchema>;

const content = z.string().trim().min(1, "Write something first").max(JOURNEY_LIMITS.itemChars, `Use ${JOURNEY_LIMITS.itemChars} characters or fewer`);

export const itemInputSchema = z.object({
  stageId: z.uuid(),
  kind: z.enum(ITEM_KINDS),
  content,
  evidenceNote: z.string().trim().max(500).default(""),
  observationId: optionalUuid,
});
export type ItemInput = z.input<typeof itemInputSchema>;

export const itemPatchSchema = z.object({
  content: content.optional(),
  evidenceNote: z.string().trim().max(500).optional(),
  observationId: z.union([z.literal(""), z.uuid()]).optional(),
});
export type ItemPatch = z.infer<typeof itemPatchSchema>;

type Tables = Database["public"]["Tables"];
export type JourneyRow = Tables["journeys"]["Row"];
export type StageRow = Tables["journey_stages"]["Row"];
export type ItemRow = Tables["journey_items"]["Row"];
export type CandidateRow = Tables["opportunity_candidates"]["Row"];

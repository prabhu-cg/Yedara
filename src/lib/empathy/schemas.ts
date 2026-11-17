import { z } from "zod";
import type { Database } from "@/lib/supabase/database.types";
import { EMPATHY_LIMITS, QUADRANTS } from "@/lib/empathy/constants";

const optionalUuid = z.union([z.literal(""), z.uuid()]).default("");

export const empathyMetaSchema = z.object({
  title: z.string().trim().min(1, "Give the map a title").max(EMPATHY_LIMITS.title, `Use ${EMPATHY_LIMITS.title} characters or fewer`),
  projectId: z.uuid({ error: "Choose a project" }),
  personaId: optionalUuid,
  subject: z.string().trim().max(EMPATHY_LIMITS.subject, `Use ${EMPATHY_LIMITS.subject} characters or fewer`).default(""),
  context: z.string().trim().max(EMPATHY_LIMITS.context, `Use ${EMPATHY_LIMITS.context} characters or fewer`).default(""),
});
export type EmpathyMetaInput = z.input<typeof empathyMetaSchema>;

/**
 * A patch only touches the fields it names. It is written out, not `empathyMetaSchema.partial()`, because Zod
 * still applies `.default()` values under `.partial()`, which would blank the subject and situation on a rename.
 */
export const empathyPatchSchema = z.object({
  title: empathyMetaSchema.shape.title.optional(),
  projectId: empathyMetaSchema.shape.projectId.optional(),
  personaId: z.union([z.literal(""), z.uuid()]).optional(),
  subject: z.string().trim().max(EMPATHY_LIMITS.subject, `Use ${EMPATHY_LIMITS.subject} characters or fewer`).optional(),
  context: z.string().trim().max(EMPATHY_LIMITS.context, `Use ${EMPATHY_LIMITS.context} characters or fewer`).optional(),
  notResearched: z.array(z.enum(QUADRANTS)).max(QUADRANTS.length).optional(),
});

const content = z.string().trim().min(1, "Write something first").max(EMPATHY_LIMITS.itemChars, `Use ${EMPATHY_LIMITS.itemChars} characters or fewer`);

export const empathyItemInputSchema = z.object({
  quadrant: z.enum(QUADRANTS),
  content,
  evidenceNote: z.string().trim().max(EMPATHY_LIMITS.note).default(""),
  observationId: optionalUuid,
});
export type EmpathyItemInput = z.input<typeof empathyItemInputSchema>;

export const empathyItemPatchSchema = z.object({
  content: content.optional(),
  evidenceNote: z.string().trim().max(EMPATHY_LIMITS.note).optional(),
  observationId: z.union([z.literal(""), z.uuid()]).optional(),
});

type Tables = Database["public"]["Tables"];
export type EmpathyMapRow = Tables["empathy_maps"]["Row"];
export type EmpathyItemRow = Tables["empathy_items"]["Row"];

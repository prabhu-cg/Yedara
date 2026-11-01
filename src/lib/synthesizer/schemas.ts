import { z } from "zod";
import type { Database } from "@/lib/supabase/database.types";
import {
  CONFIDENCE_LEVELS,
  INSIGHT_KINDS,
  LIMITS,
  OBSERVATION_KINDS,
  PROBLEM_KINDS,
  SOURCE_TYPES,
  type ObservationKind,
  type SourceType,
} from "@/lib/synthesizer/constants";

const text = (max: number, label = "This field") => z.string().trim().max(max, `${label} can be at most ${max} characters`);
const optionalUuid = z.union([z.literal(""), z.uuid()]).default("");

/** Trim, drop a leading #, de-duplicate ignoring case, cap length and count. */
export function normalizeTags(input: readonly string[] | string): string[] {
  const list = typeof input === "string" ? input.split(/[,\n]/) : input;
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of list) {
    const tag = raw.trim().replace(/^#+/, "").trim().slice(0, LIMITS.tagChars);
    const key = tag.toLowerCase();
    if (!tag || seen.has(key)) continue;
    seen.add(key);
    out.push(tag);
    if (out.length >= LIMITS.tags) break;
  }
  return out;
}

export const synthesisMetaSchema = z.object({
  title: z.string().trim().min(1, "Give the synthesis a title").max(160, "Use 160 characters or fewer"),
  projectId: z.uuid({ error: "Choose a project" }),
});
export type SynthesisMetaInput = z.infer<typeof synthesisMetaSchema>;

export const sourceInputSchema = z.object({
  name: z.string().trim().min(1, "Name the source").max(200, "Use 200 characters or fewer"),
  sourceType: z.enum(SOURCE_TYPES).default("other"),
  participantRef: text(120).default(""),
  conductedOn: z.union([z.literal(""), z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use a date such as 2026-03-14")]).default(""),
  notes: text(1000).default(""),
  fileName: text(255).default(""),
  fileSize: z.number().int().min(0).max(5_000_000).nullable().default(null),
  importMethod: z.enum(["manual", "paste", "file"]).default("manual"),
});
export type SourceInput = z.infer<typeof sourceInputSchema>;

export const observationInputSchema = z.object({
  content: z.string().trim().min(1, "Write the observation").max(LIMITS.statementChars, `Use ${LIMITS.statementChars} characters or fewer`),
  kind: z.enum(OBSERVATION_KINDS).default("observation"),
  participantRef: text(120).default(""),
  sourceId: optionalUuid,
  tags: z.array(z.string()).max(LIMITS.tags).default([]).transform(normalizeTags),
});
export type ObservationInput = z.input<typeof observationInputSchema>;

/** What the person confirmed from pasted text or a file: the statements, never the file. */
export const importInputSchema = z.object({
  source: sourceInputSchema,
  statements: z.array(z.string().trim().min(1).max(LIMITS.statementChars)).min(1, "There is nothing to import").max(LIMITS.importStatements, `Import at most ${LIMITS.importStatements} statements at a time`),
  kind: z.enum(OBSERVATION_KINDS).default("observation"),
  participantRef: text(120).default(""),
  tags: z.array(z.string()).max(LIMITS.tags).default([]).transform(normalizeTags),
});

export const insightInputSchema = z.object({
  kind: z.enum(INSIGHT_KINDS).default("interpretation"),
  observation: text(2000).default(""),
  pattern: text(1000).default(""),
  userNeed: text(1000).default(""),
  problemKind: z.union([z.literal(""), z.enum(PROBLEM_KINDS)]).default(""),
  problemText: text(1000).default(""),
  statement: z.string().trim().min(1, "Write the insight statement").max(1000, "Use 1000 characters or fewer"),
  confidence: z.enum(CONFIDENCE_LEVELS).default("medium"),
  recommendedAction: text(1000).default(""),
  themeId: optionalUuid,
  evidenceIds: z.array(z.uuid()).min(1, "Link at least one observation as evidence").max(LIMITS.evidencePerInsight),
});
export type InsightInput = z.input<typeof insightInputSchema>;

export const layoutSchema = z.object({
  themes: z.array(z.object({ id: z.uuid(), title: z.string().trim().min(1, "Give every theme a title").max(120), notes: text(2000).default("") })).max(LIMITS.themes),
  cards: z.array(z.object({ id: z.uuid(), themeId: z.uuid().nullable(), position: z.number().int().min(0).max(100_000) })).max(5000),
});
export type LayoutInput = z.infer<typeof layoutSchema>;

export const reportSchema = z.object({
  overview: text(6000).default(""),
  methodology: text(6000).default(""),
  participantsNote: text(3000).default(""),
  painPointsNote: text(3000).default(""),
  recommendationsNote: text(3000).default(""),
  limitations: text(6000).default(""),
});
export type ReportContent = z.infer<typeof reportSchema>;
export const emptyReport = (): ReportContent => reportSchema.parse({});
export const normalizeReport = (value: unknown): ReportContent => {
  const parsed = reportSchema.safeParse(value ?? {});
  return parsed.success ? parsed.data : emptyReport();
};

type Tables = Database["public"]["Tables"];
export type SynthesisRow = Tables["research_syntheses"]["Row"];
export type SourceRow = Tables["research_sources"]["Row"];
export type ThemeRow = Tables["research_themes"]["Row"];
export type CardRow = Tables["affinity_cards"]["Row"];
export type ObservationRow = Omit<Tables["research_observations"]["Row"], "tags"> & { tags: string[] };
export type InsightRow = Tables["research_insights"]["Row"] & { evidence_ids: string[] };

export const toTags = (value: unknown): string[] => (Array.isArray(value) ? normalizeTags(value.filter((v): v is string => typeof v === "string")) : []);

export type { ObservationKind, SourceType };

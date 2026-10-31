import { z } from "zod";
import { overridesSchema } from "@/lib/shared-context";
import {
  CELL_STATUSES,
  COMPETITOR_TYPES,
  CRITERIA_CATEGORIES,
  SOURCE_TYPES,
  type CellStatus,
  type CompetitorType,
  type CriteriaCategory,
  type Origin,
  type SourceType,
} from "@/lib/competitors/constants";

const ITEM = 1000;
const text = (max: number) => z.string().max(max).default("");
const list = (max = 40) => z.array(z.string().max(ITEM)).max(max).default([]);

export const marketContextSchema = z.object({
  market_category: text(300),
  geography: text(300),
  /** Per-field overrides of the project brief. Absent = inherit. */
  overrides: overridesSchema,
});
export type MarketContext = z.output<typeof marketContextSchema>;

export const analysisContentSchema = z.object({
  strengths: list(),
  weaknesses: list(),
  positioning_differences: list(),
  feature_gaps: list(),
  opportunities: list(),
  further_research: list(),
  positioning_summary: text(3000),
});
export type AnalysisContent = z.output<typeof analysisContentSchema>;

export const emptyMarketContext = (): MarketContext => marketContextSchema.parse({});
export const emptyAnalysis = (): AnalysisContent => analysisContentSchema.parse({});
export const normalizeMarketContext = (raw: unknown) => {
  const r = marketContextSchema.safeParse(raw ?? {});
  return r.success ? r.data : emptyMarketContext();
};
export const normalizeAnalysis = (raw: unknown) => {
  const r = analysisContentSchema.safeParse(raw ?? {});
  return r.success ? r.data : emptyAnalysis();
};

const httpUrl = (max = 2048) =>
  z
    .string()
    .trim()
    .max(max)
    .refine((v) => v === "" || /^https?:\/\/\S+$/i.test(v), "Use a link starting with http:// or https://");

const isoDate = z
  .string()
  .trim()
  .refine((v) => v === "" || (/^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v))), "Use a valid date");

export const competitorInputSchema = z.object({
  name: z.string().trim().min(1, "Name the competitor").max(160, "Use 160 characters or fewer"),
  website_url: httpUrl().default(""),
  competitor_type: z.enum(COMPETITOR_TYPES),
  description: z.string().trim().max(2000).default(""),
  target_audience: z.string().trim().max(1000).default(""),
  positioning: z.string().trim().max(1000).default(""),
  pricing_info: z.string().trim().max(1000).default(""),
  research_date: isoDate.default(""),
});
export type CompetitorInput = z.output<typeof competitorInputSchema>;
export type CompetitorRow = CompetitorInput & { id: string; position: number };

export const criterionInputSchema = z.object({
  name: z.string().trim().min(1, "Name the criterion").max(160, "Use 160 characters or fewer"),
  category: z.enum(CRITERIA_CATEGORIES).default("custom"),
  description: z.string().trim().max(500).default(""),
});
export type CriterionInput = z.output<typeof criterionInputSchema>;
export type CriterionRow = CriterionInput & { id: string; position: number };

export const cellInputSchema = z.object({
  value: z.string().trim().max(1000, "Use 1,000 characters or fewer").default(""),
  status: z.enum(CELL_STATUSES).default("unknown"),
  notes: z.string().trim().max(2000, "Use 2,000 characters or fewer").default(""),
  source_id: z.union([z.uuid(), z.literal("")]).default(""),
});
export type CellInput = z.output<typeof cellInputSchema>;
export type CellRow = CellInput & { competitor_id: string; criterion_id: string; origin: Origin };

export const sourceInputSchema = z.object({
  url: httpUrl().refine((v) => v !== "", "Add the link to your source"),
  title: z.string().trim().max(300).default(""),
  source_type: z.enum(SOURCE_TYPES).default("website"),
  retrieved_on: isoDate.default(""),
  notes: z.string().trim().max(1000).default(""),
});
export type SourceInput = z.output<typeof sourceInputSchema>;
export type SourceRow = SourceInput & { id: string; competitor_id: string; origin: Origin };

export const analysisMetaSchema = z.object({
  title: z.string().trim().min(1, "Give the analysis a title").max(160, "Use 160 characters or fewer"),
  projectId: z.uuid({ error: "Choose a project" }),
});

export type { CellStatus, CompetitorType, CriteriaCategory, SourceType };

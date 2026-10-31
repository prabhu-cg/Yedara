import { z } from "zod";

/**
 * Shared project context. A project holds one brief; modules (personas, competitor analyses)
 * read from it and may override a field locally. The override is stored in the module and the
 * project is never written to, so there is one source of truth and no silent drift.
 */
export const SHARED_FIELDS = [
  "project_description",
  "industry",
  "product_service",
  "target_audience",
  "research_objectives",
] as const;
export type SharedField = (typeof SHARED_FIELDS)[number];

export const SHARED_FIELD_LABELS: Record<SharedField, string> = {
  project_description: "Project description",
  industry: "Industry",
  product_service: "Product or service",
  target_audience: "Target audience",
  research_objectives: "Research objectives",
};

export type ProjectBrief = {
  description: string | null;
  industry: string | null;
  product_service: string | null;
  target_audience: string | null;
  research_objectives: string | null;
};

/** Present key = overridden (even when empty: "deliberately blank for this module"). Absent = inherit. */
export type ContextOverrides = Partial<Record<SharedField, string>>;

export const overridesSchema = z.partialRecord(z.enum(SHARED_FIELDS), z.string().max(2000)).default({});

export type ResolvedField = {
  /** What this module should use. */
  value: string;
  /** What the project brief says (may be empty). */
  inherited: string;
  overridden: boolean;
};

const BRIEF_KEY: Record<SharedField, keyof ProjectBrief> = {
  project_description: "description",
  industry: "industry",
  product_service: "product_service",
  target_audience: "target_audience",
  research_objectives: "research_objectives",
};

export function resolveSharedContext(
  project: ProjectBrief | null,
  overrides: ContextOverrides = {},
): Record<SharedField, ResolvedField> {
  const out = {} as Record<SharedField, ResolvedField>;
  for (const field of SHARED_FIELDS) {
    const inherited = (project?.[BRIEF_KEY[field]] ?? "").trim();
    const overridden = Object.prototype.hasOwnProperty.call(overrides, field);
    out[field] = { value: overridden ? (overrides[field] ?? "").trim() : inherited, inherited, overridden };
  }
  return out;
}

/** Sets or clears one override without mutating the original object. */
export function withOverride(overrides: ContextOverrides, field: SharedField, value: string | undefined): ContextOverrides {
  const next = { ...overrides };
  if (value === undefined) delete next[field];
  else next[field] = value;
  return next;
}

export function countOverrides(overrides: ContextOverrides) {
  return SHARED_FIELDS.filter((f) => Object.prototype.hasOwnProperty.call(overrides, f)).length;
}

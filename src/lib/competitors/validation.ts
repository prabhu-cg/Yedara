import { CELL_STATUS_SHORT, UNNAMED_COMPETITOR } from "@/lib/competitors/constants";
import type { CellRow, CompetitorRow, CriterionRow } from "@/lib/competitors/schemas";

export type AnalysisIssue = { field: string; message: string; step: number };
export type AnalysisMeta = { title: string; projectId: string | null };
export type AnalysisData = { competitors: CompetitorRow[]; criteria: CriterionRow[] };

const filled = (s: string) => s.trim().length > 0;

export function getAnalysisIssues(step: number, meta: AnalysisMeta, data: AnalysisData): AnalysisIssue[] {
  const issues: AnalysisIssue[] = [];
  const add = (field: string, message: string) => issues.push({ field, message, step });

  if (step === 1) {
    if (!filled(meta.title)) add("title", "Give the analysis a title");
    if (!meta.projectId) add("projectId", "Choose the project this analysis belongs to");
  }
  if (step === 2) {
    if (data.competitors.length === 0) add("competitors", "Add at least one competitor");
    else if (data.competitors.some((c) => c.name.trim() === UNNAMED_COMPETITOR)) {
      add("competitors", "Name every competitor, or remove the ones you don't need");
    }
  }
  if (step === 3 && data.criteria.length === 0) add("criteria", "Add at least one comparison criterion");
  return issues;
}

export const ANALYSIS_REQUIRED_STEPS = [1, 2, 3] as const;

export function getAnalysisCompletionIssues(meta: AnalysisMeta, data: AnalysisData) {
  return ANALYSIS_REQUIRED_STEPS.flatMap((s) => getAnalysisIssues(s, meta, data));
}

export function firstInvalidAnalysisStepBefore(target: number, meta: AnalysisMeta, data: AnalysisData) {
  for (const step of ANALYSIS_REQUIRED_STEPS) {
    if (step >= target) break;
    if (getAnalysisIssues(step, meta, data).length) return step;
  }
  return null;
}

export type Gap = { competitorId: string; competitor: string; criterionId: string; criterion: string; kind: "unknown" | "unavailable" };

const hasContent = (cell: CellRow | undefined) => !!cell && (filled(cell.value) || filled(cell.notes));

/**
 * Where the evidence is thin. A cell with no entry, or marked unknown, is "not yet researched";
 * a cell marked unavailable is "looked for, not publicly available". Neither is a weakness of the
 * competitor, and nothing here is ever scored against it.
 */
export function findGaps(competitors: CompetitorRow[], criteria: CriterionRow[], cells: CellRow[]): Gap[] {
  const byKey = new Map(cells.map((c) => [`${c.competitor_id}:${c.criterion_id}`, c]));
  const gaps: Gap[] = [];
  for (const criterion of criteria) {
    for (const competitor of competitors) {
      const cell = byKey.get(`${competitor.id}:${criterion.id}`);
      const status = cell?.status ?? "unknown";
      if (status === "not_applicable") continue;
      if (status === "unavailable") gaps.push({ competitorId: competitor.id, competitor: competitor.name, criterionId: criterion.id, criterion: criterion.name, kind: "unavailable" });
      else if (status === "unknown" || !hasContent(cell)) gaps.push({ competitorId: competitor.id, competitor: competitor.name, criterionId: criterion.id, criterion: criterion.name, kind: "unknown" });
    }
  }
  return gaps;
}

/** Turns gaps into "areas requiring further research" lines, grouped by criterion. Factual, not evaluative. */
export function gapSuggestions(gaps: Gap[]): string[] {
  const byCriterion = new Map<string, Gap[]>();
  for (const g of gaps) byCriterion.set(g.criterion, [...(byCriterion.get(g.criterion) ?? []), g]);
  const lines: string[] = [];
  for (const [criterion, items] of byCriterion) {
    const unknown = items.filter((i) => i.kind === "unknown").map((i) => i.competitor);
    const unavailable = items.filter((i) => i.kind === "unavailable").map((i) => i.competitor);
    if (unknown.length) lines.push(`${criterion}: not yet researched for ${unknown.join(", ")}`);
    if (unavailable.length) lines.push(`${criterion}: not publicly available for ${unavailable.join(", ")} (look for another source)`);
  }
  return lines;
}

export type Coverage = { competitorId: string; name: string; known: number; unknown: number; unavailable: number; notApplicable: number; total: number };

export function coverageByCompetitor(competitors: CompetitorRow[], criteria: CriterionRow[], cells: CellRow[]): Coverage[] {
  const byKey = new Map(cells.map((c) => [`${c.competitor_id}:${c.criterion_id}`, c]));
  return competitors.map((competitor) => {
    const out: Coverage = { competitorId: competitor.id, name: competitor.name, known: 0, unknown: 0, unavailable: 0, notApplicable: 0, total: criteria.length };
    for (const criterion of criteria) {
      const cell = byKey.get(`${competitor.id}:${criterion.id}`);
      const status = cell?.status ?? "unknown";
      if (status === "known" && hasContent(cell)) out.known++;
      else if (status === "unavailable") out.unavailable++;
      else if (status === "not_applicable") out.notApplicable++;
      else out.unknown++;
    }
    return out;
  });
}

/** Plain-text rendering of a cell, used by the matrix preview and every export. */
export function cellText(cell: CellRow | undefined, sourceTag?: string) {
  const status = cell?.status ?? "unknown";
  if (status === "known" && filled(cell?.value ?? "")) return `${cell!.value.trim()}${sourceTag ? ` ${sourceTag}` : ""}`;
  if (status === "known") return `Known, no detail recorded${sourceTag ? ` ${sourceTag}` : ""}`;
  return CELL_STATUS_SHORT[status];
}

import type { Block, DocSection, PlanDocument } from "@/lib/research-planner/document";
import { formatDocDate } from "@/lib/research-planner/document";
import { CATEGORY_LABELS, COMPETITOR_TYPE_INFO, ORIGIN_LABELS, SOURCE_TYPE_LABELS, UNNAMED_COMPETITOR } from "@/lib/competitors/constants";
import type { AnalysisContent, CellRow, CompetitorRow, CriterionRow, MarketContext, SourceRow } from "@/lib/competitors/schemas";
import { cellText, coverageByCompetitor, findGaps, gapSuggestions } from "@/lib/competitors/validation";
import { resolveSharedContext, type ProjectBrief } from "@/lib/shared-context";

export type AnalysisDocumentInput = {
  analysis: { title: string; status: "draft" | "completed"; updatedAt: string };
  project: { name: string; client: string | null; brief: ProjectBrief } | null;
  preparedBy?: string | null;
  market: MarketContext;
  content: AnalysisContent;
  competitors: CompetitorRow[];
  criteria: CriterionRow[];
  cells: CellRow[];
  sources: SourceRow[];
};

const t = (s: string) => s.trim();
const clean = (items: string[]) => items.map(t).filter(Boolean);
const para = (heading: string, value: string): Block[] =>
  t(value) ? [{ type: "heading", text: heading }, { type: "paragraph", text: t(value) }] : [];
const bullets = (heading: string, items: string[]): Block[] =>
  clean(items).length ? [{ type: "heading", text: heading }, { type: "list", ordered: false, items: clean(items) }] : [];

/** Sources are cited as S1, S2… in competitor order, so the matrix can point at them compactly. */
export function sourceTags(competitors: CompetitorRow[], sources: SourceRow[]) {
  const order = new Map(competitors.map((c, i) => [c.id, i]));
  const sorted = [...sources].sort((a, b) => (order.get(a.competitor_id) ?? 0) - (order.get(b.competitor_id) ?? 0));
  return new Map(sorted.map((s, i) => [s.id, `[S${i + 1}]`]));
}

const label = (c: CompetitorRow) => t(c.name) || UNNAMED_COMPETITOR;

/**
 * Builds the report used by the preview and by every export. Facts a person recorded are kept
 * apart from their interpretation, and missing information is reported as missing, never as a weakness.
 */
export function buildAnalysisDocument(input: AnalysisDocumentInput): PlanDocument {
  const { analysis, project, market, content, competitors, criteria, cells, sources } = input;
  const ctx = resolveSharedContext(project?.brief ?? null, market.overrides);
  const tags = sourceTags(competitors, sources);
  const byKey = new Map(cells.map((c) => [`${c.competitor_id}:${c.criterion_id}`, c]));
  const sections: DocSection[] = [];
  const push = (key: string, title: string, blocks: Block[]) => blocks.length && sections.push({ key, title, blocks });

  const kv = (rows: [string, string][]): Block[] => {
    const kept = rows.filter(([, v]) => t(v));
    return kept.length ? [{ type: "table", headers: ["Aspect", "Detail"], rows: kept.map(([a, b]) => [a, t(b)]), widths: [3, 7] }] : [];
  };

  push("overview", "Overview", [
    {
      type: "paragraph",
      text: `This analysis compares ${competitors.length} competitor${competitors.length === 1 ? "" : "s"} on ${criteria.length} criteri${criteria.length === 1 ? "on" : "a"}. Entries are recorded from the sources listed at the end; where information could not be found it is marked as unknown or not publicly available.`,
    },
    ...kv([
      ["Market", market.market_category],
      ["Geography", market.geography],
      ["Project description", ctx.project_description.value],
      ["Product or service", ctx.product_service.value],
      ["Industry", ctx.industry.value],
      ["Target audience", ctx.target_audience.value],
      ["Research objectives", ctx.research_objectives.value],
    ]),
  ]);

  if (competitors.length) {
    push("competitors", "Competitors", [
      {
        type: "table",
        headers: ["Competitor", "Type", "About", "Pricing"],
        rows: competitors.map((c) => [
          label(c) + (t(c.website_url) ? `\n${t(c.website_url)}` : ""),
          COMPETITOR_TYPE_INFO[c.competitor_type].label,
          [t(c.description), t(c.target_audience) && `Audience: ${t(c.target_audience)}`].filter(Boolean).join("\n") || "—",
          t(c.pricing_info) || "Not recorded",
        ]),
        widths: [3, 1.6, 4.4, 2.2],
      },
    ]);
  }

  if (competitors.length && criteria.length) {
    push("matrix", "Comparison matrix", [
      {
        type: "table",
        headers: ["Criterion", ...competitors.map(label)],
        rows: criteria.map((criterion) => [
          criterion.name,
          ...competitors.map((c) => {
            const cell = byKey.get(`${c.id}:${criterion.id}`);
            const text = cellText(cell, cell?.source_id ? tags.get(cell.source_id) : undefined);
            return t(cell?.notes ?? "") ? `${text}\nNote: ${t(cell!.notes)}` : text;
          }),
        ]),
        widths: [2.4, ...competitors.map(() => 7.6 / competitors.length)],
      },
      { type: "paragraph", text: "“Unknown” means not yet researched. “Not publicly available” means it was looked for and could not be found. Neither is a judgement about the competitor." },
    ]);

    const coverage = coverageByCompetitor(competitors, criteria, cells);
    push("coverage", "Research coverage", [
      {
        type: "table",
        headers: ["Competitor", "Recorded", "Unknown", "Not publicly available", "Not applicable"],
        rows: coverage.map((c) => [c.name, `${c.known} of ${c.total}`, String(c.unknown), String(c.unavailable), String(c.notApplicable)]),
        widths: [3.6, 1.6, 1.6, 2, 1.6],
      },
    ]);
  }

  push("positioning", "Positioning", [
    ...para("Positioning summary", content.positioning_summary),
    ...(competitors.some((c) => t(c.positioning))
      ? ([{ type: "heading", text: "How each competitor positions itself" }, { type: "list", ordered: false, items: competitors.filter((c) => t(c.positioning)).map((c) => `${label(c)}: ${t(c.positioning)}`) }] as Block[])
      : []),
    ...bullets("Positioning differences", content.positioning_differences),
  ]);

  const interpretation = [...bullets("Strengths", content.strengths), ...bullets("Weaknesses", content.weaknesses), ...bullets("Feature gaps", content.feature_gaps)];
  push("analysis", "Analysis", interpretation.length
    ? [{ type: "paragraph", text: "This section is the researcher's interpretation of the matrix. It is not a recorded fact about any competitor." }, ...interpretation]
    : []);

  push("opportunities", "Differentiation opportunities", bullets("Opportunities", content.opportunities));

  const research = [...clean(content.further_research), ...gapSuggestions(findGaps(competitors, criteria, cells)).filter((g) => !clean(content.further_research).includes(g))];
  push("further", "Areas requiring further research", research.length ? [{ type: "list", ordered: false, items: research }] : []);

  if (sources.length) {
    const nameOf = new Map(competitors.map((c) => [c.id, label(c)]));
    const ordered = [...sources].sort((a, b) => Number((tags.get(a.id) ?? "").replace(/\D/g, "")) - Number((tags.get(b.id) ?? "").replace(/\D/g, "")));
    push("sources", "Sources", [
      {
        type: "table",
        headers: ["Ref", "Competitor", "Source", "Type", "Retrieved"],
        rows: ordered.map((s) => [
          (tags.get(s.id) ?? "").replace(/[[\]]/g, ""),
          nameOf.get(s.competitor_id) ?? "—",
          `${t(s.title) ? `${t(s.title)}\n` : ""}${t(s.url)}${s.origin !== "manual" ? `\n${ORIGIN_LABELS[s.origin]}` : ""}`,
          SOURCE_TYPE_LABELS[s.source_type],
          s.retrieved_on ? formatDocDate(s.retrieved_on) : "Not recorded",
        ]),
        widths: [0.9, 2.2, 4.6, 1.4, 1.8],
      },
    ]);
  }

  const meta = [
    { label: "Project", value: project?.name ?? "" },
    { label: "Client", value: project?.client ?? "" },
    { label: "Prepared by", value: input.preparedBy ?? "" },
    { label: "Status", value: analysis.status === "completed" ? "Completed" : "Draft" },
    { label: "Last updated", value: formatDocDate(analysis.updatedAt) },
  ].filter((m) => m.value.trim());

  return { title: t(analysis.title) || "Untitled analysis", kicker: "Competitor analysis", meta, sections };
}

export { CATEGORY_LABELS };

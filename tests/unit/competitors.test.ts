import JSZip from "jszip";
import { extractText, getDocumentProxy } from "unpdf";
import { describe, expect, it } from "vitest";
import { SUGGESTED_CRITERIA } from "@/lib/competitors/constants";
import { buildAnalysisDocument, sourceTags } from "@/lib/competitors/document";
import { analysisMetaSchema, cellInputSchema, competitorInputSchema, criterionInputSchema, emptyAnalysis, emptyMarketContext, normalizeAnalysis, sourceInputSchema, type CellRow, type CompetitorRow, type CriterionRow, type SourceRow } from "@/lib/competitors/schemas";
import { cellText, coverageByCompetitor, findGaps, firstInvalidAnalysisStepBefore, gapSuggestions, getAnalysisCompletionIssues, getAnalysisIssues } from "@/lib/competitors/validation";
import { renderDocx } from "@/lib/research-planner/export/docx";
import { renderMarkdown } from "@/lib/research-planner/export/markdown";
import { renderPdf } from "@/lib/research-planner/export/pdf";

const PROJECT_ID = "11111111-1111-4111-8111-111111111111";

const comp = (id: string, name: string, over: Partial<CompetitorRow> = {}): CompetitorRow => ({
  id, name, website_url: "", competitor_type: "direct", description: "", target_audience: "", positioning: "", pricing_info: "", research_date: "", position: 0, ...over,
});
const crit = (id: string, name: string): CriterionRow => ({ id, name, category: "custom", description: "", position: 0 });
const cell = (competitor_id: string, criterion_id: string, over: Partial<CellRow> = {}): CellRow => ({
  competitor_id, criterion_id, value: "", status: "unknown", notes: "", source_id: "", origin: "manual", ...over,
});
const src = (id: string, competitor_id: string, over: Partial<SourceRow> = {}): SourceRow => ({
  id, competitor_id, url: "https://acme.example/pricing", title: "Pricing page", source_type: "pricing_page", retrieved_on: "2026-10-01", origin: "manual", notes: "", ...over,
});

const A = comp("a", "Acme");
const B = comp("b", "Bolt");
const price = crit("k1", "Pricing");
const offline = crit("k2", "Offline mode");

describe("competitor schemas", () => {
  it("requires a name, and only accepts the four competitor types", () => {
    expect(competitorInputSchema.safeParse({ name: " ", competitor_type: "direct" }).success).toBe(false);
    for (const competitor_type of ["direct", "indirect", "substitute", "emerging"]) {
      expect(competitorInputSchema.safeParse({ name: "Acme", competitor_type }).success).toBe(true);
    }
    expect(competitorInputSchema.safeParse({ name: "Acme", competitor_type: "rival" }).success).toBe(false);
  });

  it("rejects unsafe or malformed links and impossible dates", () => {
    const base = { name: "Acme", competitor_type: "direct" };
    expect(competitorInputSchema.safeParse({ ...base, website_url: "javascript:alert(1)" }).success).toBe(false);
    expect(competitorInputSchema.safeParse({ ...base, website_url: "https://acme.example" }).success).toBe(true);
    expect(competitorInputSchema.safeParse({ ...base, research_date: "2026-13-45" }).success).toBe(false);
    expect(sourceInputSchema.safeParse({ url: "" }).success).toBe(false);
    expect(sourceInputSchema.safeParse({ url: "ftp://x.example" }).success).toBe(false);
  });

  it("supports custom criteria and the suggested categories", () => {
    expect(criterionInputSchema.safeParse({ name: "Offline mode" }).data?.category).toBe("custom");
    expect(criterionInputSchema.safeParse({ name: "" }).success).toBe(false);
    expect(SUGGESTED_CRITERIA.map((s) => s.category)).toEqual(expect.arrayContaining(["pricing", "accessibility", "integrations", "support"]));
    expect(SUGGESTED_CRITERIA.every((s) => criterionInputSchema.safeParse(s).success)).toBe(true);
  });

  it("defaults a cell to unknown, never to a value", () => {
    expect(cellInputSchema.parse({})).toEqual({ value: "", status: "unknown", notes: "", source_id: "" });
    expect(cellInputSchema.safeParse({ status: "weak" }).success).toBe(false);
    expect(cellInputSchema.safeParse({ source_id: "not-a-uuid" }).success).toBe(false);
  });

  it("needs a title and a real project", () => {
    expect(analysisMetaSchema.safeParse({ title: "", projectId: PROJECT_ID }).success).toBe(false);
    expect(analysisMetaSchema.safeParse({ title: "Invoicing", projectId: "x" }).success).toBe(false);
    expect(analysisMetaSchema.safeParse({ title: "Invoicing", projectId: PROJECT_ID }).success).toBe(true);
  });

  it("normalises corrupt stored content", () => {
    expect(normalizeAnalysis({ strengths: "oops" })).toEqual(emptyAnalysis());
  });
});

describe("analysis step validation", () => {
  const meta = { title: "Invoicing", projectId: PROJECT_ID };

  it("asks for a title and a project first", () => {
    expect(getAnalysisIssues(1, { title: "", projectId: null }, { competitors: [], criteria: [] }).map((i) => i.field)).toEqual(["title", "projectId"]);
  });

  it("needs competitors, named ones, and criteria", () => {
    expect(getAnalysisIssues(2, meta, { competitors: [], criteria: [] })).toHaveLength(1);
    expect(getAnalysisIssues(2, meta, { competitors: [comp("a", "Untitled competitor")], criteria: [] })).toHaveLength(1);
    expect(getAnalysisIssues(2, meta, { competitors: [A], criteria: [] })).toEqual([]);
    expect(getAnalysisIssues(3, meta, { competitors: [A], criteria: [] })).toHaveLength(1);
    expect(getAnalysisCompletionIssues(meta, { competitors: [A], criteria: [price] })).toEqual([]);
  });

  it("does not require a filled matrix: missing data is allowed", () => {
    expect(getAnalysisCompletionIssues(meta, { competitors: [A, B], criteria: [price, offline] })).toEqual([]);
  });

  it("blocks moving past an incomplete required step", () => {
    expect(firstInvalidAnalysisStepBefore(4, meta, { competitors: [A], criteria: [] })).toBe(3);
    expect(firstInvalidAnalysisStepBefore(2, meta, { competitors: [], criteria: [] })).toBeNull();
  });
});

describe("missing data is never a weakness", () => {
  const cells = [
    cell("a", "k1", { status: "known", value: "$10/month" }),
    cell("b", "k1", { status: "unavailable" }),
    cell("a", "k2", { status: "not_applicable" }),
    // b × k2 has no row at all
  ];

  it("reports unknown, unavailable and unrecorded cells as gaps, and skips not-applicable", () => {
    const gaps = findGaps([A, B], [price, offline], cells);
    expect(gaps.map((g) => `${g.competitor}/${g.criterion}/${g.kind}`).sort()).toEqual(["Bolt/Offline mode/unknown", "Bolt/Pricing/unavailable"]);
  });

  it("turns gaps into factual research suggestions, not judgements", () => {
    const lines = gapSuggestions(findGaps([A, B], [price, offline], cells));
    expect(lines).toEqual(["Pricing: not publicly available for Bolt (look for another source)", "Offline mode: not yet researched for Bolt"].sort((x, y) => lines.indexOf(x) - lines.indexOf(y)));
    for (const line of lines) expect(line).not.toMatch(/weak|poor|lacks|worse/i);
  });

  it("treats a 'known' cell with no detail as a gap too", () => {
    expect(findGaps([A], [price], [cell("a", "k1", { status: "known" })])).toHaveLength(1);
  });

  it("counts coverage per competitor", () => {
    const [a, b] = coverageByCompetitor([A, B], [price, offline], cells);
    expect(a).toMatchObject({ known: 1, notApplicable: 1, unknown: 0, unavailable: 0 });
    expect(b).toMatchObject({ known: 0, unavailable: 1, unknown: 1 });
  });

  it("renders cells with an honest label", () => {
    expect(cellText(undefined)).toBe("Unknown");
    expect(cellText(cell("a", "k1", { status: "unavailable" }))).toBe("Not publicly available");
    expect(cellText(cell("a", "k1", { status: "known", value: "$10" }), "[S1]")).toBe("$10 [S1]");
    // A stale value on a non-known cell is ignored.
    expect(cellText(cell("a", "k1", { status: "unknown", value: "$10" }))).toBe("Unknown");
  });
});

describe("analysis report", () => {
  const sources = [src("s2", "b", { title: "Bolt docs", url: "https://bolt.example/docs", retrieved_on: "" }), src("s1", "a")];
  const cells = [cell("a", "k1", { status: "known", value: "$10/month", source_id: "s1", notes: "Annual billing" }), cell("b", "k1", { status: "unavailable", source_id: "" })];
  const build = (over: Partial<Parameters<typeof buildAnalysisDocument>[0]> = {}) =>
    buildAnalysisDocument({
      analysis: { title: "Invoicing tools", status: "draft", updatedAt: "2026-10-31T10:00:00Z" },
      project: { name: "Budgeto", client: "Acme Co", brief: { description: "Budget app", industry: "Fintech", product_service: "Budgeto", target_audience: "Freelancers", research_objectives: "Find gaps" } },
      preparedBy: "Sam",
      market: { ...emptyMarketContext(), market_category: "Invoicing", overrides: { industry: "Accounting" } },
      content: { ...emptyAnalysis(), strengths: ["Clear pricing"], opportunities: ["Offline support"] },
      competitors: [A, B],
      criteria: [price, offline],
      cells,
      sources,
      ...over,
    });

  it("includes overview, matrix, positioning, differentiation and sources", () => {
    const titles = build({ content: { ...emptyAnalysis(), positioning_summary: "Acme is premium", opportunities: ["Offline support"] } }).sections.map((s) => s.title);
    expect(titles).toEqual(expect.arrayContaining(["Overview", "Competitors", "Comparison matrix", "Research coverage", "Positioning", "Differentiation opportunities", "Sources"]));
  });

  it("numbers sources in competitor order and cites them in the matrix", () => {
    const tags = sourceTags([A, B], sources);
    expect(tags.get("s1")).toBe("[S1]");
    expect(tags.get("s2")).toBe("[S2]");
    const md = renderMarkdown(build());
    expect(md).toContain("$10/month [S1]");
    expect(md).toContain("https://acme.example/pricing");
    expect(md).toContain("Not recorded");
  });

  it("records the retrieval date of a source", () => {
    expect(renderMarkdown(build())).toContain("1 October 2026");
  });

  it("reuses the project context but honours this analysis's override, without touching the project", () => {
    const md = renderMarkdown(build());
    expect(md).toContain("Accounting");
    expect(md).toContain("Freelancers");
    expect(md).not.toMatch(/Fintech/);
  });

  it("marks the analysis section as interpretation, not fact", () => {
    expect(renderMarkdown(build())).toMatch(/researcher's interpretation/);
  });

  it("adds gap-derived suggestions under further research", () => {
    expect(renderMarkdown(build())).toMatch(/Areas requiring further research[\s\S]*not yet researched for Acme, Bolt/);
  });

  it("explains unknown versus unavailable in the report", () => {
    expect(renderMarkdown(build())).toMatch(/Unknown.*not yet researched/);
  });

  it("renders to Word and PDF", async () => {
    const doc = build();
    const zip = await JSZip.loadAsync(await renderDocx(doc));
    expect(await zip.file("word/document.xml")!.async("string")).toContain("Comparison matrix");
    const pdf = await renderPdf(doc);
    const { text } = await extractText(await getDocumentProxy(new Uint8Array(pdf)), { mergePages: true });
    expect(text).toContain("Invoicing tools");
    expect(text).toContain("Acme");
  });

  it("handles an analysis with nothing in it yet", () => {
    const doc = build({ competitors: [], criteria: [], cells: [], sources: [], content: emptyAnalysis() });
    expect(doc.sections.map((s) => s.title)).toEqual(["Overview"]);
  });
});

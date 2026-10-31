import JSZip from "jszip";
import { extractText, getDocumentProxy } from "unpdf";
import { describe, expect, it } from "vitest";
import { DEFAULT_POSITIONS } from "@/lib/research-planner/constants";
import { buildPlanDocument } from "@/lib/research-planner/document";
import { renderDocx } from "@/lib/research-planner/export/docx";
import { renderMarkdown } from "@/lib/research-planner/export/markdown";
import { pdfSafe, renderPdf } from "@/lib/research-planner/export/pdf";
import { fullPlanInput, goals } from "./fixtures/plan";

const doc = () => buildPlanDocument(fullPlanInput());

describe("document model", () => {
  it("follows the required section structure", () => {
    expect(doc().sections.map((s) => s.title)).toEqual([
      "Project context",
      "Research goals",
      "Methodology",
      "Participants",
      "Research materials",
      "Interview discussion guide",
      "Interview questions",
      "Survey questions",
      "Usability testing tasks",
      "Task scenarios",
      "Pre-test questions",
      "Post-test questions",
      "Observation checklist",
      "Logistics",
      "Deliverables",
    ]);
  });

  it("includes cover metadata", () => {
    const meta = Object.fromEntries(doc().meta.map((m) => [m.label, m.value]));
    expect(meta).toMatchObject({
      Project: "Budgeto",
      Client: "Acme | Co",
      Industry: "Fintech",
      "Prepared by": "Maya Patel",
      Status: "Draft",
      "Last updated": "31 October 2026",
    });
  });

  it("only includes materials relevant to the selected methods", () => {
    const input = fullPlanInput();
    input.sections.methods = { content: { selected: ["surveys"] }, position: DEFAULT_POSITIONS.methods };
    const titles = buildPlanDocument(input).sections.map((s) => s.title);
    expect(titles).toContain("Survey questions");
    expect(titles).not.toContain("Interview discussion guide");
    expect(titles).not.toContain("Usability testing tasks");
    expect(titles).not.toContain("Observation checklist");
  });

  it("leaves out empty sections and empty optional fields", () => {
    const input = fullPlanInput();
    input.sections.participants = { content: { profile: "Only a profile" }, position: 30 };
    input.sections.logistics = { content: {}, position: 120 };
    const d = buildPlanDocument(input);
    expect(d.sections.find((s) => s.key === "logistics")).toBeUndefined();
    expect(d.sections.find((s) => s.key === "deliverables")).toBeUndefined();
    const participants = d.sections.find((s) => s.key === "participants")!;
    expect(participants.blocks).toHaveLength(1);
    expect(participants.blocks[0]).toMatchObject({ type: "table", rows: [["Participant profile", "Only a profile"]] });
  });

  it("respects custom section order", () => {
    const input = fullPlanInput();
    input.sections.logistics!.position = 5;
    input.sections.goals!.position = 25;
    const keys = buildPlanDocument(input).sections.map((s) => s.key);
    expect(keys.indexOf("logistics")).toBeLessThan(keys.indexOf("context") + 3);
    expect(keys.indexOf("methods")).toBeLessThan(keys.indexOf("goals"));
    // Deliverables always follow logistics.
    expect(keys[keys.indexOf("logistics") + 1]).toBe("deliverables");
  });

  it("falls back safely for corrupt stored content", () => {
    const input = fullPlanInput();
    input.sections.goals = { content: { primary_goal: 42, objectives: "nope" }, position: 10 };
    expect(() => buildPlanDocument(input)).not.toThrow();
  });

  it("shows a placeholder title for blank titles", () => {
    expect(buildPlanDocument(fullPlanInput({ title: "   " })).title).toBe("Untitled research plan");
  });
});

describe("Markdown export", () => {
  const md = renderMarkdown(doc());

  it("uses semantic headings in order", () => {
    const headings = md.split("\n").filter((l) => /^#{1,3} /.test(l));
    expect(headings[0]).toBe("# Onboarding research plan");
    expect(headings).toContain("## Project context");
    expect(headings).toContain("### Primary research goal");
    expect(headings.indexOf("## Methodology")).toBeGreaterThan(headings.indexOf("## Research goals"));
    expect(headings.indexOf("## Deliverables")).toBeGreaterThan(headings.indexOf("## Logistics"));
  });

  it("contains every user-entered value", () => {
    for (const expected of [
      "A budgeting app for freelancers.",
      "It syncs with bank accounts.",
      "Seed-stage startup, 12k monthly active users.",
      goals.primary_goal,
      ...goals.objectives,
      ...goals.research_questions,
      "Freelances at least 20 hours per week",
      "Works for a competitor",
      "Customer email list",
      "Insights report",
      "Over-recruit by 30%",
      "To understand reasons behind drop-off",
    ]) {
      expect(md, expected).toContain(expected);
    }
  });

  it("renders lists and tables with standard syntax", () => {
    expect(md).toContain("1. Why do users abandon onboarding?");
    expect(md).toContain("- Identify the main barriers to connecting a bank account");
    expect(md).toContain("| Aspect | Detail |");
    expect(md).toContain("| --- | --- |");
  });

  it("escapes pipes inside table cells", () => {
    const input = fullPlanInput();
    input.sections.participants = { content: { profile: "A | B" }, position: 30 };
    expect(renderMarkdown(buildPlanDocument(input))).toContain("| Participant profile | A \\| B |");
  });

  it("contains no application-specific markup or raw HTML", () => {
    expect(md).not.toMatch(/<\/?[a-z][^>]*>/i);
    expect(md).not.toMatch(/data-|className|undefined|\[object Object\]/);
  });

  it("escapes text that would otherwise become Markdown structure", () => {
    const input = fullPlanInput();
    input.sections.context = { content: { product_description: "# Not a heading\n- not a list" }, position: 0 };
    const out = renderMarkdown(buildPlanDocument(input));
    expect(out).toContain("\\# Not a heading");
    expect(out).toContain("\\- not a list");
  });

  it("is deterministic", () => {
    expect(renderMarkdown(doc())).toBe(md);
  });
});

describe("DOCX export", () => {
  it("produces a valid, structured Word document", async () => {
    const buf = await renderDocx(doc());
    expect(buf.subarray(0, 2).toString()).toBe("PK");
    const zip = await JSZip.loadAsync(buf);
    expect(Object.keys(zip.files)).toEqual(expect.arrayContaining(["word/document.xml", "word/styles.xml", "word/numbering.xml"]));

    const xml = await zip.file("word/document.xml")!.async("string");
    expect(xml).toContain('w:val="Title"');
    expect(xml).toContain('w:val="Heading1"');
    expect(xml).toContain('w:val="Heading2"');
    expect(xml).toContain("<w:tbl>");
    expect(xml).toContain("<w:pageBreakBefore");
    expect(xml).toContain("w:tblHeader");

    const plain = xml.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
    for (const expected of ["Onboarding research plan", "Maya Patel", goals.primary_goal, "Interview discussion guide", "Insights report", "Over-recruit by 30%", "Acme | Co"]) {
      expect(plain, expected).toContain(expected);
    }
  });

  it("uses distinct numbering instances so each numbered list restarts at 1", async () => {
    const zip = await JSZip.loadAsync(await renderDocx(doc()));
    const numbering = await zip.file("word/numbering.xml")!.async("string");
    expect((numbering.match(/<w:num /g) ?? []).length).toBeGreaterThan(3);
  });
});

describe("PDF export", () => {
  it("renders a multi-page PDF containing the plan content", async () => {
    const buf = await renderPdf(doc());
    expect(buf.subarray(0, 5).toString()).toBe("%PDF-");
    const pdf = await getDocumentProxy(new Uint8Array(buf));
    const { text, totalPages } = await extractText(pdf, { mergePages: true });
    expect(totalPages).toBeGreaterThanOrEqual(3);
    const flat = text.replace(/\s+/g, " ");
    for (const expected of ["Onboarding research plan", "Budgeto", "Project context", "Research goals", "Methodology", "Participants", "Research materials", "Logistics", "Deliverables", goals.primary_goal, "Insights report"]) {
      expect(flat, expected).toContain(expected);
    }
    // Footer: document title and "Page N of M" on content pages (regression: lineHeight on Page dropped it).
    expect(flat).toMatch(/Page 2 of \d+/);
    expect(flat.match(/Onboarding research plan/g)!.length).toBeGreaterThanOrEqual(totalPages - 1);
  });

  it("replaces characters the standard fonts cannot draw", () => {
    expect(pdfSafe("Café “quotes” – dash … 😀 日本")).toBe("Café “quotes” – dash … ? ??");
    expect(pdfSafe("a\u0000b\tc")).toBe("ab c");
  });
});

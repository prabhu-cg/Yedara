import JSZip from "jszip";
import { extractText, getDocumentProxy } from "unpdf";
import { afterEach, describe, expect, it } from "vitest";
import { AI_ASSUMPTION_LABEL, disabledPersonaAi, getPersonaAi, setPersonaAi } from "@/lib/ai/persona-ai";
import { PERSONA_SECTION_KEYS, PERSONA_TYPE_INFO } from "@/lib/personas/constants";
import { buildComparison, commonItems } from "@/lib/personas/compare";
import { buildPersonaDocument } from "@/lib/personas/document";
import { emptyPersonaContent, evidenceInputSchema, normalizePersonaContent, personaMetaSchema, type EvidenceRow, type PersonaContent } from "@/lib/personas/schemas";
import { evidenceStatement, firstInvalidPersonaStepBefore, getPersonaCompletionIssues, getPersonaIssues, summariseEvidence } from "@/lib/personas/validation";
import { renderDocx } from "@/lib/research-planner/export/docx";
import { renderMarkdown } from "@/lib/research-planner/export/markdown";
import { renderPdf } from "@/lib/research-planner/export/pdf";

afterEach(() => setPersonaAi(disabledPersonaAi));

const PROJECT_ID = "11111111-1111-4111-8111-111111111111";
const content = (): PersonaContent => Object.fromEntries(PERSONA_SECTION_KEYS.map((k) => [k, emptyPersonaContent(k)])) as PersonaContent;
const ev = (over: Partial<EvidenceRow> & Pick<EvidenceRow, "id" | "kind">): EvidenceRow => ({
  content: "Something",
  source_label: "",
  source_url: "",
  participant_ref: "",
  confidence: "",
  validation_status: "unvalidated",
  origin: "manual",
  position: 0,
  ...over,
});

function fullContent() {
  const c = content();
  c.profile.background = "Freelance designer working from home";
  c.profile.role = "Designer";
  c.behaviour.goals = ["Get paid on time"];
  c.behaviour.pain_points = ["Chasing invoices"];
  c.output.headline = "Time-poor freelancer";
  return c;
}

describe("persona schemas", () => {
  it("requires a name and a real project id", () => {
    expect(personaMetaSchema.safeParse({ name: "  ", projectId: PROJECT_ID, personaType: "hypothesis" }).success).toBe(false);
    expect(personaMetaSchema.safeParse({ name: "Maya", projectId: "nope", personaType: "hypothesis" }).success).toBe(false);
    expect(personaMetaSchema.safeParse({ name: "Maya", projectId: PROJECT_ID, personaType: "made-up" }).success).toBe(false);
    expect(personaMetaSchema.safeParse({ name: "Maya", projectId: PROJECT_ID, personaType: "proto" }).success).toBe(true);
  });

  it("accepts the three persona types only", () => {
    for (const personaType of ["research_backed", "hypothesis", "proto"]) {
      expect(personaMetaSchema.safeParse({ name: "Maya", projectId: PROJECT_ID, personaType }).success).toBe(true);
    }
  });

  it("validates evidence input and rejects malformed links", () => {
    expect(evidenceInputSchema.safeParse({ kind: "quote", content: "" }).success).toBe(false);
    expect(evidenceInputSchema.safeParse({ kind: "quote", content: "Hi", source_url: "javascript:alert(1)" }).success).toBe(false);
    expect(evidenceInputSchema.safeParse({ kind: "research_source", content: "Interviews", source_url: "https://example.com/r" }).success).toBe(true);
  });

  it("normalises missing or corrupt stored content to an empty section", () => {
    expect(normalizePersonaContent("behaviour", null)).toEqual(emptyPersonaContent("behaviour"));
    expect(normalizePersonaContent("behaviour", { goals: "not a list" })).toEqual(emptyPersonaContent("behaviour"));
  });
});

describe("persona evidence rules", () => {
  const meta = (type: "research_backed" | "hypothesis" | "proto") => ({ name: "Maya", projectId: PROJECT_ID, type });
  const data = (evidence: EvidenceRow[], c = fullContent()) => ({ context: c.context, profile: c.profile, behaviour: c.behaviour, evidence });

  it("a hypothesis can be completed without any research", () => {
    expect(getPersonaCompletionIssues(meta("hypothesis"), data([]))).toEqual([]);
    expect(getPersonaCompletionIssues(meta("proto"), data([]))).toEqual([]);
  });

  it("a research-backed persona needs a source and supporting evidence", () => {
    const messages = getPersonaIssues(5, meta("research_backed"), data([])).map((i) => i.message);
    expect(messages).toEqual(expect.arrayContaining([expect.stringMatching(/research source/), expect.stringMatching(/observation or quote/)]));
    const ok = [ev({ id: "s", kind: "research_source" }), ev({ id: "o", kind: "observation" })];
    expect(getPersonaIssues(5, meta("research_backed"), data(ok))).toEqual([]);
  });

  it("every quote needs a source, whatever the persona type", () => {
    const quote = ev({ id: "q", kind: "quote", content: "I hate invoices" });
    expect(getPersonaIssues(5, meta("hypothesis"), data([quote]))).toHaveLength(1);
    expect(getPersonaIssues(5, meta("hypothesis"), data([{ ...quote, source_label: "Interview 3" }]))).toEqual([]);
  });

  it("demographics need a justification", () => {
    const c = fullContent();
    c.profile.demographics = [{ label: "Age", value: "34" }];
    expect(getPersonaIssues(2, meta("hypothesis"), data([], c)).map((i) => i.field)).toContain("demographics_justification");
    c.profile.demographics_justification = "Pricing is age-banded";
    expect(getPersonaIssues(2, meta("hypothesis"), data([], c))).toEqual([]);
  });

  it("blocks moving past an incomplete required step", () => {
    const empty = content();
    expect(firstInvalidPersonaStepBefore(4, { name: "", projectId: null, type: "hypothesis" }, { context: empty.context, profile: empty.profile, behaviour: empty.behaviour, evidence: [] })).toBe(1);
  });

  it("states what a persona rests on without overclaiming", () => {
    const none = summariseEvidence([]);
    expect(evidenceStatement("research_backed", none)).toMatch(/no research source/i);
    expect(evidenceStatement("hypothesis", none)).toBe("Not validated with users.");
    const some = summariseEvidence([ev({ id: "a", kind: "assumption" }), ev({ id: "b", kind: "assumption", validation_status: "validated" })]);
    expect(evidenceStatement("hypothesis", some)).toMatch(/1 assumption or hypothesis is still unvalidated/);
  });
});

describe("persona document and exports", () => {
  const build = (type: "research_backed" | "hypothesis" | "proto", evidence: EvidenceRow[] = [], c = fullContent()) =>
    buildPersonaDocument({
      persona: { name: "Maya", type, status: "draft", updatedAt: "2026-10-31T10:00:00Z" },
      project: { name: "Budgeto", client: "Acme", brief: { description: null, industry: "Fintech", product_service: "Budgeto", target_audience: "Freelancers", research_objectives: null } },
      preparedBy: "Sam",
      content: c,
      evidence,
    });

  it("leads with the persona type and an honest evidence status", () => {
    for (const type of ["research_backed", "hypothesis", "proto"] as const) {
      const doc = build(type);
      expect(doc.sections[0].title).toBe("Evidence status");
      expect(JSON.stringify(doc.sections[0])).toContain(PERSONA_TYPE_INFO[type].notice);
      expect(doc.meta.find((m) => m.label === "Persona type")?.value).toBe(PERSONA_TYPE_INFO[type].label);
    }
  });

  it("withholds demographics that have no justification", () => {
    const c = fullContent();
    c.profile.demographics = [{ label: "Age", value: "34" }];
    const text = renderMarkdown(build("hypothesis", [], c));
    expect(text).not.toContain("34");
    expect(text).toMatch(/no justification/);
    c.profile.demographics_justification = "Pricing is age-banded";
    expect(renderMarkdown(build("hypothesis", [], c))).toContain("34");
  });

  it("never invents quotes: only recorded ones appear, with their source", () => {
    const md = renderMarkdown(build("research_backed", [ev({ id: "q", kind: "quote", content: "I chase every invoice", source_label: "Interview 3" })]));
    expect(md).toContain("I chase every invoice");
    expect(md).toContain("Interview 3");
    expect(renderMarkdown(build("hypothesis"))).not.toMatch(/Participant quotes/);
  });

  it("labels AI-origin assumptions", () => {
    const md = renderMarkdown(build("hypothesis", [ev({ id: "a", kind: "assumption", content: "Prefers mobile", origin: "ai" })]));
    expect(md).toContain(AI_ASSUMPTION_LABEL);
    expect(md).toMatch(/Unvalidated/);
  });

  it("renders to Markdown, Word and PDF", async () => {
    const doc = build("hypothesis", [ev({ id: "a", kind: "assumption", content: "Works late" })]);
    expect(renderMarkdown(doc)).toContain("# Maya");

    const zip = await JSZip.loadAsync(await renderDocx(doc));
    expect(await zip.file("word/document.xml")!.async("string")).toContain("Evidence status");

    const pdf = await renderPdf(doc);
    const { text } = await extractText(await getDocumentProxy(new Uint8Array(pdf)), { mergePages: true });
    expect(text).toContain("Maya");
    expect(text).toContain("hypothesis");
  });
});

describe("persona comparison", () => {
  it("finds items every persona shares, ignoring case and spacing", () => {
    expect(commonItems([["Save time", "Get paid"], ["get  paid", "Learn"]])).toEqual(["Get paid"]);
    expect(commonItems([["Only one"]])).toEqual([]);
  });

  it("builds side-by-side rows including type and evidence", () => {
    const a = fullContent();
    const b = fullContent();
    b.behaviour.goals = ["get paid on time", "Grow"];
    const { rows, common } = buildComparison([
      { id: "1", name: "A", type: "hypothesis", projectName: "P", content: a, evidence: [] },
      { id: "2", name: "B", type: "research_backed", projectName: "P", content: b, evidence: [] },
    ]);
    expect(rows.find((r) => r.key === "type")).toMatchObject({ cells: ["Hypothesis", "Research-backed"] });
    expect(common.goals).toEqual(["Get paid on time"]);
  });
});

describe("persona AI readiness", () => {
  it("is disabled by default", async () => {
    expect(getPersonaAi().enabled).toBe(false);
    expect(await getPersonaAi().suggestAssumptions({ personaName: "Maya", brief: null })).toMatchObject({ ok: false, reason: "disabled" });
  });
});

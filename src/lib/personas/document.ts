import type { Block, DocSection, PlanDocument } from "@/lib/research-planner/document";
import { formatDocDate } from "@/lib/research-planner/document";
import {
  CONFIDENCE_LABELS,
  EXPERIENCE_LABELS,
  PERSONA_TYPE_INFO,
  VALIDATION_LABELS,
  type PersonaType,
} from "@/lib/personas/constants";
import type { EvidenceRow, PersonaContent } from "@/lib/personas/schemas";
import { evidenceStatement, hasDemographics, summariseEvidence } from "@/lib/personas/validation";
import { AI_ASSUMPTION_LABEL } from "@/lib/ai/persona-ai";
import { resolveSharedContext, SHARED_FIELD_LABELS, type ProjectBrief } from "@/lib/shared-context";

export type PersonaDocumentInput = {
  persona: { name: string; type: PersonaType; status: "draft" | "completed"; updatedAt: string };
  project: { name: string; client: string | null; brief: ProjectBrief } | null;
  preparedBy?: string | null;
  content: PersonaContent;
  evidence: EvidenceRow[];
};

const t = (s: string) => s.trim();
const clean = (items: string[]) => items.map(t).filter(Boolean);

const para = (heading: string, value: string): Block[] =>
  t(value) ? [{ type: "heading", text: heading }, { type: "paragraph", text: t(value) }] : [];
const bullets = (heading: string, items: string[]): Block[] =>
  clean(items).length ? [{ type: "heading", text: heading }, { type: "list", ordered: false, items: clean(items) }] : [];
const kv = (rows: [string, string][]): Block[] => {
  const kept = rows.filter(([, v]) => t(v));
  return kept.length ? [{ type: "table", headers: ["Aspect", "Detail"], rows: kept.map(([a, b]) => [a, t(b)]), widths: [3, 7] }] : [];
};

function evidenceBlocks(evidence: EvidenceRow[], summary: PersonaContent["evidence"]): Block[] {
  const of = (kind: EvidenceRow["kind"]) => evidence.filter((e) => e.kind === kind);
  const confidence = (e: EvidenceRow) => (e.confidence ? CONFIDENCE_LABELS[e.confidence] : "");
  const blocks: Block[] = [];

  const sources = of("research_source");
  if (sources.length) {
    blocks.push({ type: "heading", text: "Research sources" });
    blocks.push({
      type: "table",
      headers: ["Source", "Details", "Confidence", "Link"],
      rows: sources.map((s) => [t(s.source_label) || "—", t(s.content), confidence(s) || "—", t(s.source_url) || "—"]),
      widths: [2.4, 4.2, 1.6, 2.8],
    });
  }

  const observations = of("observation");
  if (observations.length) {
    blocks.push({ type: "heading", text: "Supporting observations" });
    blocks.push({
      type: "list",
      ordered: false,
      items: observations.map((o) => {
        const meta = [t(o.source_label) && `Source: ${t(o.source_label)}`, confidence(o)].filter(Boolean);
        return meta.length ? { text: t(o.content), children: [meta.join(" · ")] } : t(o.content);
      }),
    });
  }

  const quotes = of("quote");
  if (quotes.length) {
    blocks.push({ type: "heading", text: "Participant quotes" });
    blocks.push({
      type: "list",
      ordered: false,
      items: quotes.map((q) => {
        const meta = [
          t(q.source_label) ? `Source: ${t(q.source_label)}` : "Source missing: not yet attributable",
          t(q.participant_ref) && `Participant: ${t(q.participant_ref)}`,
          confidence(q),
        ].filter(Boolean) as string[];
        return { text: `“${t(q.content)}”`, children: [meta.join(" · ")] };
      }),
    });
  }

  if (summary.overall_confidence) blocks.push(...kv([["Overall evidence confidence", CONFIDENCE_LABELS[summary.overall_confidence]]]));
  blocks.push(...para("Notes on the evidence", summary.summary_notes), ...para("Limitations", summary.limitations));
  return blocks;
}

function assumptionBlocks(evidence: EvidenceRow[]): Block[] {
  const line = (e: EvidenceRow) =>
    `${t(e.content)} [${VALIDATION_LABELS[e.validation_status]}]${e.origin === "ai" ? `. ${AI_ASSUMPTION_LABEL}` : ""}`;
  const assumptions = evidence.filter((e) => e.kind === "assumption");
  const hypotheses = evidence.filter((e) => e.kind === "hypothesis");
  return [
    ...(assumptions.length ? [{ type: "heading", text: "Assumptions" } as Block, { type: "list", ordered: false, items: assumptions.map(line) } as Block] : []),
    ...(hypotheses.length ? [{ type: "heading", text: "Unvalidated hypotheses" } as Block, { type: "list", ordered: false, items: hypotheses.map(line) } as Block] : []),
  ];
}

/**
 * Builds the persona document used by the preview and by every export. The persona's type and an
 * honest statement of its evidence always come first, so a hypothesis can never pass as research.
 */
export function buildPersonaDocument(input: PersonaDocumentInput): PlanDocument {
  const { persona, project, content, evidence } = input;
  const info = PERSONA_TYPE_INFO[persona.type];
  const summary = summariseEvidence(evidence);
  const ctx = resolveSharedContext(project?.brief ?? null, content.context.overrides);

  const sections: DocSection[] = [];
  const push = (key: string, title: string, blocks: Block[]) => blocks.length && sections.push({ key, title, blocks });

  push("status", "Evidence status", [
    { type: "paragraph", text: info.notice },
    { type: "paragraph", text: evidenceStatement(persona.type, summary) },
  ]);

  push("overview", "Overview", [
    ...para("Headline", content.output.headline),
    ...para("Summary", content.output.summary),
    ...kv([
      ["Audience segment", content.context.audience_segment],
      ["Product or service", ctx.product_service.value],
      ["Industry", ctx.industry.value],
      ["Target audience", ctx.target_audience.value],
      ["Research objectives", ctx.research_objectives.value],
    ]),
  ]);

  const p = content.profile;
  const demographics: Block[] = !hasDemographics(p)
    ? []
    : t(p.demographics_justification)
      ? [
          { type: "heading", text: "Demographic details" },
          { type: "table", headers: ["Detail", "Value"], rows: p.demographics.filter((d) => t(d.value)).map((d) => [t(d.label) || "—", t(d.value)]), widths: [3, 7] },
          { type: "paragraph", text: `Why these details matter to the research: ${t(p.demographics_justification)}` },
        ]
      : [{ type: "paragraph", text: "Demographic details were entered but are left out of this document because no justification for them was recorded." }];
  push("profile", "Profile", [
    ...kv([
      ["Background", p.background],
      ["Role or occupation", p.role],
      ["Experience level", p.experience_level ? EXPERIENCE_LABELS[p.experience_level] : ""],
      ["Context of use", p.context_of_use],
    ]),
    ...demographics,
  ]);

  const b = content.behaviour;
  push("behaviour", "Goals and behaviours", [
    ...bullets("Goals", b.goals),
    ...bullets("Needs", b.needs),
    ...bullets("Motivations", b.motivations),
    ...bullets("Behaviours", b.behaviours),
    ...bullets("Preferences", b.preferences),
    ...bullets("Pain points", b.pain_points),
    ...bullets("Frustrations", b.frustrations),
    ...bullets("Barriers", b.barriers),
  ]);

  const n = content.needs;
  const jobs = n.jobs.filter((j) => t(j.situation) || t(j.motivation) || t(j.outcome));
  push("needs", "User needs", [
    ...(jobs.length
      ? ([
          { type: "heading", text: "Jobs to be done" },
          { type: "table", headers: ["When (situation)", "I want to (motivation)", "So I can (outcome)"], rows: jobs.map((j) => [t(j.situation) || "—", t(j.motivation) || "—", t(j.outcome) || "—"]) },
        ] as Block[])
      : []),
    ...bullets("Functional needs", n.functional_needs),
    ...bullets("Emotional needs", n.emotional_needs),
    ...bullets("Desired outcomes", n.desired_outcomes),
    ...bullets("Current alternatives", n.alternatives),
    ...bullets("Workarounds", n.workarounds),
  ]);

  push("evidence", "Evidence", evidenceBlocks(evidence, content.evidence));
  push("assumptions", "Assumptions and unvalidated hypotheses", assumptionBlocks(evidence));

  const meta = [
    { label: "Persona type", value: info.label },
    { label: "Project", value: project?.name ?? "" },
    { label: "Client", value: project?.client ?? "" },
    { label: "Prepared by", value: input.preparedBy ?? "" },
    { label: "Status", value: persona.status === "completed" ? "Completed" : "Draft" },
    { label: "Last updated", value: formatDocDate(persona.updatedAt) },
  ].filter((m) => m.value.trim());

  return { title: t(persona.name) || "Untitled persona", kicker: "Persona", meta, sections };
}

/** Labels for the shared fields, re-exported for the UI. */
export { SHARED_FIELD_LABELS };

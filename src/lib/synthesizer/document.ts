import type { Block, DocSection, PlanDocument } from "@/lib/research-planner/document";
import { formatDocDate } from "@/lib/research-planner/document";
import {
  CONFIDENCE_LABELS,
  INSIGHT_KIND_INFO,
  OBSERVATION_KIND_LABELS,
  PROBLEM_KIND_LABELS,
  SOURCE_TYPE_LABELS,
  SYNTHESIS_REPORT_NOTE,
  UNGROUPED_LABEL,
} from "@/lib/synthesizer/constants";
import type { CardRow, InsightRow, ObservationRow, ReportContent, SourceRow, ThemeRow } from "@/lib/synthesizer/schemas";

export type SynthesisDocumentInput = {
  synthesis: { title: string; status: "draft" | "completed"; updatedAt: string };
  project: { name: string; client: string | null } | null;
  preparedBy?: string | null;
  report: ReportContent;
  sources: SourceRow[];
  observations: ObservationRow[];
  themes: ThemeRow[];
  cards: CardRow[];
  insights: InsightRow[];
};

const t = (s: string | null | undefined) => (s ?? "").trim();
const NONE = "Not added yet.";
const para = (value: string): Block[] => [{ type: "paragraph", text: t(value) || NONE }];
const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

/** Stable references (O1, O2...) for observations, in the order they were collected. */
export function observationRefs(observations: ObservationRow[]) {
  const ordered = [...observations].sort((a, b) => a.position - b.position || a.created_at.localeCompare(b.created_at));
  return new Map(ordered.map((o, i) => [o.id, `O${i + 1}`]));
}

export function buildSynthesisDocument(input: SynthesisDocumentInput): PlanDocument {
  const { report, sources, observations, themes, cards, insights } = input;
  const refs = observationRefs(observations);
  const byId = new Map(observations.map((o) => [o.id, o]));
  const sourceName = new Map(sources.map((s) => [s.id, s.name]));
  const themeTitle = new Map(themes.map((th) => [th.id, th.title]));
  const refList = (ids: string[]) => ids.map((id) => refs.get(id)).filter(Boolean).sort((a, b) => Number(a!.slice(1)) - Number(b!.slice(1))).join(", ");
  const participants = new Map<string, number>();
  for (const o of observations) if (t(o.participant_ref)) participants.set(t(o.participant_ref), (participants.get(t(o.participant_ref)) ?? 0) + 1);
  for (const s of sources) if (t(s.participant_ref) && !participants.has(t(s.participant_ref))) participants.set(t(s.participant_ref), 0);

  const sections: DocSection[] = [];

  sections.push({
    key: "overview",
    title: "Research overview",
    blocks: [
      ...para(report.overview),
      {
        type: "paragraph",
        text: `This synthesis rests on ${plural(observations.length, "observation")} from ${plural(sources.length, "source")} and ${plural(participants.size, "participant")}, organised into ${plural(themes.length, "theme")} with ${plural(insights.length, "insight")}.`,
      },
    ],
  });

  sections.push({
    key: "methodology",
    title: "Methodology",
    blocks: [
      ...para(report.methodology),
      ...(sources.length
        ? ([{
            type: "table",
            headers: ["Source", "Type", "Date", "Participant"],
            rows: sources.map((s) => [s.name, SOURCE_TYPE_LABELS[s.source_type], s.conducted_on ?? "—", t(s.participant_ref) || "—"]),
            widths: [4, 2.5, 2, 2],
          }] as Block[])
        : []),
    ],
  });

  sections.push({
    key: "participants",
    title: "Participants",
    blocks: [
      ...(t(report.participantsNote) ? para(report.participantsNote) : []),
      participants.size
        ? { type: "list", ordered: false, items: [...participants].map(([ref, n]) => `${ref}${n ? ` (${plural(n, "observation")})` : ""}`) }
        : { type: "paragraph", text: "No participant references were recorded." },
    ],
  });

  const themeBlocks: Block[] = [];
  const cardTheme = new Map(cards.map((c) => [c.observation_id, c]));
  const inTheme = (themeId: string | null) =>
    observations
      .filter((o) => (cardTheme.get(o.id)?.theme_id ?? null) === themeId)
      .sort((a, b) => (cardTheme.get(a.id)?.position ?? 0) - (cardTheme.get(b.id)?.position ?? 0));
  const describe = (o: ObservationRow) => {
    const meta = [refs.get(o.id), t(o.participant_ref), o.source_id ? sourceName.get(o.source_id) : "", o.tags.length ? o.tags.join(", ") : ""].filter(Boolean);
    return { text: t(o.content), children: [`${OBSERVATION_KIND_LABELS[o.kind]} · ${meta.join(" · ")}`] };
  };
  for (const theme of themes) {
    const list = inTheme(theme.id);
    themeBlocks.push({ type: "heading", text: `${theme.title} (${plural(list.length, "observation")})` });
    if (t(theme.notes)) themeBlocks.push({ type: "paragraph", text: t(theme.notes) });
    themeBlocks.push(list.length ? { type: "list", ordered: false, items: list.map(describe) } : { type: "paragraph", text: "No observations are grouped under this theme." });
  }
  const loose = inTheme(null);
  if (loose.length) themeBlocks.push({ type: "paragraph", text: `${UNGROUPED_LABEL}: ${plural(loose.length, "observation")} (${refList(loose.map((o) => o.id))}).` });
  sections.push({ key: "themes", title: "Key themes", blocks: themeBlocks.length ? themeBlocks : [{ type: "paragraph", text: "No themes have been created yet." }] });

  const cited = [...new Set(insights.flatMap((i) => i.evidence_ids))].filter((id) => byId.has(id));
  sections.push({
    key: "evidence",
    title: "Supporting observations",
    blocks: cited.length
      ? [
          { type: "paragraph", text: "The observations cited as evidence by the insights below." },
          {
            type: "table",
            headers: ["Ref", "Observation", "Participant", "Source"],
            rows: cited
              .sort((a, b) => Number(refs.get(a)!.slice(1)) - Number(refs.get(b)!.slice(1)))
              .map((id) => { const o = byId.get(id)!; return [refs.get(id)!, t(o.content), t(o.participant_ref) || "—", (o.source_id && sourceName.get(o.source_id)) || "—"]; }),
            widths: [1, 6, 1.6, 2.4],
          },
        ]
      : [{ type: "paragraph", text: "No observations have been cited as evidence yet." }],
  });

  const insightBlocks: Block[] = [{ type: "paragraph", text: SYNTHESIS_REPORT_NOTE }];
  insights.forEach((i, n) => {
    const info = INSIGHT_KIND_INFO[i.kind];
    insightBlocks.push({ type: "heading", text: `Insight ${n + 1}: ${info.label} · ${CONFIDENCE_LABELS[i.confidence]}` });
    const rows: [string, string][] = [
      ["Insight", t(i.statement)],
      ["Observation", t(i.observation)],
      ["Pattern or theme", [i.theme_id ? themeTitle.get(i.theme_id) : "", t(i.pattern)].filter(Boolean).join(": ")],
      ["User need", t(i.user_need)],
      [i.problem_kind ? PROBLEM_KIND_LABELS[i.problem_kind] : "Problem or opportunity", t(i.problem_text)],
      ["Recommended action", t(i.recommended_action)],
      ["Evidence", i.evidence_ids.length ? refList(i.evidence_ids) : "No evidence linked yet"],
    ];
    insightBlocks.push({ type: "table", headers: ["Aspect", "Detail"], rows: rows.filter(([, v]) => t(v)), widths: [3, 7] });
  });
  sections.push({ key: "insights", title: "Insights", blocks: insights.length ? insightBlocks : [{ type: "paragraph", text: "No insights have been written yet." }] });

  const needs = insights.filter((i) => t(i.user_need));
  sections.push({
    key: "needs",
    title: "User needs",
    blocks: needs.length ? [{ type: "list", ordered: false, items: needs.map((i) => ({ text: t(i.user_need), children: [`From insight ${insights.indexOf(i) + 1} · evidence ${refList(i.evidence_ids) || "none linked"}`] })) }] : [{ type: "paragraph", text: "No user needs have been recorded." }],
  });

  const pains = insights.filter((i) => i.problem_kind === "problem" && t(i.problem_text));
  sections.push({
    key: "pain-points",
    title: "Pain points",
    blocks: [
      ...(t(report.painPointsNote) ? para(report.painPointsNote) : []),
      pains.length ? { type: "list", ordered: false, items: pains.map((i) => ({ text: t(i.problem_text), children: [`Insight ${insights.indexOf(i) + 1} · evidence ${refList(i.evidence_ids) || "none linked"}`] })) } : { type: "paragraph", text: "No problems have been recorded." },
    ],
  });

  const recs = insights.filter((i) => i.kind === "recommendation" || t(i.recommended_action));
  sections.push({
    key: "recommendations",
    title: "Recommendations",
    blocks: [
      ...(t(report.recommendationsNote) ? para(report.recommendationsNote) : []),
      recs.length
        ? { type: "list", ordered: false, items: recs.map((i) => ({ text: t(i.recommended_action) || t(i.statement), children: [`${INSIGHT_KIND_INFO[i.kind].label} · ${CONFIDENCE_LABELS[i.confidence]} · evidence ${refList(i.evidence_ids) || "none linked"}`] })) }
        : { type: "paragraph", text: "No recommendations have been recorded." },
    ],
  });

  const noEvidence = insights.filter((i) => i.evidence_ids.length === 0).length;
  const low = insights.filter((i) => i.confidence === "low").length;
  const facts = [
    noEvidence ? `${plural(noEvidence, "insight")} ${noEvidence === 1 ? "has" : "have"} no linked evidence.` : "",
    low ? `${plural(low, "insight")} ${low === 1 ? "is" : "are"} marked low confidence.` : "",
    loose.length ? `${plural(loose.length, "observation")} ${loose.length === 1 ? "is" : "are"} not grouped into a theme.` : "",
    participants.size ? `Findings draw on ${plural(participants.size, "participant")}; they describe these participants, not a wider population.` : "",
  ].filter(Boolean);
  sections.push({
    key: "limitations",
    title: "Limitations",
    blocks: [...para(report.limitations), ...(facts.length ? ([{ type: "list", ordered: false, items: facts }] as Block[]) : [])],
  });

  return {
    title: input.synthesis.title,
    kicker: "Research synthesis",
    meta: [
      { label: "Project", value: input.project?.name ?? "—" },
      ...(input.project?.client ? [{ label: "Client", value: input.project.client }] : []),
      { label: "Status", value: input.synthesis.status === "completed" ? "Completed" : "Draft" },
      ...(input.preparedBy ? [{ label: "Prepared by", value: input.preparedBy }] : []),
      { label: "Last updated", value: formatDocDate(input.synthesis.updatedAt) },
    ],
    sections,
  };
}

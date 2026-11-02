import {
  DEFAULT_POSITIONS,
  SECTION_TITLES,
  isMaterialKey,
  isSectionKey,
  type PlanStatus,
  type SectionKey,
} from "@/lib/research-planner/constants";
import { applicableMaterials } from "@/lib/research-planner/materials";
import { getMethod } from "@/lib/research-planner/methods";
import {
  SURVEY_TYPE_LABELS,
  normalizeContent,
  type SectionContentMap,
} from "@/lib/research-planner/schemas";

/**
 * Format-agnostic document model. The preview, Markdown, PDF and DOCX exports
 * all render this one structure, so they cannot drift apart.
 */
export type ListItem = string | { text: string; children: string[] };

export type Block =
  | { type: "heading"; text: string }
  | { type: "paragraph"; text: string }
  | { type: "list"; ordered: boolean; items: ListItem[] }
  | { type: "table"; headers: string[]; rows: string[][]; widths?: number[] };

export type DocSection = { key: string; title: string; blocks: Block[] };

/** An optional picture shown on the cover (personas use it for an illustrative portrait). */
export type DocImage = {
  /** Site-relative path under /public. Exports only embed files under /personas/avatars. */
  src: string;
  alt: string;
  /** Always shown under the picture, in the preview and every export. */
  caption: string;
};

export type PlanDocument = {
  title: string;
  kicker: string;
  image?: DocImage;
  meta: { label: string; value: string }[];
  sections: DocSection[];
};

export type PlanDocumentInput = {
  title: string;
  status: PlanStatus;
  updatedAt: string;
  project: { name: string; client: string | null; industry: string | null } | null;
  preparedBy?: string | null;
  sections: Partial<Record<string, { content: unknown; position: number }>>;
};

const clean = (items: string[]) => items.map((s) => s.trim()).filter(Boolean);
const text = (s: string) => s.trim();

export function formatDocDate(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat("en-GB", { dateStyle: "long", timeZone: "UTC" }).format(d);
}

function field(heading: string, value: string): Block[] {
  const v = text(value);
  return v ? [{ type: "heading", text: heading }, { type: "paragraph", text: v }] : [];
}
function listBlock(heading: string, items: string[], ordered = false): Block[] {
  const c = clean(items);
  return c.length ? [{ type: "heading", text: heading }, { type: "list", ordered, items: c }] : [];
}
function table(headers: string[], rows: string[][], heading?: string): Block[] {
  const kept = rows.filter((r) => r.some((cell) => cell.trim()));
  return tableOf(headers, kept, heading);
}
/** Attribute/value tables: a row with an empty value is dropped, whatever its label. */
function kvTable(rows: [string, string][], heading?: string): Block[] {
  return tableOf(["Aspect", "Detail"], rows.filter(([, v]) => v.trim()), heading);
}
function tableOf(headers: string[], kept: string[][], heading?: string): Block[] {
  if (!kept.length) return [];
  return [...(heading ? [{ type: "heading", text: heading } as Block] : []), { type: "table", headers, rows: kept }];
}

const BUILDERS: { [K in SectionKey]: (c: SectionContentMap[K]) => Block[] } = {
  context: (c) => [
    ...field("Product or service", c.product_description),
    ...field("Business background", c.business_background),
    ...field("Target audience", c.target_audience),
    ...field("Industry", c.industry),
    ...field("Current problem or challenge", c.problem),
  ],
  goals: (c) => [
    ...field("Primary research goal", c.primary_goal),
    ...listBlock("Research objectives", c.objectives),
    ...listBlock("Key research questions", c.research_questions, true),
    ...listBlock("Business questions", c.business_questions),
    ...listBlock("User questions", c.user_questions),
    ...listBlock("Desired outcomes", c.desired_outcomes),
  ],
  methods: (c) => {
    const hasRationale = c.selected.some((id) => text(c.rationale[id] ?? ""));
    const rows = c.selected.map((id) => {
      const m = getMethod(id);
      const about = id === "other" && text(c.other_description) ? text(c.other_description) : m.summary;
      return hasRationale ? [m.name, about, text(c.rationale[id] ?? "") || "—"] : [m.name, about];
    });
    return [
      ...table(hasRationale ? ["Method", "About", "Why this method"] : ["Method", "About"], rows),
      ...field("Notes", c.notes),
    ];
  },
  participants: (c) => [
    ...kvTable(
      [
        ["Participant profile", text(c.profile)],
        ["Target user segment", text(c.segment)],
        ["Number of participants", c.count ? String(c.count) : ""],
        ["Recruitment method", text(c.recruitment_method)],
      ],
    ),
    ...listBlock("Inclusion criteria", c.inclusion),
    ...listBlock("Exclusion criteria", c.exclusion),
    ...listBlock("Screening questions", c.screening_questions, true),
  ],
  interview_guide: (c) => [
    ...field("Introduction script", c.introduction),
    ...c.blocks
      .filter((b) => text(b.title) || clean(b.prompts).length)
      .flatMap((b) => [
        { type: "heading", text: `${text(b.title) || "Untitled section"}${b.minutes ? ` (${b.minutes} min)` : ""}` } as Block,
        ...(clean(b.prompts).length ? [{ type: "list", ordered: false, items: clean(b.prompts) } as Block] : []),
      ]),
    ...field("Closing notes", c.wrap_up),
  ],
  interview_questions: (c) => {
    const items: ListItem[] = c.questions
      .filter((q) => text(q.text))
      .map((q) => (clean(q.probes).length ? { text: text(q.text), children: clean(q.probes).map((p) => `Probe: ${p}`) } : text(q.text)));
    return items.length ? [{ type: "list", ordered: true, items }] : [];
  },
  survey_questions: (c) =>
    table(
      ["#", "Question", "Type", "Answer options"],
      c.questions
        .filter((q) => text(q.text))
        .map((q, i) => [String(i + 1), text(q.text), SURVEY_TYPE_LABELS[q.type], clean(q.options).join("; ") || "—"]),
    ),
  usability_tasks: (c) =>
    table(
      ["#", "Task", "Goal", "Success criteria"],
      c.tasks
        .filter((t) => text(t.title) || text(t.goal))
        .map((t, i) => [String(i + 1), text(t.title), text(t.goal), text(t.success_criteria) || "—"]),
    ),
  task_scenarios: (c) =>
    table(
      ["Task", "Scenario"],
      c.scenarios.filter((s) => text(s.scenario)).map((s) => [text(s.title), text(s.scenario)]),
    ),
  pre_test_questions: (c) => (clean(c.questions).length ? [{ type: "list", ordered: true, items: clean(c.questions) }] : []),
  post_test_questions: (c) => (clean(c.questions).length ? [{ type: "list", ordered: true, items: clean(c.questions) }] : []),
  observation_checklist: (c) => (clean(c.items).length ? [{ type: "list", ordered: false, items: clean(c.items) }] : []),
  logistics: (c) => [
    ...kvTable(
      [
        ["Research duration", text(c.duration)],
        ["Session duration", c.session_duration_minutes ? `${c.session_duration_minutes} minutes` : ""],
      ],
    ),
    ...table(["Phase", "Timing"], c.timeline.map((t) => [text(t.phase), text(t.timing)]), "Estimated timeline"),
    ...listBlock("Tools required", c.tools),
    ...table(["Role", "Responsibility"], c.team.map((t) => [text(t.role), text(t.responsibility)]), "Team responsibilities"),
    ...table(["Risk or constraint", "Mitigation"], c.risks.map((r) => [text(r.risk), text(r.mitigation) || "—"]), "Risks and constraints"),
  ],
};

function buildSection<K extends SectionKey>(key: K, raw: unknown): DocSection | null {
  const content = normalizeContent(key, raw);
  const blocks = BUILDERS[key](content as never);
  return blocks.length ? { key, title: SECTION_TITLES[key], blocks } : null;
}

export function orderedSectionKeys(
  sections: PlanDocumentInput["sections"],
): SectionKey[] {
  return Object.entries(sections)
    .filter((entry): entry is [SectionKey, NonNullable<(typeof entry)[1]>] => isSectionKey(entry[0]) && Boolean(entry[1]))
    .sort(
      ([ak, a], [bk, b]) =>
        a.position - b.position || DEFAULT_POSITIONS[ak] - DEFAULT_POSITIONS[bk],
    )
    .map(([key]) => key);
}

export function buildPlanDocument(input: PlanDocumentInput): PlanDocument {
  const methods = normalizeContent("methods", input.sections.methods?.content);
  const applicable = new Set<string>(applicableMaterials(methods.selected));
  const context = normalizeContent("context", input.sections.context?.content);

  const sections: DocSection[] = [];
  let previousWasMaterial = false;

  for (const key of orderedSectionKeys(input.sections)) {
    if (isMaterialKey(key) && !applicable.has(key)) continue;
    const section = buildSection(key, input.sections[key]!.content);
    if (!section) continue;

    if (isMaterialKey(key)) {
      if (!previousWasMaterial) {
        sections.push({
          key: "materials",
          title: "Research materials",
          blocks: [{ type: "paragraph", text: "The following materials support the selected research methods." }],
        });
      }
      previousWasMaterial = true;
    } else {
      previousWasMaterial = false;
    }

    sections.push(section);

    if (key === "logistics") {
      const logistics = normalizeContent("logistics", input.sections.logistics!.content);
      const deliverables = clean(logistics.deliverables);
      if (deliverables.length) {
        sections.push({ key: "deliverables", title: "Deliverables", blocks: [{ type: "list", ordered: false, items: deliverables }] });
      }
      previousWasMaterial = false;
    }
  }

  const industry = text(context.industry) || input.project?.industry || "";
  const meta = [
    { label: "Project", value: input.project?.name ?? "" },
    { label: "Client", value: input.project?.client ?? "" },
    { label: "Industry", value: industry },
    { label: "Prepared by", value: input.preparedBy ?? "" },
    { label: "Status", value: input.status === "completed" ? "Completed" : "Draft" },
    { label: "Last updated", value: formatDocDate(input.updatedAt) },
  ].filter((m) => m.value.trim());

  return { title: text(input.title) || "Untitled research plan", kicker: "Research plan", meta, sections };
}

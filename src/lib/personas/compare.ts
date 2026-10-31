import { EXPERIENCE_LABELS, PERSONA_TYPE_INFO, type PersonaType } from "@/lib/personas/constants";
import type { EvidenceRow, PersonaContent } from "@/lib/personas/schemas";
import { evidenceStatement, summariseEvidence } from "@/lib/personas/validation";

export type ComparablePersona = {
  id: string;
  name: string;
  type: PersonaType;
  projectName: string | null;
  content: PersonaContent;
  evidence: EvidenceRow[];
};

export type ComparisonRow =
  | { key: string; label: string; kind: "text"; cells: string[] }
  | { key: string; label: string; kind: "list"; cells: string[][] };

const clean = (items: string[]) => items.map((i) => i.trim()).filter(Boolean);
const norm = (s: string) => s.trim().toLowerCase().replace(/\s+/g, " ");

/** Items every persona lists (compared case-insensitively), in the first persona's wording. */
export function commonItems(lists: string[][]): string[] {
  if (lists.length < 2) return [];
  const [first, ...rest] = lists.map(clean);
  const others = rest.map((l) => new Set(l.map(norm)));
  const seen = new Set<string>();
  return first.filter((item) => {
    const key = norm(item);
    if (seen.has(key)) return false;
    seen.add(key);
    return others.every((set) => set.has(key));
  });
}

/** Side-by-side rows for the comparison table. Pure data, so it is easy to test. */
export function buildComparison(personas: ComparablePersona[]): { rows: ComparisonRow[]; common: Record<string, string[]> } {
  const text = (key: string, label: string, pick: (p: ComparablePersona) => string): ComparisonRow => ({ key, label, kind: "text", cells: personas.map((p) => pick(p).trim()) });
  const list = (key: string, label: string, pick: (p: ComparablePersona) => string[]): ComparisonRow => ({ key, label, kind: "list", cells: personas.map((p) => clean(pick(p))) });

  const rows: ComparisonRow[] = [
    text("type", "Persona type", (p) => PERSONA_TYPE_INFO[p.type].label),
    text("evidence", "What it rests on", (p) => evidenceStatement(p.type, summariseEvidence(p.evidence))),
    text("segment", "Audience segment", (p) => p.content.context.audience_segment),
    text("role", "Role or occupation", (p) => p.content.profile.role),
    text("experience", "Experience level", (p) => (p.content.profile.experience_level ? EXPERIENCE_LABELS[p.content.profile.experience_level] : "")),
    text("context", "Context of use", (p) => p.content.profile.context_of_use),
    list("goals", "Goals", (p) => p.content.behaviour.goals),
    list("motivations", "Motivations", (p) => p.content.behaviour.motivations),
    list("behaviours", "Behaviours", (p) => p.content.behaviour.behaviours),
    list("pain_points", "Pain points", (p) => p.content.behaviour.pain_points),
    list("frustrations", "Frustrations", (p) => p.content.behaviour.frustrations),
    list("barriers", "Barriers", (p) => p.content.behaviour.barriers),
    list("jobs", "Jobs to be done", (p) =>
      p.content.needs.jobs
        .filter((j) => j.situation.trim() || j.motivation.trim() || j.outcome.trim())
        .map((j) => [j.situation && `When ${j.situation}`, j.motivation && `I want to ${j.motivation}`, j.outcome && `so I can ${j.outcome}`].filter(Boolean).join(", ")),
    ),
    list("outcomes", "Desired outcomes", (p) => p.content.needs.desired_outcomes),
    list("alternatives", "Current alternatives", (p) => p.content.needs.alternatives),
  ];

  const common: Record<string, string[]> = {};
  for (const row of rows) {
    if (row.kind === "list") {
      const shared = commonItems(row.cells);
      if (shared.length) common[row.key] = shared;
    }
  }
  return { rows, common };
}

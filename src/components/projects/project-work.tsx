import Link from "next/link";
import { LayoutGrid, Plus, Table2 } from "lucide-react";
import { AnalysisActionsMenu } from "@/components/competitors/analysis-actions-menu";
import { AnalysisCard } from "@/components/competitors/analysis-card";
import { PersonaActionsMenu } from "@/components/personas/persona-actions-menu";
import { PersonaCard } from "@/components/personas/persona-card";
import { NewWorkMenu } from "@/components/projects/new-work-menu";
import { WorkKindTag } from "@/components/projects/work-kind-tag";
import { JourneyActionsMenu } from "@/components/journeys/journey-actions-menu";
import { JourneyCard } from "@/components/journeys/journey-card";
import { SynthesisActionsMenu } from "@/components/synthesizer/synthesis-actions-menu";
import { SynthesisCard } from "@/components/synthesizer/synthesis-card";
import { PlanActionsMenu } from "@/components/research-planner/plan-actions-menu";
import { PlanCard } from "@/components/research-planner/plan-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Segmented, SegmentLink } from "@/components/ui/segmented";
import { WORK_KINDS } from "@/config/work-kinds";
import type { AnalysisListItem } from "@/lib/competitors/queries";
import { formatDate, formatRelativeTime } from "@/lib/format";
import type { JourneyListItem } from "@/lib/journeys/queries";
import type { PersonaListItem } from "@/lib/personas/queries";
import type { SynthesisListItem } from "@/lib/synthesizer/queries";
import { buildWorkItems, type ProjectWorkKind, type WorkFilter, type WorkItem, type WorkView } from "@/lib/projects/work-items";
import type { PlanListItem } from "@/lib/research-planner/queries";

const FILTER_LABELS: Record<WorkFilter, string> = { all: "All", plan: "Plans", persona: "Personas", analysis: "Analyses", synthesis: "Syntheses", journey: "Journeys" };
const KINDS: ProjectWorkKind[] = ["plan", "persona", "analysis", "synthesis", "journey"];

function ItemActions({ item }: { item: WorkItem }) {
  if (item.kind === "plan") return <PlanActionsMenu planId={item.id} title={item.title} />;
  if (item.kind === "persona") return <PersonaActionsMenu personaId={item.id} name={item.title} />;
  if (item.kind === "synthesis") return <SynthesisActionsMenu synthesisId={item.id} title={item.title} />;
  if (item.kind === "journey") return <JourneyActionsMenu journeyId={item.id} title={item.title} />;
  return <AnalysisActionsMenu analysisId={item.id} title={item.title} />;
}

function StatusCell({ item }: { item: WorkItem }) {
  return <Badge variant={item.completed ? "default" : "secondary"}>{item.completed ? "Completed" : "Draft"}</Badge>;
}

// `relative` on the scroller: the screen-reader-only text inside is absolutely positioned and must be clipped here too.
function WorkTable({ items }: { items: WorkItem[] }) {
  return (
    <div className="relative overflow-x-auto rounded-card border border-border bg-card shadow-card">
      <table className="w-full border-collapse text-left text-sm">
        <caption className="sr-only">Research in this project</caption>
        <thead>
          <tr className="border-b border-border text-xs text-muted-foreground">
            <th scope="col" className="px-4 py-2.5 font-semibold">Name</th>
            <th scope="col" className="px-3 py-2.5 font-semibold">Tool</th>
            <th scope="col" className="hidden px-3 py-2.5 font-semibold sm:table-cell">Status</th>
            <th scope="col" className="hidden px-3 py-2.5 font-semibold xl:table-cell">Progress</th>
            <th scope="col" className="hidden px-3 py-2.5 font-semibold md:table-cell">Created</th>
            <th scope="col" className="hidden px-3 py-2.5 font-semibold sm:table-cell">Last edited</th>
            <th scope="col" className="w-12 px-2 py-2.5"><span className="sr-only">Actions</span></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {items.map((item) => (
            <tr key={`${item.kind}-${item.id}`} data-kind={item.kind} className="align-middle hover:bg-secondary/60">
              <th scope="row" className="max-w-0 min-w-32 px-4 py-3 font-semibold [overflow-wrap:anywhere]">
                <Link href={item.href} className="rounded-sm outline-none hover:text-primary-text focus-visible:ring-[3px] focus-visible:ring-ring/50">
                  {item.title}
                </Link>
                <span className="mt-0.5 block text-xs font-normal text-muted-foreground sm:hidden">
                  {item.completed ? "Completed" : "Draft"} · Edited {formatRelativeTime(item.updatedAt)}
                </span>
              </th>
              <td className="px-3 py-3"><WorkKindTag kind={item.kind} short className="flex text-sm font-medium text-foreground" /></td>
              <td className="hidden px-3 py-3 sm:table-cell"><StatusCell item={item} /></td>
              <td className="hidden px-3 py-3 text-muted-foreground tabular-nums xl:table-cell">{item.progress ?? "—"}</td>
              <td className="hidden px-3 py-3 whitespace-nowrap text-muted-foreground md:table-cell">{formatDate(item.createdAt)}</td>
              <td className="hidden px-3 py-3 whitespace-nowrap text-muted-foreground sm:table-cell">{formatRelativeTime(item.updatedAt)}</td>
              <td className="px-2 py-2 text-right"><ItemActions item={item} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/**
 * Everything the project has produced, in one place and first on the page. The cards and the
 * table show the same rows; the table adds a Tool column so mixed work stays scannable.
 */
export function ProjectWork({
  projectId,
  archived,
  plans,
  personas,
  analyses,
  syntheses,
  journeys,
  view,
  type,
}: {
  projectId: string;
  archived: boolean;
  plans: PlanListItem[];
  personas: PersonaListItem[];
  analyses: AnalysisListItem[];
  syntheses: SynthesisListItem[];
  journeys: JourneyListItem[];
  view: WorkView;
  type: WorkFilter;
}) {
  const all = buildWorkItems({ plans, personas, analyses, syntheses, journeys });
  const items = type === "all" ? all : all.filter((i) => i.kind === type);
  const counts: Record<WorkFilter, number> = {
    all: all.length,
    plan: plans.length,
    persona: personas.length,
    analysis: analyses.length,
    synthesis: syntheses.length,
    journey: journeys.length,
  };
  const href = (next: { view?: WorkView; type?: WorkFilter }) => {
    const v = next.view ?? view;
    const t = next.type ?? type;
    const qs = new URLSearchParams();
    if (v !== "cards") qs.set("view", v);
    if (t !== "all") qs.set("type", t);
    const s = qs.toString();
    return `/projects/${projectId}${s ? `?${s}` : ""}`;
  };
  const planById = new Map(plans.map((p) => [p.id, p]));
  const personaById = new Map(personas.map((p) => [p.id, p]));
  const analysisById = new Map(analyses.map((a) => [a.id, a]));
  const synthesisById = new Map(syntheses.map((s) => [s.id, s]));
  const journeyById = new Map(journeys.map((j) => [j.id, j]));

  return (
    <section aria-labelledby="project-research">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 id="project-research" className="text-lg font-bold">
          Research <span className="ml-1 text-sm font-medium text-muted-foreground tabular-nums">{all.length}</span>
        </h2>
        {!archived && <NewWorkMenu projectId={projectId} />}
      </div>

      {all.length > 0 && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <Segmented label="Filter by tool">
            {(Object.keys(FILTER_LABELS) as WorkFilter[]).map((f) => (
              <SegmentLink key={f} href={href({ type: f })} current={type === f}>
                {FILTER_LABELS[f]}
                <span className="text-xs text-muted-foreground tabular-nums">{counts[f]}</span>
              </SegmentLink>
            ))}
          </Segmented>
          <Segmented label="Layout">
            <SegmentLink href={href({ view: "cards" })} current={view === "cards"}>
              <LayoutGrid aria-hidden className="size-4" /> Cards
            </SegmentLink>
            <SegmentLink href={href({ view: "table" })} current={view === "table"}>
              <Table2 aria-hidden className="size-4" /> Table
            </SegmentLink>
          </Segmented>
        </div>
      )}

      {all.length === 0 ? (
        <div className="rounded-card border border-dashed border-input bg-secondary px-5 py-8 text-center">
          <p className="font-semibold">No research in this project yet</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {archived ? "Restore the project to add research." : "Start with a plan, a persona or a competitor analysis."}
          </p>
          {!archived && (
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              {KINDS.map((kind) => {
                const { label, icon: Icon, newPath } = WORK_KINDS[kind];
                return (
                  <Button key={kind} asChild variant="outline" size="sm">
                    <Link href={`${newPath}?project=${projectId}`}>
                      <Icon /> {label}
                    </Link>
                  </Button>
                );
              })}
            </div>
          )}
        </div>
      ) : items.length === 0 ? (
        <p className="rounded-card border border-dashed border-input bg-secondary px-5 py-6 text-sm text-muted-foreground">
          No {FILTER_LABELS[type].toLowerCase()} in this project yet.{" "}
          {!archived && type !== "all" && (
            <Link href={`${WORK_KINDS[type].newPath}?project=${projectId}`} className="inline-flex items-center gap-1 font-semibold text-primary-text hover:underline">
              <Plus aria-hidden className="size-3.5" /> New {WORK_KINDS[type].label.toLowerCase()}
            </Link>
          )}
        </p>
      ) : view === "table" ? (
        <WorkTable items={items} />
      ) : (
        <ul className="grid items-stretch gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {items.map((item) => (
            <li key={`${item.kind}-${item.id}`} data-kind={item.kind} className="flex">
              {item.kind === "plan" && <PlanCard plan={planById.get(item.id)!} showTool />}
              {item.kind === "persona" && <PersonaCard persona={personaById.get(item.id)!} showTool />}
              {item.kind === "analysis" && <AnalysisCard analysis={analysisById.get(item.id)!} showTool />}
              {item.kind === "synthesis" && <SynthesisCard synthesis={synthesisById.get(item.id)!} showTool />}
              {item.kind === "journey" && <JourneyCard journey={journeyById.get(item.id)!} showTool />}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

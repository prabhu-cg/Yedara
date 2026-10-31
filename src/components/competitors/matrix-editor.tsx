"use client";

import * as React from "react";
import { CircleHelp, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SelectField, TextareaField } from "@/components/forms/fields";
import { CELL_STATUSES, CELL_STATUS_LABELS, CELL_STATUS_SHORT, UNNAMED_COMPETITOR, type CellStatus } from "@/lib/competitors/constants";
import type { CellInput, CellRow, CompetitorRow, CriterionRow, SourceRow } from "@/lib/competitors/schemas";
import { cn } from "@/lib/utils";

export const blankCell = (competitorId: string, criterionId: string): CellRow => ({
  competitor_id: competitorId,
  criterion_id: criterionId,
  value: "",
  status: "unknown",
  notes: "",
  source_id: "",
  origin: "manual",
});

const TONE: Record<CellStatus, string> = {
  known: "",
  unknown: "text-muted-foreground italic",
  unavailable: "text-muted-foreground italic",
  not_applicable: "text-muted-foreground",
};

/**
 * Competitors are columns and criteria are rows. Each cell opens an editor below the table;
 * the table itself scrolls sideways inside its own container so the page never does.
 */
export function MatrixEditor({
  competitors,
  criteria,
  cells,
  sources,
  tags,
  onChange,
}: {
  competitors: CompetitorRow[];
  criteria: CriterionRow[];
  cells: CellRow[];
  sources: SourceRow[];
  /** Source id → "[S1]" style tag, shared with the report. */
  tags: Map<string, string>;
  onChange: (competitorId: string, criterionId: string, patch: Partial<CellInput>) => void;
}) {
  const [selected, setSelected] = React.useState<{ competitorId: string; criterionId: string } | null>(null);
  const byKey = new Map(cells.map((c) => [`${c.competitor_id}:${c.criterion_id}`, c]));
  const cellOf = (cid: string, kid: string) => byKey.get(`${cid}:${kid}`) ?? blankCell(cid, kid);

  if (competitors.length === 0 || criteria.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
        Add at least one competitor and one criterion first. They become the columns and rows of the matrix.
      </p>
    );
  }

  const competitor = selected ? competitors.find((c) => c.id === selected.competitorId) : undefined;
  const criterion = selected ? criteria.find((c) => c.id === selected.criterionId) : undefined;
  const editing = competitor && criterion ? { competitor, criterion, cell: cellOf(competitor.id, criterion.id) } : null;
  const ownSources = editing ? sources.filter((s) => s.competitor_id === editing.competitor.id) : [];

  return (
    <div className="space-y-5">
      <p className="flex items-start gap-2 rounded-xl border border-info/30 bg-info-soft p-4 text-sm">
        <CircleHelp aria-hidden className="mt-0.5 size-4 shrink-0" />
        <span>
          Select a cell to fill it in. <strong>Unknown</strong> means you haven&apos;t researched it yet; <strong>Not publicly available</strong> means you looked and couldn&apos;t find it. Neither counts against a competitor.
        </span>
      </p>

      <div className="overflow-x-auto rounded-lg border border-border">
        <table aria-label="Comparison matrix" className="w-full min-w-[40rem] border-collapse text-left text-sm">
          <thead className="bg-secondary">
            <tr>
              <th scope="col" className="sticky left-0 z-10 w-40 bg-secondary px-3 py-2 font-semibold">Criterion</th>
              {competitors.map((c) => (
                <th key={c.id} scope="col" className="min-w-40 px-3 py-2 font-semibold [overflow-wrap:anywhere]">{c.name.trim() || UNNAMED_COMPETITOR}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {criteria.map((k) => (
              <tr key={k.id} className="border-t border-border align-top">
                <th scope="row" className="sticky left-0 z-10 bg-card px-3 py-2 font-semibold [overflow-wrap:anywhere]">{k.name}</th>
                {competitors.map((c) => {
                  const cell = cellOf(c.id, k.id);
                  const isSelected = selected?.competitorId === c.id && selected.criterionId === k.id;
                  const text = cell.status === "known" ? cell.value.trim() || "Known, no detail recorded" : CELL_STATUS_SHORT[cell.status];
                  return (
                    <td key={c.id} className="p-1.5">
                      <button
                        type="button"
                        data-cell={`${c.id}:${k.id}`}
                        data-status={cell.status}
                        aria-pressed={isSelected}
                        aria-label={`${k.name} for ${c.name.trim() || UNNAMED_COMPETITOR}: ${text}. Edit`}
                        onClick={() => setSelected({ competitorId: c.id, criterionId: k.id })}
                        className={cn(
                          "block min-h-12 w-full rounded-md border border-transparent px-2 py-1.5 text-left outline-none hover:border-primary focus-visible:ring-[3px] focus-visible:ring-ring/50 [overflow-wrap:anywhere]",
                          isSelected && "border-primary bg-primary-soft",
                          TONE[cell.status],
                        )}
                      >
                        <span className="line-clamp-3">{text}</span>
                        {cell.source_id && tags.get(cell.source_id) && <span className="ml-1 text-xs font-semibold text-primary-text">{tags.get(cell.source_id)}</span>}
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editing && (
        <section aria-label="Edit matrix cell" className="space-y-4 rounded-card border border-primary bg-card p-4 shadow-raised sm:p-5">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <h3 className="text-base font-semibold [overflow-wrap:anywhere]">{editing.criterion.name}</h3>
              <p className="text-sm text-muted-foreground">for <strong className="text-foreground">{editing.competitor.name.trim() || UNNAMED_COMPETITOR}</strong></p>
              {editing.criterion.description.trim() && <p className="mt-1 text-xs text-muted-foreground">{editing.criterion.description}</p>}
            </div>
            <Button type="button" variant="ghost" size="xs" onClick={() => setSelected(null)}><X /> Close</Button>
          </div>

          <SelectField label="What do you know?" value={editing.cell.status} onChange={(e) => onChange(editing.competitor.id, editing.criterion.id, { status: e.target.value as CellStatus })}>
            {CELL_STATUSES.map((s) => <option key={s} value={s}>{CELL_STATUS_LABELS[s]}</option>)}
          </SelectField>

          {editing.cell.status === "known" && (
            <TextareaField label="Value" rows={2} maxLength={1000} placeholder="What you found, as the source states it" value={editing.cell.value} onChange={(e) => onChange(editing.competitor.id, editing.criterion.id, { value: e.target.value })} />
          )}
          {editing.cell.status === "unavailable" && (
            <p className="text-sm text-muted-foreground">Recorded as not publicly available. Use the note to say where you looked.</p>
          )}

          <SelectField label="Source" optional hint={ownSources.length === 0 ? "Add a source for this competitor in step 2 to cite it here." : undefined} value={editing.cell.source_id} onChange={(e) => onChange(editing.competitor.id, editing.criterion.id, { source_id: e.target.value })}>
            <option value="">No source linked</option>
            {ownSources.map((s) => <option key={s.id} value={s.id}>{tags.get(s.id)} {s.title.trim() || s.url}</option>)}
          </SelectField>
          {editing.cell.status === "known" && !editing.cell.source_id && <Badge variant="warning">No source linked yet</Badge>}

          <TextareaField label="Notes" optional rows={2} maxLength={2000} value={editing.cell.notes} onChange={(e) => onChange(editing.competitor.id, editing.criterion.id, { notes: e.target.value })} />
        </section>
      )}
    </div>
  );
}

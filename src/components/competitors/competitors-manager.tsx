"use client";

import * as React from "react";
import { ArrowDown, ArrowUp, ExternalLink, Plus, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SelectField, SubmitButton, TextareaField, TextField } from "@/components/forms/fields";
import { CompetitorTypeBadge } from "@/components/competitors/competitor-type";
import { COMPETITOR_TYPES, COMPETITOR_TYPE_INFO, ORIGIN_LABELS, SOURCE_TYPES, SOURCE_TYPE_LABELS, UNNAMED_COMPETITOR } from "@/lib/competitors/constants";
import type { CompetitorRow, SourceInput, SourceRow } from "@/lib/competitors/schemas";

const today = () => new Date().toISOString().slice(0, 10);
const BLANK_SOURCE: SourceInput = { url: "", title: "", source_type: "website", retrieved_on: "", notes: "" };

/** Two-step removal: removing a competitor also removes its matrix entries and sources. */
function RemoveButton({ label, onConfirm, warning }: { label: string; onConfirm: () => void; warning?: string }) {
  const [armed, setArmed] = React.useState(false);
  if (!armed) {
    return (
      <Button type="button" variant="ghost" size="xs" onClick={() => setArmed(true)} aria-label={label}>
        <Trash2 /> Remove
      </Button>
    );
  }
  return (
    <span className="flex flex-wrap items-center gap-2">
      {warning && <span className="text-xs text-muted-foreground">{warning}</span>}
      <Button type="button" variant="destructive" size="xs" onClick={onConfirm} aria-label={`Confirm: ${label}`}>Confirm remove</Button>
      <Button type="button" variant="ghost" size="xs" onClick={() => setArmed(false)}>Keep</Button>
    </span>
  );
}

function AddSourceForm({ onAdd }: { onAdd: (input: SourceInput) => Promise<{ ok: true } | { ok: false; errors: Record<string, string> }> }) {
  const [open, setOpen] = React.useState(false);
  const [draft, setDraft] = React.useState<SourceInput>(BLANK_SOURCE);
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [pending, setPending] = React.useState(false);
  const set = (patch: Partial<SourceInput>) => setDraft((d) => ({ ...d, ...patch }));

  if (!open) {
    return (
      <Button type="button" variant="outline" size="sm" onClick={() => { setDraft({ ...BLANK_SOURCE, retrieved_on: today() }); setOpen(true); }}>
        <Plus /> Add source
      </Button>
    );
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setPending(true);
    const result = await onAdd(draft);
    setPending(false);
    if (result.ok) {
      setOpen(false);
      setErrors({});
    } else setErrors(result.errors);
  };

  return (
    <div role="group" aria-label="New source" className="space-y-4 rounded-xl border border-border bg-secondary/50 p-4">
      <TextField label="Source link" placeholder="https://" inputMode="url" error={errors.url} value={draft.url} onChange={(e) => set({ url: e.target.value })} />
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField label="Source title" optional placeholder="e.g. Pricing page" value={draft.title} onChange={(e) => set({ title: e.target.value })} />
        <SelectField label="Source type" value={draft.source_type} onChange={(e) => set({ source_type: e.target.value as SourceInput["source_type"] })}>
          {SOURCE_TYPES.map((t) => <option key={t} value={t}>{SOURCE_TYPE_LABELS[t]}</option>)}
        </SelectField>
      </div>
      <TextField label="Date you looked at it" optional type="date" error={errors.retrieved_on} value={draft.retrieved_on} onChange={(e) => set({ retrieved_on: e.target.value })} />
      <TextareaField label="Notes about this source" optional rows={2} value={draft.notes} onChange={(e) => set({ notes: e.target.value })} />
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button type="button" variant="outline" onClick={() => { setOpen(false); setErrors({}); }}>Cancel</Button>
        <SubmitButton type="button" pending={pending} pendingLabel="Adding…" onClick={submit}>Add this source</SubmitButton>
      </div>
    </div>
  );
}

export function CompetitorsManager({
  competitors,
  sources,
  error,
  onAdd,
  onChange,
  onRemove,
  onMove,
  onAddSource,
  onChangeSource,
  onRemoveSource,
}: {
  competitors: CompetitorRow[];
  sources: SourceRow[];
  error?: string;
  onAdd: () => Promise<void>;
  onChange: (id: string, patch: Partial<CompetitorRow>) => void;
  onRemove: (id: string) => void;
  onMove: (id: string, direction: -1 | 1) => void;
  onAddSource: (competitorId: string, input: SourceInput) => Promise<{ ok: true } | { ok: false; errors: Record<string, string> }>;
  onChangeSource: (id: string, patch: Partial<SourceRow>) => void;
  onRemoveSource: (id: string) => void;
}) {
  const [adding, setAdding] = React.useState(false);
  const add = async () => {
    setAdding(true);
    try {
      await onAdd();
    } finally {
      setAdding(false);
    }
  };

  return (
    <div className="space-y-5">
      <div id="field-competitors" tabIndex={-1} className="outline-none">
        {error && <p role="alert" className="text-sm font-medium text-destructive">{error}</p>}
      </div>

      {competitors.length === 0 && (
        <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          No competitors yet. Add the products and companies you want to compare, including substitutes such as spreadsheets.
        </p>
      )}

      {competitors.map((c, index) => {
        const own = sources.filter((s) => s.competitor_id === c.id);
        const heading = c.name.trim() || UNNAMED_COMPETITOR;
        return (
          <section key={c.id} aria-label={`Competitor ${index + 1}: ${heading}`} className="space-y-5 rounded-card border border-border bg-card p-4 shadow-card sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex min-w-0 items-center gap-2">
                <h3 className="text-base font-semibold [overflow-wrap:anywhere]">{heading}</h3>
                <CompetitorTypeBadge type={c.competitor_type} />
              </div>
              <div className="flex items-center gap-1">
                <Button type="button" variant="ghost" size="icon" disabled={index === 0} onClick={() => onMove(c.id, -1)} aria-label={`Move ${heading} earlier`}><ArrowUp /></Button>
                <Button type="button" variant="ghost" size="icon" disabled={index === competitors.length - 1} onClick={() => onMove(c.id, 1)} aria-label={`Move ${heading} later`}><ArrowDown /></Button>
                <RemoveButton label={`Remove ${heading}`} warning="Its matrix entries and sources are removed too." onConfirm={() => onRemove(c.id)} />
              </div>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <TextField label="Name" maxLength={160} value={c.name} onChange={(e) => onChange(c.id, { name: e.target.value })} error={!c.name.trim() ? "A competitor needs a name" : undefined} />
              <TextField label="Website" optional placeholder="https://" inputMode="url" value={c.website_url} onChange={(e) => onChange(c.id, { website_url: e.target.value })} error={c.website_url && !/^https?:\/\/\S+$/i.test(c.website_url) ? "Use a link starting with http:// or https://" : undefined} />
            </div>
            <SelectField label="Type" hint={COMPETITOR_TYPE_INFO[c.competitor_type].help} value={c.competitor_type} onChange={(e) => onChange(c.id, { competitor_type: e.target.value as CompetitorRow["competitor_type"] })}>
              {COMPETITOR_TYPES.map((t) => <option key={t} value={t}>{COMPETITOR_TYPE_INFO[t].label}</option>)}
            </SelectField>
            <TextareaField label="Description" optional rows={2} placeholder="What it is and what it does, in your words" value={c.description} onChange={(e) => onChange(c.id, { description: e.target.value })} />
            <div className="grid gap-5 sm:grid-cols-2">
              <TextareaField label="Target audience" optional rows={2} value={c.target_audience} onChange={(e) => onChange(c.id, { target_audience: e.target.value })} />
              <TextareaField label="Positioning" optional rows={2} hint="How it describes itself" value={c.positioning} onChange={(e) => onChange(c.id, { positioning: e.target.value })} />
            </div>
            <div className="grid gap-5 sm:grid-cols-2">
              <TextareaField label="Pricing information" optional rows={2} hint="Only what you found. Leave it empty if you didn't." value={c.pricing_info} onChange={(e) => onChange(c.id, { pricing_info: e.target.value })} />
              <TextField label="Research date" optional type="date" hint="When you looked at this competitor" value={c.research_date} onChange={(e) => onChange(c.id, { research_date: e.target.value })} />
            </div>

            <div className="space-y-3 border-t border-border pt-4">
              <p className="text-sm font-semibold">Sources <span className="text-xs font-normal text-muted-foreground">Where your information comes from</span></p>
              {own.length === 0 && <p className="text-sm text-muted-foreground">No sources yet. Add the pages or documents you used so every claim can be traced.</p>}
              <ul className="space-y-3">
                {own.map((s) => (
                  <li key={s.id} className="space-y-3 rounded-lg border border-border p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="flex min-w-0 flex-wrap items-center gap-2 text-sm font-medium">
                        <a href={s.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-primary-text underline-offset-2 [overflow-wrap:anywhere] hover:underline">
                          {s.title.trim() || s.url} <ExternalLink aria-hidden className="size-3.5 shrink-0" />
                        </a>
                        {s.origin !== "manual" && <Badge variant="info">{ORIGIN_LABELS[s.origin]}</Badge>}
                      </span>
                      <RemoveButton label={`Remove source ${s.title.trim() || s.url}`} onConfirm={() => onRemoveSource(s.id)} />
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <TextField label="Source link" inputMode="url" value={s.url} onChange={(e) => onChangeSource(s.id, { url: e.target.value })} error={!/^https?:\/\/\S+$/i.test(s.url) ? "Use a link starting with http:// or https://" : undefined} />
                      <TextField label="Source title" optional value={s.title} onChange={(e) => onChangeSource(s.id, { title: e.target.value })} />
                      <SelectField label="Source type" value={s.source_type} onChange={(e) => onChangeSource(s.id, { source_type: e.target.value as SourceRow["source_type"] })}>
                        {SOURCE_TYPES.map((t) => <option key={t} value={t}>{SOURCE_TYPE_LABELS[t]}</option>)}
                      </SelectField>
                      <TextField label="Date retrieved" optional type="date" value={s.retrieved_on} onChange={(e) => onChangeSource(s.id, { retrieved_on: e.target.value })} />
                    </div>
                  </li>
                ))}
              </ul>
              <AddSourceForm onAdd={(input) => onAddSource(c.id, input)} />
            </div>
          </section>
        );
      })}

      <Button type="button" variant="outline" onClick={add} disabled={adding} aria-busy={adding}>
        <Plus /> {adding ? "Adding…" : "Add competitor"}
      </Button>
    </div>
  );
}

"use client";

import * as React from "react";
import { Lightbulb, Pencil, Plus, Quote, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { FormAlert, SelectField, SubmitButton, TextField, TextareaField } from "@/components/forms/fields";
import { AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { createInsightAction, deleteInsightAction, updateInsightAction } from "@/lib/synthesizer/actions";
import { CONFIDENCE_LABELS, CONFIDENCE_LEVELS, INSIGHT_KINDS, INSIGHT_KIND_INFO, PROBLEM_KINDS, PROBLEM_KIND_LABELS, type Confidence, type InsightKind, type ProblemKind } from "@/lib/synthesizer/constants";
import type { InsightRow, ObservationRow, ThemeRow } from "@/lib/synthesizer/schemas";
import { cn } from "@/lib/utils";

type Values = { kind: InsightKind; observation: string; pattern: string; userNeed: string; problemKind: "" | ProblemKind; problemText: string; statement: string; confidence: Confidence; recommendedAction: string; themeId: string; evidenceIds: string[] };

const BLANK: Values = { kind: "interpretation", observation: "", pattern: "", userNeed: "", problemKind: "", problemText: "", statement: "", confidence: "medium", recommendedAction: "", themeId: "", evidenceIds: [] };
const fromRow = (i: InsightRow): Values => ({ kind: i.kind, observation: i.observation ?? "", pattern: i.pattern ?? "", userNeed: i.user_need ?? "", problemKind: i.problem_kind ?? "", problemText: i.problem_text ?? "", statement: i.statement, confidence: i.confidence, recommendedAction: i.recommended_action ?? "", themeId: i.theme_id ?? "", evidenceIds: i.evidence_ids });

function EvidencePicker({ observations, refs, value, onChange, error }: { observations: ObservationRow[]; refs: Map<string, string>; value: string[]; onChange: (ids: string[]) => void; error?: string }) {
  const [query, setQuery] = React.useState("");
  const q = query.trim().toLowerCase();
  const list = observations.filter((o) => !q || o.content.toLowerCase().includes(q) || (o.participant_ref ?? "").toLowerCase().includes(q) || o.tags.some((t) => t.toLowerCase().includes(q)));
  const toggle = (id: string) => onChange(value.includes(id) ? value.filter((v) => v !== id) : [...value, id]);
  return (
    <fieldset className="space-y-2">
      <legend className="text-sm leading-none font-medium">Supporting evidence <span className="font-normal text-muted-foreground">({value.length} selected, at least one needed)</span></legend>
      {observations.length === 0 ? (
        <p className="rounded-lg border border-dashed border-input p-3 text-sm text-muted-foreground">Add observations on the Research material tab first. Every insight has to point at the evidence it rests on.</p>
      ) : (
        <>
          <TextField label="Find an observation" placeholder="Search observations" value={query} onChange={(e) => setQuery(e.target.value)} />
          <ul aria-label="Observations to cite" className="max-h-56 space-y-1 overflow-y-auto rounded-lg border border-border bg-background p-2">
            {list.map((o) => (
              <li key={o.id}>
                <label className={cn("flex cursor-pointer items-start gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-secondary", value.includes(o.id) && "bg-primary-soft")}>
                  <input type="checkbox" checked={value.includes(o.id)} onChange={() => toggle(o.id)} className="mt-0.5 size-4 accent-[var(--primary)]" />
                  <span className="min-w-0 flex-1 [overflow-wrap:anywhere]"><span className="mr-1.5 font-semibold tabular-nums">{refs.get(o.id)}</span>{o.content}{o.participant_ref && <span className="ml-1.5 text-muted-foreground">· {o.participant_ref}</span>}</span>
                </label>
              </li>
            ))}
            {list.length === 0 && <li className="px-2 py-1.5 text-sm text-muted-foreground">No observations match.</li>}
          </ul>
        </>
      )}
      {error && <p role="alert" className="text-sm font-medium text-destructive">{error}</p>}
    </fieldset>
  );
}

function InsightForm({ initial, observations, themes, refs, submitLabel, onSubmit, onCancel }: { initial: Values; observations: ObservationRow[]; themes: ThemeRow[]; refs: Map<string, string>; submitLabel: string; onSubmit: (v: Values) => Promise<{ error: string; errors: Record<string, string> } | null>; onCancel: () => void }) {
  const [v, setV] = React.useState(initial);
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const next: Record<string, string> = {};
    if (!v.statement.trim()) next.statement = "Write the insight statement";
    if (v.evidenceIds.length === 0) next.evidenceIds = "Link at least one observation as evidence";
    setErrors(next);
    if (Object.keys(next).length) return;
    setPending(true);
    setError(null);
    const failure = await onSubmit(v);
    setPending(false);
    if (failure) { setError(failure.error); setErrors(failure.errors); }
  };
  return (
    <form noValidate onSubmit={submit} aria-label={submitLabel} className="space-y-5 rounded-xl border border-border bg-secondary/50 p-4 sm:p-5">
      <fieldset className="space-y-2">
        <legend className="text-sm leading-none font-medium">What kind of statement is this?</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {INSIGHT_KINDS.map((k) => (
            <label key={k} className={cn("flex cursor-pointer gap-2 rounded-lg border bg-background p-3 text-sm", v.kind === k ? "border-primary" : "border-border")}>
              <input type="radio" name="insight-kind" checked={v.kind === k} onChange={() => setV({ ...v, kind: k })} className="mt-0.5 size-4 accent-[var(--primary)]" />
              <span><span className="font-semibold">{INSIGHT_KIND_INFO[k].label}</span><span className="mt-0.5 block text-muted-foreground">{INSIGHT_KIND_INFO[k].description}</span></span>
            </label>
          ))}
        </div>
      </fieldset>
      <TextareaField label="Observation" optional rows={2} maxLength={2000} hint="What you saw or heard, before interpreting it." value={v.observation} onChange={(e) => setV({ ...v, observation: e.target.value })} />
      <EvidencePicker observations={observations} refs={refs} value={v.evidenceIds} onChange={(evidenceIds) => setV({ ...v, evidenceIds })} error={errors.evidenceIds} />
      <div className="grid gap-4 sm:grid-cols-2">
        <SelectField label="Theme" optional value={v.themeId} onChange={(e) => setV({ ...v, themeId: e.target.value })}>
          <option value="">No theme</option>
          {themes.map((t) => <option key={t.id} value={t.id}>{t.title}</option>)}
        </SelectField>
        <TextField label="Pattern" optional maxLength={1000} placeholder="What keeps recurring" value={v.pattern} onChange={(e) => setV({ ...v, pattern: e.target.value })} />
      </div>
      <TextareaField label="User need" optional rows={2} maxLength={1000} placeholder="People need a way to…" value={v.userNeed} onChange={(e) => setV({ ...v, userNeed: e.target.value })} />
      <div className="grid gap-4 sm:grid-cols-[12rem_1fr]">
        <SelectField label="Problem or opportunity" optional value={v.problemKind} onChange={(e) => setV({ ...v, problemKind: e.target.value as "" | ProblemKind })}>
          <option value="">Not set</option>
          {PROBLEM_KINDS.map((k) => <option key={k} value={k}>{PROBLEM_KIND_LABELS[k]}</option>)}
        </SelectField>
        <TextareaField label="Describe it" optional rows={2} maxLength={1000} value={v.problemText} onChange={(e) => setV({ ...v, problemText: e.target.value })} />
      </div>
      <TextareaField label="Insight statement" rows={2} maxLength={1000} placeholder="Because…, people…, which means…" error={errors.statement} value={v.statement} onChange={(e) => setV({ ...v, statement: e.target.value })} />
      <div className="grid gap-4 sm:grid-cols-[12rem_1fr]">
        <SelectField label="Confidence" value={v.confidence} onChange={(e) => setV({ ...v, confidence: e.target.value as Confidence })}>
          {CONFIDENCE_LEVELS.map((c) => <option key={c} value={c}>{CONFIDENCE_LABELS[c]}</option>)}
        </SelectField>
        <TextareaField label="Recommended action" optional rows={2} maxLength={1000} value={v.recommendedAction} onChange={(e) => setV({ ...v, recommendedAction: e.target.value })} />
      </div>
      <FormAlert message={error} />
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
        <SubmitButton pending={pending} pendingLabel="Saving…">{submitLabel}</SubmitButton>
      </div>
    </form>
  );
}

export function InsightsPanel({ synthesisId, insights, observations, themes, refs, onChange, beforeSubmit }: { synthesisId: string; insights: InsightRow[]; observations: ObservationRow[]; themes: ThemeRow[]; refs: Map<string, string>; onChange: (next: InsightRow[]) => void; /** Saves pending board changes first, so a new theme exists before an insight cites it. */ beforeSubmit?: () => Promise<unknown> }) {
  const [creating, setCreating] = React.useState(false);
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [removing, setRemoving] = React.useState<InsightRow | null>(null);
  const [pending, setPending] = React.useState(false);
  const byId = new Map(observations.map((o) => [o.id, o]));
  const themeTitle = new Map(themes.map((t) => [t.id, t.title]));

  const toPayload = (v: Values) => ({ ...v });
  const failure = (r: { error: string; fieldErrors?: Record<string, string[]> }) => ({ error: r.error, errors: Object.fromEntries(Object.entries(r.fieldErrors ?? {}).map(([k, m]) => [k, m[0]])) });

  const create = async (v: Values) => {
    await beforeSubmit?.();
    const r = await createInsightAction(synthesisId, toPayload(v));
    if (!r.ok) return failure(r);
    onChange([...insights, r.data.insight]);
    setCreating(false);
    toast.success("Insight added");
    return null;
  };
  const update = async (id: string, v: Values) => {
    await beforeSubmit?.();
    const r = await updateInsightAction(synthesisId, id, toPayload(v));
    if (!r.ok) return failure(r);
    onChange(insights.map((i) => (i.id === id ? r.data.insight : i)));
    setEditingId(null);
    toast.success("Insight saved");
    return null;
  };
  const remove = async () => {
    if (!removing) return;
    setPending(true);
    const r = await deleteInsightAction(synthesisId, removing.id);
    setPending(false);
    if (!r.ok) return void toast.error(r.error);
    onChange(insights.filter((i) => i.id !== removing.id));
    setRemoving(null);
    toast.success("Insight deleted");
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <p className="max-w-prose text-sm text-muted-foreground">An insight is your interpretation of the evidence. Say what kind of statement it is, how confident you are, and which observations it rests on.</p>
        <Button type="button" size="sm" onClick={() => { setCreating(true); setEditingId(null); }} disabled={creating}><Plus /> New insight</Button>
      </div>
      {creating && <InsightForm initial={BLANK} observations={observations} themes={themes} refs={refs} submitLabel="Save insight" onSubmit={create} onCancel={() => setCreating(false)} />}
      {insights.length === 0 && !creating && (
        <p className="rounded-card border border-dashed border-input bg-secondary px-5 py-8 text-center text-sm text-muted-foreground"><Lightbulb aria-hidden className="mx-auto mb-2 size-5" />No insights yet. Group your observations on the board, then write what they tell you.</p>
      )}
      <ul className="space-y-3">
        {insights.map((i, n) => (
          <li key={i.id} data-insight={i.id}>
            {editingId === i.id ? (
              <InsightForm initial={fromRow(i)} observations={observations} themes={themes} refs={refs} submitLabel="Save changes" onSubmit={(v) => update(i.id, v)} onCancel={() => setEditingId(null)} />
            ) : (
              <article className="rounded-card border border-border bg-card p-4 shadow-card sm:p-5">
                <div className="flex items-start gap-3">
                  <div className="min-w-0 flex-1 space-y-3">
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <span className="font-semibold text-muted-foreground tabular-nums">Insight {n + 1}</span>
                      <Badge variant={INSIGHT_KIND_INFO[i.kind].badge}>{INSIGHT_KIND_INFO[i.kind].label}</Badge>
                      <Badge variant={i.confidence === "high" ? "success" : i.confidence === "low" ? "warning" : "secondary"}>{CONFIDENCE_LABELS[i.confidence]}</Badge>
                      {i.theme_id && themeTitle.get(i.theme_id) && <Badge variant="outline">{themeTitle.get(i.theme_id)}</Badge>}
                      {i.evidence_ids.length === 0 && <Badge variant="warning">No evidence linked</Badge>}
                    </div>
                    <p className="text-base font-semibold [overflow-wrap:anywhere]">{i.statement}</p>
                    <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
                      {([["Observation", i.observation], ["Pattern", i.pattern], ["User need", i.user_need], [i.problem_kind ? PROBLEM_KIND_LABELS[i.problem_kind] : "", i.problem_text], ["Recommended action", i.recommended_action]] as const).filter(([k, val]) => k && val).map(([k, val]) => (
                        <div key={k}><dt className="text-xs text-muted-foreground">{k}</dt><dd className="[overflow-wrap:anywhere]">{val}</dd></div>
                      ))}
                    </dl>
                    <details className="group text-sm">
                      <summary className="inline-flex cursor-pointer list-none items-center gap-1.5 rounded-sm font-semibold text-primary-text outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 [&::-webkit-details-marker]:hidden"><Quote aria-hidden className="size-3.5" />Evidence ({i.evidence_ids.length})</summary>
                      <ul className="mt-2 space-y-1.5 border-t border-border pt-2">
                        {i.evidence_ids.map((id) => byId.get(id)).filter((o): o is ObservationRow => Boolean(o)).map((o) => (
                          <li key={o.id} className="[overflow-wrap:anywhere]"><span className="mr-1.5 font-semibold tabular-nums">{refs.get(o.id)}</span>{o.content}{o.participant_ref && <span className="ml-1.5 text-muted-foreground">· {o.participant_ref}</span>}</li>
                        ))}
                        {i.evidence_ids.length === 0 && <li className="text-muted-foreground">Edit this insight to link observations.</li>}
                      </ul>
                    </details>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <Button type="button" variant="ghost" size="icon" aria-label={`Edit insight ${n + 1}`} onClick={() => { setEditingId(i.id); setCreating(false); }}><Pencil /></Button>
                    <Button type="button" variant="ghost" size="icon" aria-label={`Delete insight ${n + 1}`} onClick={() => setRemoving(i)}><Trash2 /></Button>
                  </div>
                </div>
              </article>
            )}
          </li>
        ))}
      </ul>
      <AlertDialog open={Boolean(removing)} onOpenChange={(open) => !open && setRemoving(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this insight?</AlertDialogTitle>
            <AlertDialogDescription>The insight is deleted. The observations it cites stay. This can&apos;t be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
            <Button variant="destructive" onClick={remove} disabled={pending}>{pending ? "Deleting…" : "Delete insight"}</Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

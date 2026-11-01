"use client";

import * as React from "react";
import { Lightbulb, Pencil, Plus, Quote, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { FormAlert, SelectField, SubmitButton, TextField, TextareaField } from "@/components/forms/fields";
import { AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SideDrawer } from "@/components/ui/side-drawer";
import { createInsightAction, deleteInsightAction, updateInsightAction } from "@/lib/synthesizer/actions";
import { CONFIDENCE_LABELS, CONFIDENCE_LEVELS, INSIGHT_KINDS, INSIGHT_KIND_INFO, OBSERVATION_KIND_LABELS, PROBLEM_KINDS, PROBLEM_KIND_LABELS, type Confidence, type InsightKind, type ProblemKind } from "@/lib/synthesizer/constants";
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
  const [lastEditingId, setLastEditingId] = React.useState<string | null>(null);
  const [evidenceOf, setEvidenceOf] = React.useState<string | null>(null);
  const [lastEvidenceOf, setLastEvidenceOf] = React.useState<string | null>(null);
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
        <Button type="button" size="sm" onClick={() => { setCreating(true); setEditingId(null); }}><Plus /> New insight</Button>
      </div>
            {insights.length === 0 && !creating && (
        <p className="rounded-card border border-dashed border-input bg-secondary px-5 py-8 text-center text-sm text-muted-foreground"><Lightbulb aria-hidden className="mx-auto mb-2 size-5" />No insights yet. Group your observations on the board, then write what they tell you.</p>
      )}
      {insights.length > 0 && (
        <div className="overflow-x-auto rounded-card border border-border bg-card">
          <table className="w-full min-w-[960px] text-left text-sm">
            <caption className="sr-only">Insights</caption>
            <thead className="border-b border-border bg-secondary/60 text-xs text-muted-foreground">
              <tr>
                <th scope="col" className="w-16 px-4 py-2.5 font-semibold">#</th>
                <th scope="col" className="px-4 py-2.5 font-semibold">Insight</th>
                <th scope="col" className="px-4 py-2.5 font-semibold">Type</th>
                <th scope="col" className="px-4 py-2.5 font-semibold">Confidence</th>
                <th scope="col" className="px-4 py-2.5 font-semibold">Theme</th>
                <th scope="col" className="px-4 py-2.5 font-semibold">Recommended action</th>
                <th scope="col" className="px-4 py-2.5 font-semibold">Evidence</th>
                <th scope="col" className="sticky right-0 w-24 bg-secondary px-2 py-2.5"><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {insights.map((i, n) => {
                const detail = ([["Observation", i.observation], ["Pattern", i.pattern], ["User need", i.user_need], [i.problem_kind ? PROBLEM_KIND_LABELS[i.problem_kind] : "", i.problem_text]] as const).filter(([k, val]) => k && val);
                return (
                  <tr key={i.id} data-insight={i.id} className="align-top hover:bg-secondary/40">
                    <th scope="row" className="px-4 py-3 font-semibold tabular-nums">{n + 1}</th>
                    <td className="max-w-md px-4 py-3">
                      <p className="font-semibold [overflow-wrap:anywhere]">{i.statement}</p>
                      {detail.length > 0 && (
                        <details className="mt-1.5 text-sm">
                          <summary className="cursor-pointer list-none rounded-sm text-xs font-semibold text-primary-text outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 [&::-webkit-details-marker]:hidden">More detail</summary>
                          <dl className="mt-2 space-y-2">
                            {detail.map(([k, val]) => (
                              <div key={k}><dt className="text-xs text-muted-foreground">{k}</dt><dd className="[overflow-wrap:anywhere]">{val}</dd></div>
                            ))}
                          </dl>
                        </details>
                      )}
                    </td>
                    <td className="px-4 py-3"><Badge variant={INSIGHT_KIND_INFO[i.kind].badge}>{INSIGHT_KIND_INFO[i.kind].label}</Badge></td>
                    <td className="px-4 py-3"><Badge variant={i.confidence === "high" ? "success" : i.confidence === "low" ? "warning" : "secondary"}>{CONFIDENCE_LABELS[i.confidence]}</Badge></td>
                    <td className="px-4 py-3 text-muted-foreground">{(i.theme_id && themeTitle.get(i.theme_id)) || "—"}</td>
                    <td className="max-w-xs px-4 py-3 text-muted-foreground [overflow-wrap:anywhere]">{i.recommended_action || "—"}</td>
                    <td className="px-4 py-3">
                      {i.evidence_ids.length === 0 && <Badge variant="warning" className="mb-1.5">No evidence linked</Badge>}
                      <button type="button" onClick={() => { setLastEvidenceOf(i.id); setEvidenceOf(i.id); }}
                        className="inline-flex items-center gap-1.5 rounded-sm text-sm font-semibold text-primary-text outline-none hover:underline focus-visible:ring-[3px] focus-visible:ring-ring/50">
                        <Quote aria-hidden className="size-3.5" />Evidence ({i.evidence_ids.length})
                      </button>
                      {i.evidence_ids.length > 0 && (
                        <div className="mt-1.5 flex flex-wrap gap-1">
                          {i.evidence_ids.map((id) => <Badge key={id} variant="outline" className="tabular-nums">{refs.get(id)}</Badge>)}
                        </div>
                      )}
                    </td>
                    <td className="sticky right-0 bg-card px-2 py-1.5 text-right whitespace-nowrap shadow-[-10px_0_8px_-8px_#10101414]">
                      <Button type="button" variant="ghost" size="icon" aria-label={`Edit insight ${n + 1}`} onClick={() => { setLastEditingId(i.id); setEditingId(i.id); setCreating(false); }}><Pencil /></Button>
                      <Button type="button" variant="ghost" size="icon" aria-label={`Delete insight ${n + 1}`} onClick={() => setRemoving(i)}><Trash2 /></Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      {(() => {
        const target = insights.find((x) => x.id === (evidenceOf ?? lastEvidenceOf));
        const items = target ? target.evidence_ids.map((id) => byId.get(id)).filter((o): o is ObservationRow => Boolean(o)) : [];
        return (
          <SideDrawer open={evidenceOf !== null} onOpenChange={(open) => !open && setEvidenceOf(null)} title="Evidence" description={target ? target.statement : undefined}>
            {target && (
              <div className="space-y-4">
                {items.length === 0 ? (
                  <p className="rounded-card border border-dashed border-input bg-secondary px-5 py-8 text-center text-sm text-muted-foreground">No evidence linked. Edit this insight to link observations.</p>
                ) : (
                  <ul aria-label="Evidence for this insight" className="space-y-3">
                    {items.map((o) => (
                      <li key={o.id} className="rounded-card border border-border bg-card p-4">
                        <p className="whitespace-pre-wrap [overflow-wrap:anywhere]">{o.content}</p>
                        <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                          <span className="font-semibold tabular-nums text-foreground">{refs.get(o.id)}</span>
                          <Badge variant="secondary">{OBSERVATION_KIND_LABELS[o.kind]}</Badge>
                          {o.participant_ref && <span>Participant {o.participant_ref}</span>}
                        </p>
                      </li>
                    ))}
                  </ul>
                )}
                <Button type="button" variant="outline" onClick={() => { setEvidenceOf(null); setLastEditingId(target.id); setEditingId(target.id); setCreating(false); }}><Pencil /> Edit insight and evidence</Button>
              </div>
            )}
          </SideDrawer>
        );
      })()}
      <SideDrawer
        size="lg"
        open={creating || editingId !== null}
        onOpenChange={(open) => { if (!open) { setCreating(false); setEditingId(null); } }}
        title={creating ? "New insight" : "Edit insight"}
        description="An insight is your interpretation of the evidence. Say what kind of statement it is, how confident you are, and which observations it rests on."
      >
        {creating ? (
          <InsightForm initial={BLANK} observations={observations} themes={themes} refs={refs} submitLabel="Save insight" onSubmit={create} onCancel={() => setCreating(false)} />
        ) : (
          (() => {
            const target = insights.find((x) => x.id === (editingId ?? lastEditingId));
            return target ? <InsightForm key={target.id} initial={fromRow(target)} observations={observations} themes={themes} refs={refs} submitLabel="Save changes" onSubmit={(v) => update(target.id, v)} onCancel={() => setEditingId(null)} /> : null;
          })()
        )}
      </SideDrawer>
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

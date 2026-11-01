"use client";

import * as React from "react";
import { FileUp, ClipboardPaste, Pencil, Plus, ShieldCheck, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { FormAlert, SelectField, SubmitButton, TextField, TextareaField } from "@/components/forms/fields";
import { ImportFlow } from "@/components/synthesizer/import-flow";
import { AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { addObservationAction, deleteObservationAction, deleteSourceAction, updateObservationAction } from "@/lib/synthesizer/actions";
import { LIMITS, OBSERVATION_KINDS, OBSERVATION_KIND_LABELS, PRIVACY_NOTICE, SOURCE_TYPE_LABELS, type ObservationKind } from "@/lib/synthesizer/constants";
import { observationRefs } from "@/lib/synthesizer/document";
import type { CardRow, InsightRow, ObservationRow, SourceRow } from "@/lib/synthesizer/schemas";

export type MaterialChange =
  | { type: "added"; observations: ObservationRow[]; cards: CardRow[]; source?: SourceRow }
  | { type: "updated"; observation: ObservationRow }
  | { type: "deleted"; observationIds: string[] }
  | { type: "source-removed"; sourceId: string };

type FormValues = { content: string; kind: ObservationKind; participantRef: string; sourceId: string; tags: string };

function ObservationForm({ initial, sources, submitLabel, pending, error, errors, onSubmit, onCancel }: { initial: FormValues; sources: SourceRow[]; submitLabel: string; pending: boolean; error: string | null; errors: Record<string, string>; onSubmit: (v: FormValues) => void; onCancel: () => void }) {
  const [v, setV] = React.useState(initial);
  return (
    <form noValidate aria-label={submitLabel} onSubmit={(e) => { e.preventDefault(); onSubmit(v); }} className="space-y-4 rounded-xl border border-border bg-secondary/50 p-4 sm:p-5">
      <TextareaField label="What was observed or said" rows={3} maxLength={LIMITS.statementChars} error={errors.content} value={v.content} onChange={(e) => setV({ ...v, content: e.target.value })} />
      <div className="grid gap-4 sm:grid-cols-2">
        <SelectField label="Card type" value={v.kind} onChange={(e) => setV({ ...v, kind: e.target.value as ObservationKind })}>
          {OBSERVATION_KINDS.map((k) => <option key={k} value={k}>{OBSERVATION_KIND_LABELS[k]}</option>)}
        </SelectField>
        <TextField label="Participant" optional placeholder="e.g. P3" maxLength={120} hint="A code, not a name." error={errors.participantRef} value={v.participantRef} onChange={(e) => setV({ ...v, participantRef: e.target.value })} />
        <SelectField label="Source" optional error={errors.sourceId} value={v.sourceId} onChange={(e) => setV({ ...v, sourceId: e.target.value })}>
          <option value="">No source</option>
          {sources.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </SelectField>
        <TextField label="Tags" optional placeholder="pricing, onboarding" hint="Separate with commas." value={v.tags} onChange={(e) => setV({ ...v, tags: e.target.value })} />
      </div>
      <FormAlert message={error} />
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
        <SubmitButton pending={pending} pendingLabel="Saving…">{submitLabel}</SubmitButton>
      </div>
    </form>
  );
}

const BLANK: FormValues = { content: "", kind: "observation", participantRef: "", sourceId: "", tags: "" };

export function MaterialPanel({ synthesisId, sources, observations, insights, editingId, onEdit, onChange }: { synthesisId: string; sources: SourceRow[]; observations: ObservationRow[]; insights: InsightRow[]; editingId: string | null; onEdit: (id: string | null) => void; onChange: (c: MaterialChange) => void }) {
  const [adding, setAdding] = React.useState<null | "statement" | "paste" | "file">(null);
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [query, setQuery] = React.useState("");
  const [participant, setParticipant] = React.useState("");
  const [tag, setTag] = React.useState("");
  const [removing, setRemoving] = React.useState<ObservationRow | null>(null);
  const [removingSource, setRemovingSource] = React.useState<SourceRow | null>(null);
  const [alsoDelete, setAlsoDelete] = React.useState(false);

  const refs = React.useMemo(() => observationRefs(observations), [observations]);
  const sourceName = new Map(sources.map((s) => [s.id, s.name]));
  const participants = [...new Set(observations.map((o) => o.participant_ref?.trim()).filter((p): p is string => Boolean(p)))].sort();
  const tags = [...new Set(observations.flatMap((o) => o.tags))].sort((a, b) => a.localeCompare(b));
  const q = query.trim().toLowerCase();
  const shown = observations.filter((o) => (!q || o.content.toLowerCase().includes(q)) && (!participant || o.participant_ref === participant) && (!tag || o.tags.includes(tag)));
  const usedBy = (id: string) => insights.filter((i) => i.evidence_ids.includes(id)).length;

  const submit = async (v: FormValues, id?: string) => {
    setPending(true);
    setError(null);
    setErrors({});
    const payload = { content: v.content, kind: v.kind, participantRef: v.participantRef, sourceId: v.sourceId, tags: v.tags.split(",") };
    const failed = (result: { ok: false; error: string; fieldErrors?: Record<string, string[]> }) => {
      setErrors(Object.fromEntries(Object.entries(result.fieldErrors ?? {}).map(([k, m]) => [k, m[0]])));
      setError(result.error);
    };
    if (id) {
      const result = await updateObservationAction(synthesisId, id, payload);
      setPending(false);
      if (!result.ok) return failed(result);
      onChange({ type: "updated", observation: result.data.observation });
      toast.success("Observation saved");
      onEdit(null);
    } else {
      const result = await addObservationAction(synthesisId, payload);
      setPending(false);
      if (!result.ok) return failed(result);
      onChange({ type: "added", observations: [result.data.observation], cards: [result.data.card] });
      toast.success("Observation added");
      setAdding(null);
    }
  };

  const remove = async () => {
    if (!removing) return;
    setPending(true);
    const result = await deleteObservationAction(synthesisId, removing.id);
    setPending(false);
    if (!result.ok) return void toast.error(result.error);
    onChange({ type: "deleted", observationIds: [removing.id] });
    setRemoving(null);
    toast.success("Observation deleted");
  };

  const removeSource = async () => {
    if (!removingSource) return;
    setPending(true);
    const result = await deleteSourceAction(synthesisId, removingSource.id, alsoDelete);
    setPending(false);
    if (!result.ok) return void toast.error(result.error);
    if (result.data.deletedObservationIds.length) onChange({ type: "deleted", observationIds: result.data.deletedObservationIds });
    onChange({ type: "source-removed", sourceId: removingSource.id });
    setRemovingSource(null);
    setAlsoDelete(false);
    toast.success("Source deleted");
  };

  const editing = observations.find((o) => o.id === editingId);

  return (
    <div className="space-y-6">
      <p role="note" className="flex items-start gap-2.5 rounded-xl border border-info/30 bg-info-soft p-4 text-sm">
        <ShieldCheck aria-hidden className="mt-0.5 size-4 shrink-0" />
        <span><strong>Privacy.</strong> {PRIVACY_NOTICE}</span>
      </p>

      <section aria-labelledby="add-material" className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 id="add-material" className="text-base font-bold">Add research material</h2>
          <div className="flex flex-wrap gap-2">
            <Button type="button" size="sm" variant={adding === "statement" ? "default" : "outline"} onClick={() => { setError(null); setErrors({}); setAdding(adding === "statement" ? null : "statement"); }}><Plus /> Add a statement</Button>
            <Button type="button" size="sm" variant={adding === "paste" ? "default" : "outline"} onClick={() => setAdding(adding === "paste" ? null : "paste")}><ClipboardPaste /> Paste notes</Button>
            <Button type="button" size="sm" variant={adding === "file" ? "default" : "outline"} onClick={() => setAdding(adding === "file" ? null : "file")}><FileUp /> Upload a file</Button>
          </div>
        </div>
        {adding === "statement" && <ObservationForm initial={BLANK} sources={sources} submitLabel="Add observation" pending={pending} error={error} errors={errors} onSubmit={(v) => submit(v)} onCancel={() => setAdding(null)} />}
        {(adding === "paste" || adding === "file") && (
          <ImportFlow key={adding} synthesisId={synthesisId} mode={adding} onCancel={() => setAdding(null)} onImported={(r) => { onChange({ type: "added", observations: r.observations, cards: r.cards, source: r.source }); setAdding(null); }} />
        )}
      </section>

      {sources.length > 0 && (
        <section aria-labelledby="sources-heading" className="space-y-3">
          <h2 id="sources-heading" className="text-base font-bold">Sources <span className="ml-1 text-sm font-medium text-muted-foreground tabular-nums">{sources.length}</span></h2>
          <ul className="divide-y divide-border rounded-card border border-border bg-card">
            {sources.map((s) => {
              const count = observations.filter((o) => o.source_id === s.id).length;
              return (
                <li key={s.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3 text-sm">
                  <span className="min-w-0 flex-1 font-semibold [overflow-wrap:anywhere]">{s.name}</span>
                  <span className="text-muted-foreground">{SOURCE_TYPE_LABELS[s.source_type]}{s.participant_ref ? ` · ${s.participant_ref}` : ""}{s.file_name ? ` · ${s.file_name}` : ""}</span>
                  <span className="text-muted-foreground tabular-nums">{count} {count === 1 ? "observation" : "observations"}</span>
                  <Button type="button" variant="ghost" size="icon" aria-label={`Delete source ${s.name}`} onClick={() => { setAlsoDelete(false); setRemovingSource(s); }}><Trash2 /></Button>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <section aria-labelledby="observations-heading" className="space-y-3">
        <h2 id="observations-heading" className="text-base font-bold">Observations <span className="ml-1 text-sm font-medium text-muted-foreground tabular-nums">{observations.length}</span></h2>
        {observations.length === 0 ? (
          <p className="rounded-card border border-dashed border-input bg-secondary px-5 py-8 text-center text-sm text-muted-foreground">
            No observations yet. Add a statement, paste interview notes, or upload a text file. Each one becomes a card you can group on the Affinity board.
          </p>
        ) : (
          <>
            <div className="grid gap-3 sm:grid-cols-3">
              <TextField label="Search" placeholder="Search observations" value={query} onChange={(e) => setQuery(e.target.value)} />
              <SelectField label="Participant" value={participant} onChange={(e) => setParticipant(e.target.value)}>
                <option value="">All participants</option>
                {participants.map((p) => <option key={p} value={p}>{p}</option>)}
              </SelectField>
              <SelectField label="Tag" value={tag} onChange={(e) => setTag(e.target.value)}>
                <option value="">All tags</option>
                {tags.map((t) => <option key={t} value={t}>{t}</option>)}
              </SelectField>
            </div>
            {shown.length === 0 && <p className="text-sm text-muted-foreground">No observations match those filters.</p>}
            <ul className="space-y-3">
              {shown.map((o) => (
                <li key={o.id} data-observation={o.id}>
                  {editing?.id === o.id ? (
                    <ObservationForm initial={{ content: o.content, kind: o.kind, participantRef: o.participant_ref ?? "", sourceId: o.source_id ?? "", tags: o.tags.join(", ") }} sources={sources} submitLabel="Save observation" pending={pending} error={error} errors={errors} onSubmit={(v) => submit(v, o.id)} onCancel={() => onEdit(null)} />
                  ) : (
                    <article className="rounded-card border border-border bg-card p-4 shadow-card">
                      <div className="flex items-start gap-3">
                        <div className="min-w-0 flex-1 space-y-2">
                          <p className="whitespace-pre-wrap [overflow-wrap:anywhere]">{o.content}</p>
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-muted-foreground">
                            <span className="font-semibold tabular-nums text-foreground">{refs.get(o.id)}</span>
                            <Badge variant="secondary">{OBSERVATION_KIND_LABELS[o.kind]}</Badge>
                            {o.participant_ref && <span>Participant {o.participant_ref}</span>}
                            {o.source_id && sourceName.get(o.source_id) && <span>{sourceName.get(o.source_id)}</span>}
                            {o.tags.map((t) => <Badge key={t} variant="outline">{t}</Badge>)}
                            {usedBy(o.id) > 0 && <span>Evidence for {usedBy(o.id)} {usedBy(o.id) === 1 ? "insight" : "insights"}</span>}
                          </div>
                        </div>
                        <div className="flex shrink-0 gap-1">
                          <Button type="button" variant="ghost" size="icon" aria-label={`Edit observation ${refs.get(o.id)}`} onClick={() => { setError(null); setErrors({}); onEdit(o.id); }}><Pencil /></Button>
                          <Button type="button" variant="ghost" size="icon" aria-label={`Delete observation ${refs.get(o.id)}`} onClick={() => setRemoving(o)}><Trash2 /></Button>
                        </div>
                      </div>
                    </article>
                  )}
                </li>
              ))}
            </ul>
          </>
        )}
      </section>

      <AlertDialog open={Boolean(removing)} onOpenChange={(open) => !open && setRemoving(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this observation?</AlertDialogTitle>
            <AlertDialogDescription>
              It will be removed from the board{removing && usedBy(removing.id) > 0 ? ` and from the evidence of ${usedBy(removing.id)} ${usedBy(removing.id) === 1 ? "insight" : "insights"}` : ""}. This can&apos;t be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
            <Button variant="destructive" onClick={remove} disabled={pending}>{pending ? "Deleting…" : "Delete observation"}</Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={Boolean(removingSource)} onOpenChange={(open) => !open && setRemovingSource(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this source?</AlertDialogTitle>
            <AlertDialogDescription>
              <strong className="text-foreground">{removingSource?.name}</strong> will be removed. Choose what happens to the {removingSource ? observations.filter((o) => o.source_id === removingSource.id).length : 0} observations from it.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <fieldset className="space-y-2 text-sm">
            <label className="flex items-center gap-2"><input type="radio" name="source-delete" checked={!alsoDelete} onChange={() => setAlsoDelete(false)} className="size-4 accent-[var(--primary)]" /> Keep the observations (they just lose their source)</label>
            <label className="flex items-center gap-2"><input type="radio" name="source-delete" checked={alsoDelete} onChange={() => setAlsoDelete(true)} className="size-4 accent-[var(--primary)]" /> Delete the observations too</label>
          </fieldset>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
            <Button variant="destructive" onClick={removeSource} disabled={pending}>{pending ? "Deleting…" : "Delete source"}</Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

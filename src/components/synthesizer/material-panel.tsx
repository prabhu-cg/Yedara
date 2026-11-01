"use client";

import * as React from "react";
import { FileUp, ClipboardPaste, Pencil, Plus, Search, ShieldCheck, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { FormAlert, SelectField, SubmitButton, TextField, TextareaField } from "@/components/forms/fields";
import { ImportFlow } from "@/components/synthesizer/import-flow";
import { AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/ui/native-select";
import { SideDrawer } from "@/components/ui/side-drawer";
import { cn } from "@/lib/utils";
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
  // The drawer keeps showing its last form while it slides out.
  const [drawerMode, setDrawerMode] = React.useState<"statement" | "paste" | "file">("statement");
  const [lastEditingId, setLastEditingId] = React.useState<string | null>(null);
  const openAdding = (mode: "statement" | "paste" | "file") => { setError(null); setErrors({}); setDrawerMode(mode); setAdding(mode); };
  const startEdit = (id: string) => { setError(null); setErrors({}); setLastEditingId(id); onEdit(id); };
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [view, setView] = React.useState<"observations" | "sources">("observations");
  const [kindFilter, setKindFilter] = React.useState("");
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
  const shown = observations.filter((o) => (!q || o.content.toLowerCase().includes(q)) && (!participant || o.participant_ref === participant) && (!tag || o.tags.includes(tag)) && (!kindFilter || o.kind === kindFilter));
  const filtered = Boolean(q || participant || tag || kindFilter);
  const clearFilters = () => { setQuery(""); setParticipant(""); setTag(""); setKindFilter(""); };
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
            <Button type="button" size="sm" variant="outline" onClick={() => openAdding("statement")}><Plus /> Add a statement</Button>
            <Button type="button" size="sm" variant="outline" onClick={() => openAdding("paste")}><ClipboardPaste /> Paste notes</Button>
            <Button type="button" size="sm" variant="outline" onClick={() => openAdding("file")}><FileUp /> Upload a file</Button>
          </div>
        </div>
        <SideDrawer
          open={adding !== null}
          onOpenChange={(open) => !open && setAdding(null)}
          title={drawerMode === "statement" ? "Add a statement" : drawerMode === "paste" ? "Paste notes" : "Upload a file"}
          description={drawerMode === "statement" ? "One observation, quote or note. It becomes a card you can group on the board." : undefined}
        >
          {drawerMode === "statement" ? (
            <ObservationForm initial={BLANK} sources={sources} submitLabel="Add observation" pending={pending} error={error} errors={errors} onSubmit={(v) => submit(v)} onCancel={() => setAdding(null)} />
          ) : (
            <ImportFlow key={drawerMode} synthesisId={synthesisId} mode={drawerMode} onCancel={() => setAdding(null)} onImported={(r) => { onChange({ type: "added", observations: r.observations, cards: r.cards, source: r.source }); setAdding(null); }} />
          )}
        </SideDrawer>
      </section>

      <div className="space-y-4">
        <div role="tablist" aria-label="Research material views" className="inline-flex items-center gap-0.5 rounded-lg bg-muted p-0.5" onKeyDown={(e) => {
          if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
          e.preventDefault();
          setView((v) => (v === "observations" ? "sources" : "observations"));
          requestAnimationFrame(() => document.querySelector<HTMLElement>('[data-material-view][aria-selected="true"]')?.focus());
        }}>
          {([["observations", "Observations", observations.length], ["sources", "Sources", sources.length]] as const).map(([id, label, count]) => (
            <button key={id} type="button" role="tab" id={`material-tab-${id}`} aria-selected={view === id} aria-controls={`material-panel-${id}`} tabIndex={view === id ? 0 : -1} data-material-view onClick={() => setView(id)}
              className={cn("inline-flex h-8 items-center gap-2 rounded-md px-3 text-sm font-medium outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50", view === id ? "bg-background font-semibold text-foreground shadow-card" : "text-muted-foreground hover:text-foreground")}>
              {label}
              <span className="text-xs text-muted-foreground tabular-nums">{count}</span>
            </button>
          ))}
        </div>

        {view === "sources" && (
          <div role="tabpanel" id="material-panel-sources" aria-labelledby="material-tab-sources">
            {sources.length === 0 ? (
              <p className="rounded-card border border-dashed border-input bg-secondary px-5 py-8 text-center text-sm text-muted-foreground">
                No sources yet. Pasting notes or uploading a file creates a source, so every observation can say where it came from.
              </p>
            ) : (
              <div className="overflow-x-auto rounded-card border border-border bg-card">
                <table className="w-full min-w-[640px] text-left text-sm">
                  <caption className="sr-only">Sources of research material</caption>
                  <thead className="border-b border-border bg-secondary/60 text-xs text-muted-foreground">
                    <tr>
                      <th scope="col" className="px-4 py-2.5 font-semibold">Source</th>
                      <th scope="col" className="px-4 py-2.5 font-semibold">Type</th>
                      <th scope="col" className="px-4 py-2.5 font-semibold">Participant</th>
                      <th scope="col" className="px-4 py-2.5 font-semibold">File</th>
                      <th scope="col" className="px-4 py-2.5 text-right font-semibold">Observations</th>
                      <th scope="col" className="sticky right-0 w-14 bg-secondary px-2 py-2.5"><span className="sr-only">Actions</span></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {sources.map((s) => {
                      const count = observations.filter((o) => o.source_id === s.id).length;
                      return (
                        <tr key={s.id} className="hover:bg-secondary/40">
                          <th scope="row" className="px-4 py-3 font-semibold [overflow-wrap:anywhere]">{s.name}</th>
                          <td className="px-4 py-3 text-muted-foreground">{SOURCE_TYPE_LABELS[s.source_type]}</td>
                          <td className="px-4 py-3 text-muted-foreground">{s.participant_ref || "—"}</td>
                          <td className="px-4 py-3 text-muted-foreground [overflow-wrap:anywhere]">{s.file_name || "—"}</td>
                          <td className="px-4 py-3 text-right tabular-nums">{count}</td>
                          <td className="sticky right-0 bg-card px-2 py-1.5 text-right shadow-[-10px_0_8px_-8px_#10101414]">
                            <Button type="button" variant="ghost" size="icon" aria-label={`Delete source ${s.name}`} onClick={() => { setAlsoDelete(false); setRemovingSource(s); }}><Trash2 /></Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {view === "observations" && (
          <div role="tabpanel" id="material-panel-observations" aria-labelledby="material-tab-observations" className="space-y-3">
            {observations.length === 0 ? (
              <p className="rounded-card border border-dashed border-input bg-secondary px-5 py-8 text-center text-sm text-muted-foreground">
                No observations yet. Add a statement, paste interview notes, or upload a text file. Each one becomes a card you can group on the Affinity board.
              </p>
            ) : (
              <>
                <div role="search" className="flex flex-wrap items-center gap-2">
                  <div className="relative min-w-52 flex-1 sm:max-w-sm">
                    <Search aria-hidden className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                    <input type="search" aria-label="Search observations" placeholder="Search observations" value={query} onChange={(e) => setQuery(e.target.value)}
                      className="h-9 w-full rounded-lg border border-input bg-background pr-3 pl-9 text-base text-foreground placeholder:text-foreground/60 focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none md:text-sm" />
                  </div>
                  <NativeSelect aria-label="Participant" value={participant} onChange={(e) => setParticipant(e.target.value)} className={cn("w-auto min-w-40", participant && "border-primary")}>
                    <option value="">All participants</option>
                    {participants.map((p) => <option key={p} value={p}>{p}</option>)}
                  </NativeSelect>
                  <NativeSelect aria-label="Tag" value={tag} onChange={(e) => setTag(e.target.value)} className={cn("w-auto min-w-32", tag && "border-primary")}>
                    <option value="">All tags</option>
                    {tags.map((t) => <option key={t} value={t}>{t}</option>)}
                  </NativeSelect>
                  <NativeSelect aria-label="Card type" value={kindFilter} onChange={(e) => setKindFilter(e.target.value)} className={cn("w-auto min-w-36", kindFilter && "border-primary")}>
                    <option value="">All types</option>
                    {OBSERVATION_KINDS.map((k) => <option key={k} value={k}>{OBSERVATION_KIND_LABELS[k]}</option>)}
                  </NativeSelect>
                  {filtered && (
                    <Button type="button" variant="ghost" size="sm" onClick={clearFilters}><X /> Clear filters</Button>
                  )}
                  <p role="status" className="ml-auto text-sm text-muted-foreground tabular-nums">{filtered ? `${shown.length} of ${observations.length} shown` : `${observations.length} ${observations.length === 1 ? "observation" : "observations"}`}</p>
                </div>

                {shown.length === 0 ? (
                  <p className="rounded-card border border-dashed border-input bg-secondary px-5 py-8 text-center text-sm text-muted-foreground">
                    No observations match those filters. <button type="button" onClick={clearFilters} className="font-semibold text-primary-text underline underline-offset-4">Clear filters</button>
                  </p>
                ) : (
                  <div className="overflow-x-auto rounded-card border border-border bg-card">
                    <table className="w-full min-w-[820px] text-left text-sm">
                      <caption className="sr-only">Observations</caption>
                      <thead className="border-b border-border bg-secondary/60 text-xs text-muted-foreground">
                        <tr>
                          <th scope="col" className="w-16 px-4 py-2.5 font-semibold">Ref</th>
                          <th scope="col" className="px-4 py-2.5 font-semibold">Observation</th>
                          <th scope="col" className="px-4 py-2.5 font-semibold">Type</th>
                          <th scope="col" className="px-4 py-2.5 font-semibold">Participant</th>
                          <th scope="col" className="px-4 py-2.5 font-semibold">Source</th>
                          <th scope="col" className="px-4 py-2.5 font-semibold">Tags</th>
                          <th scope="col" className="px-4 py-2.5 font-semibold">Evidence for</th>
                          <th scope="col" className="sticky right-0 w-24 bg-secondary px-2 py-2.5"><span className="sr-only">Actions</span></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {shown.map((o) => (
                          <tr key={o.id} data-observation={o.id} className="align-top hover:bg-secondary/40">
                            <th scope="row" className="px-4 py-3 font-semibold tabular-nums">{refs.get(o.id)}</th>
                            <td className="max-w-md px-4 py-3"><p className="whitespace-pre-wrap [overflow-wrap:anywhere]">{o.content}</p></td>
                            <td className="px-4 py-3"><Badge variant="secondary">{OBSERVATION_KIND_LABELS[o.kind]}</Badge></td>
                            <td className="px-4 py-3 text-muted-foreground">{o.participant_ref || "—"}</td>
                            <td className="px-4 py-3 text-muted-foreground [overflow-wrap:anywhere]">{(o.source_id && sourceName.get(o.source_id)) || "—"}</td>
                            <td className="px-4 py-3">
                              {o.tags.length ? <div className="flex flex-wrap gap-1">{o.tags.map((t) => <Badge key={t} variant="outline">{t}</Badge>)}</div> : <span className="text-muted-foreground">—</span>}
                            </td>
                            <td className="px-4 py-3 text-muted-foreground tabular-nums">{usedBy(o.id) > 0 ? `${usedBy(o.id)} ${usedBy(o.id) === 1 ? "insight" : "insights"}` : "—"}</td>
                            <td className="sticky right-0 bg-card px-2 py-1.5 text-right whitespace-nowrap shadow-[-10px_0_8px_-8px_#10101414]">
                              <Button type="button" variant="ghost" size="icon" aria-label={`Edit observation ${refs.get(o.id)}`} onClick={() => startEdit(o.id)}><Pencil /></Button>
                              <Button type="button" variant="ghost" size="icon" aria-label={`Delete observation ${refs.get(o.id)}`} onClick={() => setRemoving(o)}><Trash2 /></Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {(() => {
        const target = observations.find((o) => o.id === (editingId ?? lastEditingId));
        return (
          <SideDrawer open={Boolean(editing)} onOpenChange={(open) => !open && onEdit(null)} title={`Edit observation ${target ? refs.get(target.id) ?? "" : ""}`.trim()}>
            {target && (
              <ObservationForm key={target.id} initial={{ content: target.content, kind: target.kind, participantRef: target.participant_ref ?? "", sourceId: target.source_id ?? "", tags: target.tags.join(", ") }} sources={sources} submitLabel="Save observation" pending={pending} error={error} errors={errors} onSubmit={(v) => submit(v, target.id)} onCancel={() => onEdit(null)} />
            )}
          </SideDrawer>
        );
      })()}

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

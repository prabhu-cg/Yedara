"use client";

import * as React from "react";
import { ArrowDown, ArrowUp, CircleCheck, Plus, Sparkles, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { EmotionIndicator } from "@/components/journeys/emotion";
import { AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { addItemAction, addStageAction, convertItemToOpportunityAction, deleteItemAction, deleteStageAction, reorderStagesAction } from "@/lib/journeys/actions";
import { CONVERTIBLE_KINDS, EMOTIONS, EMOTION_LABELS, EVIDENCE_KINDS, ITEM_KINDS, ITEM_KIND_INFO, JOURNEY_LIMITS, SUGGESTED_STAGES, type ItemKind } from "@/lib/journeys/constants";
import type { CandidateRow, ItemRow, StageRow } from "@/lib/journeys/schemas";
import type { EvidenceOption } from "@/lib/synthesizer/queries";
import { cn } from "@/lib/utils";

export type StageEdit = { name: string; emotion: number | null; emotionNote: string };
export type ItemEdit = { content: string; evidenceNote: string; observationId: string };

type Props = {
  journeyId: string;
  stages: StageRow[];
  items: ItemRow[];
  candidates: CandidateRow[];
  evidenceOptions: EvidenceOption[];
  setStages: React.Dispatch<React.SetStateAction<StageRow[]>>;
  setItems: React.Dispatch<React.SetStateAction<ItemRow[]>>;
  setCandidates: React.Dispatch<React.SetStateAction<CandidateRow[]>>;
  editStage: (id: string, edit: StageEdit) => void;
  editItem: (id: string, edit: ItemEdit) => void;
  /** Saves edits still waiting for autosave, so a hand-off carries what is on screen. */
  flush: () => Promise<unknown>;
};

function AddRow({ kind, onAdd }: { kind: ItemKind; onAdd: (content: string) => Promise<boolean> }) {
  const [value, setValue] = React.useState("");
  const [pending, setPending] = React.useState(false);
  const info = ITEM_KIND_INFO[kind];
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!value.trim() || pending) return;
    setPending(true);
    const ok = await onAdd(value.trim());
    setPending(false);
    if (ok) setValue("");
  };
  return (
    <form onSubmit={submit} className="flex gap-2">
      <Input aria-label={info.addLabel} placeholder={info.placeholder} maxLength={JOURNEY_LIMITS.itemChars} value={value} onChange={(e) => setValue(e.target.value)} />
      <Button type="submit" variant="outline" size="sm" disabled={!value.trim() || pending} aria-label={`${info.addLabel}: confirm`}><Plus /> Add</Button>
    </form>
  );
}

export function JourneyEditor(p: Props) {
  const [newStage, setNewStage] = React.useState("");
  const [removing, setRemoving] = React.useState<StageRow | null>(null);
  const [pending, setPending] = React.useState(false);
  const candidateOf = new Map(p.candidates.filter((c) => c.source_item_id).map((c) => [c.source_item_id as string, c]));

  const addStage = async (name: string) => {
    const result = await addStageAction(p.journeyId, name);
    if (!result.ok) { toast.error(result.error); return false; }
    p.setStages((s) => [...s, result.data.stage]);
    return true;
  };
  const submitStage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStage.trim()) return;
    if (await addStage(newStage.trim())) setNewStage("");
  };

  const move = async (index: number, dir: -1 | 1) => {
    const next = [...p.stages];
    const to = index + dir;
    if (to < 0 || to >= next.length) return;
    [next[index], next[to]] = [next[to], next[index]];
    const before = p.stages;
    p.setStages(next.map((s, i) => ({ ...s, position: i * 10 })));
    const result = await reorderStagesAction(p.journeyId, next.map((s) => s.id));
    if (!result.ok) { p.setStages(before); toast.error(result.error); }
  };

  const removeStage = async () => {
    if (!removing) return;
    setPending(true);
    const result = await deleteStageAction(p.journeyId, removing.id);
    setPending(false);
    if (!result.ok) return void toast.error(result.error);
    p.setStages((s) => s.filter((x) => x.id !== removing.id));
    p.setItems((all) => all.filter((i) => i.stage_id !== removing.id));
    p.setCandidates((all) => all.map((c) => (c.stage_id === removing.id ? { ...c, stage_id: null, source_item_id: null } : c)));
    setRemoving(null);
    toast.success("Stage deleted");
  };

  const addItem = async (stageId: string, kind: ItemKind, content: string) => {
    const result = await addItemAction(p.journeyId, { stageId, kind, content });
    if (!result.ok) { toast.error(result.error); return false; }
    p.setItems((all) => [...all, result.data.item]);
    return true;
  };

  const removeItem = async (item: ItemRow) => {
    const result = await deleteItemAction(p.journeyId, item.id);
    if (!result.ok) return void toast.error(result.error);
    p.setItems((all) => all.filter((i) => i.id !== item.id));
    p.setCandidates((all) => all.map((c) => (c.source_item_id === item.id ? { ...c, source_item_id: null } : c)));
  };

  const convert = async (item: ItemRow) => {
    await p.flush();
    const result = await convertItemToOpportunityAction(p.journeyId, item.id);
    if (!result.ok) return void toast.error(result.error);
    p.setCandidates((all) => [...all, result.data.candidate]);
    toast.success("Added to opportunities");
  };

  const unused = SUGGESTED_STAGES.filter((s) => !p.stages.some((x) => x.name.trim().toLowerCase() === s.toLowerCase()));
  const edit = (stage: StageRow, patch: Partial<StageEdit>) => p.editStage(stage.id, { name: stage.name, emotion: stage.emotion, emotionNote: stage.emotion_note ?? "", ...patch });
  const editI = (item: ItemRow, patch: Partial<ItemEdit>) => p.editItem(item.id, { content: item.content, evidenceNote: item.evidence_note ?? "", observationId: item.observation_id ?? "", ...patch });

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <form onSubmit={submitStage} className="flex max-w-xl gap-2">
          <Input aria-label="New stage name" placeholder="Name a stage, e.g. Onboarding" maxLength={JOURNEY_LIMITS.stageName} value={newStage} onChange={(e) => setNewStage(e.target.value)} />
          <Button type="submit" disabled={!newStage.trim() || p.stages.length >= JOURNEY_LIMITS.stages}><Plus /> Add stage</Button>
        </form>
        {unused.length > 0 && p.stages.length < JOURNEY_LIMITS.stages && (
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="inline-flex items-center gap-1.5 text-muted-foreground"><Sparkles aria-hidden className="size-4" /> Optional suggestions:</span>
            {unused.map((s) => <Button key={s} type="button" variant="outline" size="xs" onClick={() => addStage(s)} aria-label={`Add suggested stage ${s}`}><Plus /> {s}</Button>)}
          </div>
        )}
      </div>

      {p.stages.length === 0 && <p className="rounded-card border border-dashed border-input bg-secondary px-5 py-8 text-center text-sm text-muted-foreground">No stages yet. Add the steps of the experience in order, from first contact to the last. You can rename and reorder them any time.</p>}

      <ol className="space-y-5">
        {p.stages.map((stage, index) => {
          const stageItems = p.items.filter((i) => i.stage_id === stage.id);
          return (
            <li key={stage.id} data-stage={stage.id}>
              <section aria-label={`Stage ${index + 1}: ${stage.name}`} className="rounded-card border border-border bg-card p-4 shadow-card sm:p-5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary-soft text-sm font-bold text-primary-text tabular-nums">{index + 1}</span>
                  <Input aria-label={`Name of stage ${index + 1}`} aria-invalid={!stage.name.trim()} value={stage.name} maxLength={JOURNEY_LIMITS.stageName} onChange={(e) => edit(stage, { name: e.target.value })} className="min-w-40 flex-1 text-base font-bold" />
                  <Button type="button" variant="ghost" size="icon" aria-label={`Move stage ${stage.name} earlier`} disabled={index === 0} onClick={() => move(index, -1)}><ArrowUp /></Button>
                  <Button type="button" variant="ghost" size="icon" aria-label={`Move stage ${stage.name} later`} disabled={index === p.stages.length - 1} onClick={() => move(index, 1)}><ArrowDown /></Button>
                  <Button type="button" variant="ghost" size="icon" aria-label={`Delete stage ${stage.name}`} onClick={() => setRemoving(stage)}><Trash2 /></Button>
                </div>
                {!stage.name.trim() && <p role="alert" className="mt-1 text-sm font-medium text-destructive">Name the stage. It isn&apos;t saved while the name is empty.</p>}

                <fieldset className="mt-4 space-y-2">
                  <legend className="text-sm font-semibold">How does the person feel here?</legend>
                  <div role="radiogroup" aria-label={`Emotion at ${stage.name}`} className="flex flex-wrap gap-1.5">
                    {[null, ...EMOTIONS].map((e) => (
                      <button key={e ?? "none"} type="button" role="radio" aria-checked={stage.emotion === e} onClick={() => edit(stage, { emotion: e })} className={cn("rounded-md border px-2.5 py-1.5 text-sm outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50", stage.emotion === e ? "border-primary bg-primary-soft font-semibold" : "border-border bg-background hover:bg-secondary")}>
                        {e === null ? "Not rated" : <EmotionIndicator emotion={e} />}
                      </button>
                    ))}
                  </div>
                  <Input aria-label={`Emotion note for ${stage.name}`} placeholder="Why they feel this way (optional)" maxLength={300} value={stage.emotion_note ?? ""} onChange={(e) => edit(stage, { emotionNote: e.target.value })} />
                  <p className="text-xs text-muted-foreground">{stage.emotion === null ? "Left unrated, the stage is skipped on the emotion curve rather than counted as neutral." : `${EMOTION_LABELS[stage.emotion as 1]}, shown on the emotion curve.`}</p>
                </fieldset>

                <div className="mt-5 grid gap-x-8 gap-y-5 lg:grid-cols-2">
                  {ITEM_KINDS.map((kind) => {
                    const info = ITEM_KIND_INFO[kind];
                    const list = stageItems.filter((i) => i.kind === kind);
                    return (
                      <div key={kind} data-kind={kind} role="group" aria-label={`${info.plural} for ${stage.name}`} className="space-y-2">
                        <h4 className="text-sm font-semibold">{info.plural} <span className="font-normal text-muted-foreground tabular-nums">{list.length}</span></h4>
                        <ul className="space-y-2">
                          {list.map((item) => {
                            const candidate = candidateOf.get(item.id);
                            return (
                              <li key={item.id} className="space-y-1.5 rounded-lg border border-border bg-background p-2">
                                <div className="flex items-start gap-1">
                                  <Textarea aria-label={`${info.label}: ${item.content.slice(0, 40)}`} rows={2} maxLength={JOURNEY_LIMITS.itemChars} value={item.content} aria-invalid={!item.content.trim()} onChange={(e) => editI(item, { content: e.target.value })} className="min-h-0 flex-1" />
                                  <Button type="button" variant="ghost" size="icon" aria-label={`Delete ${info.label.toLowerCase()} ${item.content.slice(0, 30)}`} onClick={() => removeItem(item)}><Trash2 /></Button>
                                </div>
                                {(EVIDENCE_KINDS as readonly string[]).includes(kind) && (
                                  <div className="grid gap-1.5 sm:grid-cols-2">
                                    <Input aria-label={`Evidence note for ${item.content.slice(0, 30)}`} placeholder="Where this comes from" maxLength={500} value={item.evidence_note ?? ""} onChange={(e) => editI(item, { evidenceNote: e.target.value })} />
                                    <NativeSelect aria-label={`Linked observation for ${item.content.slice(0, 30)}`} value={item.observation_id ?? ""} onChange={(e) => editI(item, { observationId: e.target.value })}>
                                      <option value="">No linked observation</option>
                                      {p.evidenceOptions.map((o) => <option key={o.id} value={o.id}>{o.label}{o.participant ? ` (${o.participant})` : ""}</option>)}
                                      {item.observation_id && !p.evidenceOptions.some((o) => o.id === item.observation_id) && <option value={item.observation_id}>Linked observation</option>}
                                    </NativeSelect>
                                  </div>
                                )}
                                {(CONVERTIBLE_KINDS as readonly string[]).includes(kind) && (
                                  candidate ? <p className="inline-flex items-center gap-1.5 text-xs font-semibold text-success"><CircleCheck aria-hidden className="size-3.5" /> In opportunities</p>
                                  : <Button type="button" variant="outline" size="xs" onClick={() => convert(item)} aria-label={`Add to opportunities: ${item.content.slice(0, 30)}`}>Add to opportunities</Button>
                                )}
                              </li>
                            );
                          })}
                        </ul>
                        <AddRow kind={kind} onAdd={(content) => addItem(stage.id, kind, content)} />
                      </div>
                    );
                  })}
                </div>
              </section>
            </li>
          );
        })}
      </ol>

      <AlertDialog open={Boolean(removing)} onOpenChange={(open) => !open && setRemoving(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this stage?</AlertDialogTitle>
            <AlertDialogDescription>
              <strong className="text-foreground">{removing?.name}</strong> and its {removing ? p.items.filter((i) => i.stage_id === removing.id).length : 0} items will be deleted. Opportunities already created from them are kept. This can&apos;t be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
            <Button variant="destructive" onClick={removeStage} disabled={pending}>{pending ? "Deleting…" : "Delete stage"}</Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

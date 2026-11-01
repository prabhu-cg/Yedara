"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import * as React from "react";
import { ArrowLeft, CheckCircle2, ChevronRight, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { SelectField, TextareaField } from "@/components/forms/fields";
import { JourneyEditor, type ItemEdit, type StageEdit } from "@/components/journeys/journey-editor";
import { OpportunitiesPanel } from "@/components/journeys/opportunities-panel";
import { JourneyPresentation } from "@/components/journeys/journey-presentation";
import { JourneyMap, JourneyTable } from "@/components/journeys/journey-views";
import { SaveStatusIndicator } from "@/components/research-planner/save-status";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAutosave } from "@/hooks/use-autosave";
import { setJourneyStatusAction, updateItemAction, updateJourneyMetaAction, updateStageAction } from "@/lib/journeys/actions";
import { isJourneyTab, JOURNEY_STATES, JOURNEY_STATE_HINTS, JOURNEY_STATE_LABELS, JOURNEY_TABS, JOURNEY_TYPES, JOURNEY_TYPE_LABELS, type JourneyState, type JourneyTab, type JourneyType } from "@/lib/journeys/constants";
import type { CandidateRow, ItemRow, StageRow } from "@/lib/journeys/schemas";
import type { EvidenceOption } from "@/lib/synthesizer/queries";
import { cn } from "@/lib/utils";

type Meta = { name: string; scenario: string; journeyType: JourneyType; state: JourneyState; personaId: string };
type Entry = Meta | Partial<Meta> | StageEdit | ItemEdit;

export function JourneyWorkspace(props: {
  journeyId: string;
  initialMeta: Meta;
  initialStatus: "draft" | "completed";
  initialTab: JourneyTab;
  project: { id: string; name: string } | null;
  personas: { id: string; name: string }[];
  initialStages: StageRow[];
  initialItems: ItemRow[];
  initialCandidates: CandidateRow[];
  evidenceOptions: EvidenceOption[];
}) {
  const router = useRouter();
  const id = props.journeyId;
  const [tab, setTab] = React.useState<JourneyTab>(props.initialTab);
  const [meta, setMeta] = React.useState(props.initialMeta);
  const [status, setStatus] = React.useState(props.initialStatus);
  const [stages, setStages] = React.useState(props.initialStages);
  const [items, setItems] = React.useState(props.initialItems);
  const [candidates, setCandidates] = React.useState(props.initialCandidates);
  const [showCurve, setShowCurve] = React.useState(true);
  const [completing, setCompleting] = React.useState(false);

  const { status: saveStatus, error: saveError, markDirty, flush, hasUnsaved } = useAutosave<Entry>({
    save: async (entries) => {
      for (const [key, value] of entries) {
        const [kind, rowId] = key.split(":");
        const result =
          kind === "meta" ? await updateJourneyMetaAction(id, value)
          : kind === "stage" ? await updateStageAction(id, rowId, value)
          : await updateItemAction(id, rowId, value);
        if (!result.ok) return { ok: false, error: result.error };
      }
      return { ok: true };
    },
  });

  // Write the opening tab into the address so a reload stays on it (the default depends on whether there are stages).
  React.useEffect(() => {
    const url = new URL(window.location.href);
    if (!url.searchParams.has("tab")) {
      url.searchParams.set("tab", props.initialTab);
      window.history.replaceState(null, "", url);
    }
  }, [props.initialTab]);

  React.useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => { if (hasUnsaved()) e.preventDefault(); };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [hasUnsaved]);

  const selectTab = (next: JourneyTab) => {
    setTab(next);
    const url = new URL(window.location.href);
    url.searchParams.set("tab", next);
    window.history.replaceState(null, "", url);
  };

  const changeMeta = (patch: Partial<Meta>) => {
    const next = { ...meta, ...patch };
    setMeta(next);
    // Always the full set of edited details, so a later edit can't drop an earlier one that is still
    // waiting to save. An empty name is never sent: the field is flagged and the last good name stays.
    markDirty("meta", { scenario: next.scenario, journeyType: next.journeyType, state: next.state, personaId: next.personaId, ...(next.name.trim() ? { name: next.name.trim() } : {}) });
  };

  const editStage = (stageId: string, edit: StageEdit) => {
    setStages((all) => all.map((s) => (s.id === stageId ? { ...s, name: edit.name, emotion: edit.emotion, emotion_note: edit.emotionNote || null } : s)));
    if (edit.name.trim()) markDirty(`stage:${stageId}`, { ...edit, name: edit.name.trim() });
  };
  const editItem = (itemId: string, edit: ItemEdit) => {
    setItems((all) => all.map((i) => (i.id === itemId ? { ...i, content: edit.content, evidence_note: edit.evidenceNote || null, observation_id: edit.observationId || null } : i)));
    if (edit.content.trim()) markDirty(`item:${itemId}`, edit);
  };

  const toggleComplete = async () => {
    setCompleting(true);
    await flush();
    const result = await setJourneyStatusAction(id, status === "completed" ? "draft" : "completed");
    setCompleting(false);
    if (!result.ok) return void toast.error(result.error);
    setStatus(result.data.status);
    toast.success(result.data.status === "completed" ? "Marked as complete" : "Reopened as a draft");
  };

  const saveAndClose = async () => { if (await flush()) router.push("/tools/journey-mapper"); };
  const visible = JOURNEY_TABS;
  const empty = stages.length === 0;
  const personaName = props.personas.find((p) => p.id === meta.personaId)?.name ?? null;

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4">
        <Link href="/tools/journey-mapper" className="inline-flex w-fit items-center gap-1.5 rounded-md text-sm font-semibold text-muted-foreground hover:text-foreground"><ArrowLeft aria-hidden className="size-4" /> Journey maps</Link>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 flex-1 space-y-2">
            <Input aria-label="Journey name" aria-invalid={!meta.name.trim()} value={meta.name} maxLength={160} onChange={(e) => changeMeta({ name: e.target.value })} className="h-auto max-w-2xl border-transparent bg-transparent px-0 text-xl leading-tight font-bold shadow-none hover:border-input focus-visible:bg-background sm:text-[28px] md:text-[28px]" />
            <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              <Badge variant={status === "completed" ? "default" : "secondary"}>{status === "completed" ? "Completed" : "Draft"}</Badge>
              <Badge variant="outline">{JOURNEY_STATE_LABELS[meta.state]}</Badge>
              <span>{JOURNEY_TYPE_LABELS[meta.journeyType]}</span>
              {personaName && <><span aria-hidden>·</span><span>Persona: {personaName}</span></>}
              {props.project && <><span aria-hidden>·</span><Link href={`/projects/${props.project.id}`} className="hover:text-foreground hover:underline">{props.project.name}</Link></>}
              <span aria-hidden>·</span><span className="tabular-nums">{stages.length} {stages.length === 1 ? "stage" : "stages"}</span>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <SaveStatusIndicator status={saveStatus} error={saveError} onRetry={() => void flush()} />
            <Button type="button" variant={status === "completed" ? "outline" : "default"} size="sm" onClick={toggleComplete} disabled={completing}>{status === "completed" ? <><RotateCcw /> Reopen</> : <><CheckCircle2 /> Mark as complete</>}</Button>
            <Button type="button" variant="outline" size="sm" onClick={saveAndClose}>Save and close</Button>
          </div>
        </div>
        <details className="group rounded-lg border border-border">
          <summary className="flex cursor-pointer list-none items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 [&::-webkit-details-marker]:hidden"><ChevronRight aria-hidden className="size-4 text-muted-foreground transition-transform group-open:rotate-90" /><span className="shrink-0 whitespace-nowrap">Journey details</span> <span className="truncate font-normal text-muted-foreground">Scenario, type, state and persona</span></summary>
          <div className="grid gap-4 border-t border-border p-4 sm:grid-cols-2">
            <TextareaField label="Scenario" optional className="sm:col-span-2" rows={2} maxLength={2000} value={meta.scenario} onChange={(e) => changeMeta({ scenario: e.target.value })} />
            <SelectField label="Journey type" value={meta.journeyType} onChange={(e) => changeMeta({ journeyType: e.target.value as JourneyType })}>
              {JOURNEY_TYPES.map((t) => <option key={t} value={t}>{JOURNEY_TYPE_LABELS[t]}</option>)}
            </SelectField>
            <SelectField label="State" hint={JOURNEY_STATE_HINTS[meta.state]} value={meta.state} onChange={(e) => changeMeta({ state: e.target.value as JourneyState })}>
              {JOURNEY_STATES.map((s) => <option key={s} value={s}>{JOURNEY_STATE_LABELS[s]}</option>)}
            </SelectField>
            <SelectField label="Persona" optional hint="Personas from this project." value={meta.personaId} onChange={(e) => changeMeta({ personaId: e.target.value })}>
              <option value="">No persona</option>
              {props.personas.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </SelectField>
          </div>
        </details>
      </div>

      <div role="tablist" aria-label="Journey views" className="mb-6 flex gap-1 overflow-x-auto border-b border-border">
        {visible.map((t) => (
          <button key={t.key} role="tab" id={`jtab-${t.key}`} aria-selected={tab === t.key} aria-controls={`jpanel-${t.key}`} tabIndex={tab === t.key ? 0 : -1} type="button" onClick={() => selectTab(t.key)}
            onKeyDown={(e) => { const i = visible.findIndex((x) => x.key === tab); if (e.key === "ArrowRight" || e.key === "ArrowLeft") { const n = visible[(i + (e.key === "ArrowRight" ? 1 : visible.length - 1)) % visible.length].key; selectTab(n); requestAnimationFrame(() => document.getElementById(`jtab-${n}`)?.focus()); } }}
            className={cn("-mb-px shrink-0 border-b-2 px-4 py-2.5 text-sm font-medium whitespace-nowrap outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50", tab === t.key ? "border-primary font-semibold text-foreground" : "border-transparent text-muted-foreground hover:text-foreground")}>
            {t.label}{t.key === "opportunities" && candidates.length > 0 && <span className="ml-1.5 text-xs text-muted-foreground tabular-nums">{candidates.length}</span>}
          </button>
        ))}
      </div>

      <div role="tabpanel" id={`jpanel-${tab}`} aria-labelledby={`jtab-${tab}`}>
        {(tab === "map" || tab === "table" || tab === "presentation") && empty && (
          <p className="rounded-card border border-dashed border-input bg-secondary px-5 py-10 text-center text-sm text-muted-foreground">
            This journey has no stages yet. <button type="button" onClick={() => selectTab("edit")} className="font-semibold text-primary-text hover:underline">Add its stages</button> to see them here.
          </p>
        )}
        {tab === "map" && !empty && (
          <div className="space-y-3">
            <label className="flex w-fit items-center gap-2 text-sm"><input type="checkbox" checked={showCurve} onChange={(e) => setShowCurve(e.target.checked)} className="size-4 accent-[var(--primary)]" /> Show emotion curve</label>
            <JourneyMap stages={stages} items={items} showCurve={showCurve} />
          </div>
        )}
        {tab === "table" && !empty && <JourneyTable stages={stages} items={items} />}
        {tab === "presentation" && !empty && <JourneyPresentation name={meta.name} scenario={meta.scenario || null} type={meta.journeyType} state={meta.state} personaName={personaName} stages={stages} items={items} />}
        {tab === "edit" && <JourneyEditor journeyId={id} stages={stages} items={items} candidates={candidates} evidenceOptions={props.evidenceOptions} setStages={setStages} setItems={setItems} setCandidates={setCandidates} editStage={editStage} editItem={editItem} flush={flush} />}
        {tab === "opportunities" && <OpportunitiesPanel candidates={candidates} onRemoved={(cid) => setCandidates((all) => all.filter((c) => c.id !== cid))} />}
      </div>
    </div>
  );
}

export { isJourneyTab };

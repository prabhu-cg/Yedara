"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import * as React from "react";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SaveStatusIndicator } from "@/components/research-planner/save-status";
import { AffinityBoard } from "@/components/synthesizer/affinity-board";
import { InsightsPanel } from "@/components/synthesizer/insights-panel";
import { MaterialPanel, type MaterialChange } from "@/components/synthesizer/material-panel";
import { ReportPanel } from "@/components/synthesizer/report-panel";
import { useAutosave } from "@/hooks/use-autosave";
import { applyEverywhere, addCard, canRedo, canUndo, commit, createHistory, redo, removeCard, toLayout, undo, type BoardState, type History } from "@/lib/synthesizer/board-state";
import { saveLayoutAction, saveReportAction, setSynthesisStatusAction, updateSynthesisMetaAction } from "@/lib/synthesizer/actions";
import { isSynthesisTab, SYNTHESIS_TABS, type SynthesisTab } from "@/lib/synthesizer/constants";
import { buildSynthesisDocument, observationRefs } from "@/lib/synthesizer/document";
import type { CardRow, InsightRow, ObservationRow, ReportContent, SourceRow, ThemeRow } from "@/lib/synthesizer/schemas";
import { cn } from "@/lib/utils";

type SaveEntry = { layout: ReturnType<typeof toLayout>; zoom: number } | ReportContent | string;

export function SynthesisWorkspace(props: {
  synthesisId: string;
  initialTitle: string;
  initialStatus: "draft" | "completed";
  initialTab: SynthesisTab;
  project: { id: string; name: string; client: string | null } | null;
  preparedBy: string | null;
  updatedAt: string;
  sources: SourceRow[];
  observations: ObservationRow[];
  themes: ThemeRow[];
  cards: CardRow[];
  boardZoom: number;
  insights: InsightRow[];
  report: ReportContent;
}) {
  const router = useRouter();
  const id = props.synthesisId;
  const [tab, setTab] = React.useState<SynthesisTab>(props.initialTab);
  const [title, setTitle] = React.useState(props.initialTitle);
  const [status, setStatus] = React.useState(props.initialStatus);
  const [sources, setSources] = React.useState(props.sources);
  const [observations, setObservations] = React.useState(props.observations);
  const [cards, setCards] = React.useState(props.cards);
  const [insights, setInsights] = React.useState(props.insights);
  const [report, setReport] = React.useState(props.report);
  const [zoom, setZoom] = React.useState(props.boardZoom);
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [completing, setCompleting] = React.useState(false);
  const [history, setHistoryState] = React.useState<History>(() =>
    createHistory({
      themes: props.themes.map((t) => ({ id: t.id, title: t.title, notes: t.notes ?? "" })),
      cards: Object.fromEntries(props.cards.map((c) => [c.id, { themeId: c.theme_id, position: c.position }])),
    }),
  );
  const historyRef = React.useRef(history);
  const zoomRef = React.useRef(zoom);
  const setHistory = (h: History) => { historyRef.current = h; setHistoryState(h); };

  const { status: saveStatus, error: saveError, markDirty, flush, hasUnsaved } = useAutosave<SaveEntry>({
    save: async (entries) => {
      for (const [key, value] of entries) {
        const result =
          key === "layout" ? await saveLayoutAction(id, { ...(value as { layout: object }).layout, zoom: (value as { zoom: number }).zoom })
          : key === "report" ? await saveReportAction(id, value)
          : await updateSynthesisMetaAction(id, { title: value });
        if (!result.ok) return { ok: false, error: result.error };
      }
      return { ok: true };
    },
  });

  React.useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => { if (hasUnsaved()) e.preventDefault(); };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [hasUnsaved]);

  const queueLayout = (h: History, z = zoomRef.current) => markDirty("layout", { layout: toLayout(h.present), zoom: z });
  const applyBoard = (next: BoardState) => {
    const h = commit(historyRef.current, next);
    if (h === historyRef.current) return;
    setHistory(h);
    queueLayout(h);
  };
  const doUndo = React.useCallback(() => { const h = undo(historyRef.current); if (h !== historyRef.current) { setHistory(h); queueLayout(h); } }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const doRedo = React.useCallback(() => { const h = redo(historyRef.current); if (h !== historyRef.current) { setHistory(h); queueLayout(h); } }, []); // eslint-disable-line react-hooks/exhaustive-deps

  React.useEffect(() => {
    if (tab !== "board") return;
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      if (el && /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName)) return;
      if (!(e.metaKey || e.ctrlKey)) return;
      const k = e.key.toLowerCase();
      if (k === "z") { e.preventDefault(); if (e.shiftKey) doRedo(); else doUndo(); }
      else if (k === "y") { e.preventDefault(); doRedo(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [tab, doUndo, doRedo]);

  const selectTab = (next: SynthesisTab) => {
    setTab(next);
    const url = new URL(window.location.href);
    url.searchParams.set("tab", next);
    window.history.replaceState(null, "", url);
  };

  const onMaterial = (c: MaterialChange) => {
    if (c.type === "added") {
      if (c.source) setSources((s) => [...s, c.source!]);
      setObservations((o) => [...o, ...c.observations]);
      setCards((all) => [...all, ...c.cards]);
      let h = historyRef.current;
      for (const card of c.cards) h = applyEverywhere(h, (s) => addCard(s, card.id));
      setHistory(h);
    } else if (c.type === "updated") setObservations((o) => o.map((x) => (x.id === c.observation.id ? c.observation : x)));
    else if (c.type === "deleted") {
      const gone = new Set(c.observationIds);
      const goneCards = cards.filter((card) => gone.has(card.observation_id)).map((card) => card.id);
      setObservations((o) => o.filter((x) => !gone.has(x.id)));
      setCards((all) => all.filter((card) => !gone.has(card.observation_id)));
      setInsights((all) => all.map((i) => ({ ...i, evidence_ids: i.evidence_ids.filter((e) => !gone.has(e)) })));
      let h = historyRef.current;
      for (const cardId of goneCards) h = applyEverywhere(h, (s) => removeCard(s, cardId));
      setHistory(h);
    } else {
      setSources((s) => s.filter((x) => x.id !== c.sourceId));
      setObservations((o) => o.map((x) => (x.source_id === c.sourceId ? { ...x, source_id: null } : x)));
    }
  };

  const refs = React.useMemo(() => observationRefs(observations), [observations]);
  const obsById = React.useMemo(() => new Map(observations.map((o) => [o.id, o])), [observations]);
  const cardObs = React.useMemo(() => new Map(cards.map((c) => [c.id, c.observation_id])), [cards]);
  const sourceName = React.useMemo(() => new Map(sources.map((s) => [s.id, s.name])), [sources]);
  const present = history.present;

  const themeRows = React.useMemo<ThemeRow[]>(
    () => present.themes.map((t, position) => ({ id: t.id, synthesis_id: id, title: t.title, notes: t.notes || null, position, created_at: "", updated_at: "" })),
    [present.themes, id],
  );
  const cardRows = React.useMemo<CardRow[]>(() => cards.map((c) => ({ ...c, theme_id: present.cards[c.id]?.themeId ?? null, position: present.cards[c.id]?.position ?? 0 })), [cards, present.cards]);

  const doc = React.useMemo(
    () => buildSynthesisDocument({ synthesis: { title, status, updatedAt: props.updatedAt }, project: props.project, preparedBy: props.preparedBy, report, sources, observations, themes: themeRows, cards: cardRows, insights }),
    [title, status, props.updatedAt, props.project, props.preparedBy, report, sources, observations, themeRows, cardRows, insights],
  );

  const exportAs = async (format: "pdf" | "docx" | "md") => {
    const ok = await flush();
    if (!ok) return void toast.error("Fix the save problem first so the export is up to date.");
    const link = document.createElement("a");
    link.href = `/api/syntheses/${id}/export?format=${format}`;
    link.download = "";
    document.body.append(link);
    link.click();
    link.remove();
  };

  const toggleComplete = async () => {
    setCompleting(true);
    await flush();
    const result = await setSynthesisStatusAction(id, status === "completed" ? "draft" : "completed");
    setCompleting(false);
    if (!result.ok) return void toast.error(result.error);
    setStatus(result.data.status);
    toast.success(result.data.status === "completed" ? "Marked as complete" : "Reopened as a draft");
  };

  const saveAndClose = async () => {
    if (await flush()) router.push("/tools/research-synthesizer");
  };

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4">
        <Link href="/tools/research-synthesizer" className="inline-flex w-fit items-center gap-1.5 rounded-md text-sm font-semibold text-muted-foreground hover:text-foreground"><ArrowLeft aria-hidden className="size-4" /> Research syntheses</Link>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 flex-1 space-y-2">
            <Input aria-label="Synthesis title" value={title} maxLength={160} onChange={(e) => { setTitle(e.target.value); if (e.target.value.trim()) markDirty("title", e.target.value.trim()); }} className="h-auto max-w-2xl border-transparent bg-transparent px-0 text-xl leading-tight font-bold shadow-none hover:border-input focus-visible:bg-background sm:text-[28px] md:text-[28px]" />
            <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              <Badge variant={status === "completed" ? "default" : "secondary"}>{status === "completed" ? "Completed" : "Draft"}</Badge>
              {props.project && <Link href={`/projects/${props.project.id}`} className="hover:text-foreground hover:underline">{props.project.name}</Link>}
              <span className="tabular-nums">{observations.length} {observations.length === 1 ? "observation" : "observations"} · {history.present.themes.length} {history.present.themes.length === 1 ? "theme" : "themes"} · {insights.length} {insights.length === 1 ? "insight" : "insights"}</span>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <SaveStatusIndicator status={saveStatus} error={saveError} onRetry={() => void flush()} />
            <Button type="button" variant="outline" size="sm" onClick={saveAndClose}>Save and close</Button>
          </div>
        </div>
      </div>

      <div role="tablist" aria-label="Synthesis sections" className="mb-6 flex gap-1 overflow-x-auto border-b border-border">
        {SYNTHESIS_TABS.map((t) => (
          <button key={t.key} role="tab" id={`tab-${t.key}`} aria-selected={tab === t.key} aria-controls={`panel-${t.key}`} tabIndex={tab === t.key ? 0 : -1} type="button" onClick={() => selectTab(t.key)}
            onKeyDown={(e) => { const i = SYNTHESIS_TABS.findIndex((x) => x.key === tab); if (e.key === "ArrowRight" || e.key === "ArrowLeft") { const n = SYNTHESIS_TABS[(i + (e.key === "ArrowRight" ? 1 : SYNTHESIS_TABS.length - 1)) % SYNTHESIS_TABS.length].key; selectTab(n); requestAnimationFrame(() => document.getElementById(`tab-${n}`)?.focus()); } }}
            className={cn("-mb-px shrink-0 border-b-2 px-4 py-2.5 text-sm font-medium whitespace-nowrap outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50", tab === t.key ? "border-primary font-semibold text-foreground" : "border-transparent text-muted-foreground hover:text-foreground")}>
            {t.label}
          </button>
        ))}
      </div>

      <div role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`}>
        {tab === "material" && <MaterialPanel synthesisId={id} sources={sources} observations={observations} insights={insights} editingId={editingId} onEdit={setEditingId} onChange={onMaterial} />}
        {tab === "board" && (
          <AffinityBoard state={present} onChange={applyBoard} canUndo={canUndo(history)} canRedo={canRedo(history)} onUndo={doUndo} onRedo={doRedo} zoom={zoom}
            onZoom={(z) => { setZoom(z); zoomRef.current = z; queueLayout(historyRef.current, z); }}
            observationOfCard={(cardId) => obsById.get(cardObs.get(cardId) ?? "")} refOf={(obsId) => refs.get(obsId) ?? ""}
            sourceOf={(o) => (o.source_id ? (sourceName.get(o.source_id) ?? null) : null)}
            onEdit={(obsId) => { setEditingId(obsId); selectTab("material"); }} />
        )}
        {tab === "insights" && <InsightsPanel synthesisId={id} insights={insights} observations={observations} themes={themeRows} refs={refs} onChange={setInsights} beforeSubmit={flush} />}
        {tab === "report" && <ReportPanel report={report} onReport={(next) => { setReport(next); markDirty("report", next); }} doc={doc} status={status} onToggleComplete={toggleComplete} onExport={exportAs} completing={completing} />}
      </div>
    </div>
  );
}

export { isSynthesisTab };

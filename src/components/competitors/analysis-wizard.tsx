"use client";

import { useRouter } from "next/navigation";
import * as React from "react";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SelectField, TextareaField, TextField } from "@/components/forms/fields";
import { ListEditor } from "@/components/research-planner/editor-primitives";
import { AnalysisOutput, type AnalysisExportFormat } from "@/components/competitors/analysis-output";
import { CompetitorsManager } from "@/components/competitors/competitors-manager";
import { CriteriaEditor } from "@/components/competitors/criteria-editor";
import { blankCell, MatrixEditor } from "@/components/competitors/matrix-editor";
import { InheritedField } from "@/components/shared/inherited-field";
import { WizardFrame, type Guidance } from "@/components/shared/wizard-frame";
import { useAutosave, type SaveResult } from "@/hooks/use-autosave";
import { downloadFile } from "@/lib/download";
import {
  addCompetitorAction,
  addCriterionAction,
  addSourceAction,
  deleteCompetitorAction,
  deleteCriterionAction,
  deleteSourceAction,
  reorderCompetitorsAction,
  reorderCriteriaAction,
  saveAnalysisContentAction,
  saveCellAction,
  setAnalysisStatusAction,
  updateAnalysisMetaAction,
  updateCompetitorAction,
  updateCriterionAction,
  updateSourceAction,
} from "@/lib/competitors/actions";
import { COMPETITOR_REPORT_STEP, COMPETITOR_STEPS, COMPETITOR_TOTAL_STEPS } from "@/lib/competitors/constants";
import { buildAnalysisDocument, sourceTags } from "@/lib/competitors/document";
import type { AnalysisContent, CellInput, CellRow, CompetitorRow, CriterionInput, CriterionRow, MarketContext, SourceInput, SourceRow } from "@/lib/competitors/schemas";
import { firstInvalidAnalysisStepBefore, findGaps, gapSuggestions, getAnalysisCompletionIssues, getAnalysisIssues } from "@/lib/competitors/validation";
import { SHARED_FIELDS, withOverride, type ProjectBrief, type SharedField } from "@/lib/shared-context";

type ProjectOption = { id: string; name: string; client: string | null; brief: ProjectBrief };

export type AnalysisWizardProps = {
  analysisId: string;
  initialTitle: string;
  initialProjectId: string;
  initialStatus: "draft" | "completed";
  initialStep: number;
  initialMarket: MarketContext;
  initialContent: AnalysisContent;
  initialCompetitors: CompetitorRow[];
  initialCriteria: CriterionRow[];
  initialCells: CellRow[];
  initialSources: SourceRow[];
  projects: ProjectOption[];
  preparedBy: string | null;
  updatedAt: string;
};

const LIST_HREF = "/tools/competitor-analyzer";
const URL_PATTERN = /^https?:\/\/\S+$/i;
const BRIEF_KEY: Record<SharedField, keyof ProjectBrief> = {
  project_description: "description",
  industry: "industry",
  product_service: "product_service",
  target_audience: "target_audience",
  research_objectives: "research_objectives",
};

const GUIDANCE: Record<number, Guidance> = {
  1: {
    intro: "Say what market you are looking at and why. The project brief is reused so you don't retype it.",
    tips: ["Override a project field only when this analysis looks at something different.", "A narrow market gives a more useful comparison than a broad one.", "Your project itself is never changed from here."],
  },
  2: {
    intro: "List the products and companies people could choose instead of yours.",
    tips: ["Include indirect competitors and substitutes, such as spreadsheets or doing nothing.", "Add only what you actually found. Leave pricing empty if you didn't find it.", "Record where each fact came from, with the date you looked."],
  },
  3: {
    intro: "Criteria are the rows of your comparison. Choose what matters to your users.",
    tips: ["Start from the suggested categories, then add your own.", "Fewer, sharper criteria beat a long list nobody can fill in.", "Order matters: the matrix and report follow this order."],
  },
  4: {
    intro: "Fill in each cell with what you know and cite where you found it.",
    tips: ["Unknown means not yet researched. Not publicly available means you looked and found nothing.", "Missing information is never treated as a weakness.", "Link a source so every claim can be checked."],
  },
  5: {
    intro: "Now interpret the matrix. This part is your judgement, so it is labelled that way in the report.",
    tips: ["Ground each point in something you recorded in the matrix.", "Gaps in your research belong under further research, not under weaknesses.", "Opportunities describe where you could differ, not guaranteed wins."],
  },
  6: { intro: "Review the report, edit anything, then export it.", tips: [] },
};

export function AnalysisWizard(props: AnalysisWizardProps) {
  const router = useRouter();
  const { analysisId } = props;

  const [title, setTitle] = React.useState(props.initialTitle);
  const [projectId, setProjectId] = React.useState(props.initialProjectId);
  const [status, setStatus] = React.useState(props.initialStatus);
  const [step, setStep] = React.useState(props.initialStep);
  const [reached, setReached] = React.useState(props.initialStep);
  const [market, setMarket] = React.useState<MarketContext>(props.initialMarket);
  const [content, setContent] = React.useState<AnalysisContent>(props.initialContent);
  const [competitors, setCompetitors] = React.useState<CompetitorRow[]>(props.initialCompetitors);
  const [criteria, setCriteria] = React.useState<CriterionRow[]>(props.initialCriteria);
  const [cells, setCells] = React.useState<CellRow[]>(props.initialCells);
  const [sources, setSources] = React.useState<SourceRow[]>(props.initialSources);
  const [showErrors, setShowErrors] = React.useState<Record<number, boolean>>({});
  const [busy, setBusy] = React.useState(false);
  const [editedAt, setEditedAt] = React.useState(props.updatedAt);
  const headingRef = React.useRef<HTMLHeadingElement>(null);
  const firstRender = React.useRef(true);

  const save = React.useCallback(
    async (entries: [string, unknown][]): Promise<SaveResult> => {
      for (const [key, value] of entries) {
        let result: { ok: boolean; error?: string };
        if (key === "meta") {
          const m = value as { title: string; projectId: string };
          result = await updateAnalysisMetaAction(analysisId, { title: m.title.trim() || undefined, projectId: m.projectId || undefined });
        } else if (key === "step") {
          result = await updateAnalysisMetaAction(analysisId, { currentStep: value as number });
        } else if (key === "market" || key === "analysis") {
          result = await saveAnalysisContentAction(analysisId, key, value);
        } else if (key.startsWith("competitor:")) {
          const row = value as CompetitorRow;
          // A blank name or a malformed link can't be stored; the UI flags it and the saved value is kept.
          if (!row.name.trim() || (row.website_url && !URL_PATTERN.test(row.website_url))) continue;
          result = await updateCompetitorAction(analysisId, row.id, row);
        } else if (key.startsWith("criterion:")) {
          const row = value as CriterionRow;
          if (!row.name.trim()) continue;
          result = await updateCriterionAction(analysisId, row.id, row);
        } else if (key.startsWith("source:")) {
          const row = value as SourceRow;
          if (!URL_PATTERN.test(row.url)) continue;
          result = await updateSourceAction(analysisId, row.id, row);
        } else if (key.startsWith("cell:")) {
          const cell = value as CellRow;
          result = await saveCellAction(analysisId, cell.competitor_id, cell.criterion_id, cell);
        } else {
          continue;
        }
        if (!result.ok) return { ok: false, error: result.error ?? "We couldn't save your changes." };
      }
      setEditedAt(new Date().toISOString());
      return { ok: true };
    },
    [analysisId],
  );
  const autosave = useAutosave<unknown>({ save });

  const project = props.projects.find((p) => p.id === projectId) ?? null;
  const meta = { title, projectId: projectId || null };
  const data = { competitors, criteria };
  const tags = sourceTags(competitors, sources);

  const updateMeta = (patch: Partial<{ title: string; projectId: string }>) => {
    const next = { title, projectId, ...patch };
    setTitle(next.title);
    setProjectId(next.projectId);
    autosave.markDirty("meta", next);
  };
  const updateMarket = (value: MarketContext) => {
    setMarket(value);
    autosave.markDirty("market", value);
  };
  const updateContent = (value: AnalysisContent) => {
    setContent(value);
    autosave.markDirty("analysis", value);
  };

  /* ---------- competitors ---------- */
  const addCompetitor = async () => {
    const result = await addCompetitorAction(analysisId, undefined);
    if (!result.ok) return void toast.error(result.error);
    setCompetitors((prev) => [...prev, result.data.competitor]);
    window.setTimeout(() => {
      const inputs = document.querySelectorAll<HTMLInputElement>('section[aria-label^="Competitor "] input[maxlength="160"]');
      inputs[inputs.length - 1]?.focus();
    }, 0);
  };
  const changeCompetitor = (id: string, patch: Partial<CompetitorRow>) => {
    const current = competitors.find((c) => c.id === id);
    if (!current) return;
    const row = { ...current, ...patch };
    setCompetitors((prev) => prev.map((c) => (c.id === id ? row : c)));
    autosave.markDirty(`competitor:${id}`, row);
  };
  const removeCompetitor = async (id: string) => {
    if (!(await autosave.flush())) return void toast.error("We couldn't save your latest changes first. Please retry.");
    const result = await deleteCompetitorAction(analysisId, id);
    if (!result.ok) return void toast.error(result.error);
    setCompetitors((prev) => prev.filter((c) => c.id !== id));
    setSources((prev) => prev.filter((s) => s.competitor_id !== id));
    setCells((prev) => prev.filter((c) => c.competitor_id !== id));
  };
  const moveCompetitor = async (id: string, direction: -1 | 1) => {
    const from = competitors.findIndex((c) => c.id === id);
    const to = from + direction;
    if (from < 0 || to < 0 || to >= competitors.length) return;
    const next = [...competitors];
    [next[from], next[to]] = [next[to], next[from]];
    setCompetitors(next);
    const result = await reorderCompetitorsAction(analysisId, next.map((c) => c.id));
    if (!result.ok) {
      setCompetitors(competitors);
      toast.error(result.error);
    }
  };

  /* ---------- sources ---------- */
  const addSource = async (competitorId: string, input: SourceInput) => {
    const result = await addSourceAction(analysisId, competitorId, input);
    if (!result.ok) {
      toast.error(result.error);
      return { ok: false as const, errors: Object.fromEntries(Object.entries(result.fieldErrors ?? {}).map(([k, v]) => [k, v[0]])) };
    }
    setSources((prev) => [...prev, result.data.source]);
    return { ok: true as const };
  };
  const changeSource = (id: string, patch: Partial<SourceRow>) => {
    const current = sources.find((s) => s.id === id);
    if (!current) return;
    const row = { ...current, ...patch };
    setSources((prev) => prev.map((s) => (s.id === id ? row : s)));
    autosave.markDirty(`source:${id}`, row);
  };
  const removeSource = async (id: string) => {
    if (!(await autosave.flush())) return void toast.error("We couldn't save your latest changes first. Please retry.");
    const result = await deleteSourceAction(analysisId, id);
    if (!result.ok) return void toast.error(result.error);
    setSources((prev) => prev.filter((s) => s.id !== id));
    // The database clears the link on cells that cited it; mirror that here.
    setCells((prev) => prev.map((c) => (c.source_id === id ? { ...c, source_id: "" } : c)));
  };

  /* ---------- criteria ---------- */
  const addCriterion = async (input: CriterionInput) => {
    const result = await addCriterionAction(analysisId, input);
    if (!result.ok) return { ok: false as const, error: result.fieldErrors?.name?.[0] ?? result.error };
    setCriteria((prev) => [...prev, result.data.criterion]);
    return { ok: true as const };
  };
  const changeCriterion = (id: string, patch: Partial<CriterionRow>) => {
    const current = criteria.find((c) => c.id === id);
    if (!current) return;
    const row = { ...current, ...patch };
    setCriteria((prev) => prev.map((c) => (c.id === id ? row : c)));
    autosave.markDirty(`criterion:${id}`, row);
  };
  const removeCriterion = async (id: string) => {
    if (!(await autosave.flush())) return void toast.error("We couldn't save your latest changes first. Please retry.");
    const result = await deleteCriterionAction(analysisId, id);
    if (!result.ok) return void toast.error(result.error);
    setCriteria((prev) => prev.filter((c) => c.id !== id));
    setCells((prev) => prev.filter((c) => c.criterion_id !== id));
  };
  const moveCriterion = async (id: string, direction: -1 | 1) => {
    const from = criteria.findIndex((c) => c.id === id);
    const to = from + direction;
    if (from < 0 || to < 0 || to >= criteria.length) return;
    const next = [...criteria];
    [next[from], next[to]] = [next[to], next[from]];
    setCriteria(next);
    const result = await reorderCriteriaAction(analysisId, next.map((c) => c.id));
    if (!result.ok) {
      setCriteria(criteria);
      toast.error(result.error);
    }
  };

  /* ---------- matrix ---------- */
  const changeCell = (competitorId: string, criterionId: string, patch: Partial<CellInput>) => {
    const current = cells.find((c) => c.competitor_id === competitorId && c.criterion_id === criterionId) ?? blankCell(competitorId, criterionId);
    const row: CellRow = { ...current, ...patch };
    setCells((prev) => [...prev.filter((c) => !(c.competitor_id === competitorId && c.criterion_id === criterionId)), row]);
    autosave.markDirty(`cell:${competitorId}:${criterionId}`, row);
  };

  /* ---------- navigation ---------- */
  const setUrlStep = (n: number) => window.history.replaceState(null, "", `?step=${n}`);
  const focusIssue = (field: string) =>
    window.setTimeout(() => {
      const el = document.getElementById(`field-${field}`);
      el?.focus();
      el?.scrollIntoView({ block: "center", behavior: "smooth" });
    }, 0);

  const goTo = (target: number) => {
    if (target < 1 || target > COMPETITOR_TOTAL_STEPS || target === step) return;
    if (target > step) {
      const blocked = firstInvalidAnalysisStepBefore(target, meta, data);
      if (blocked !== null) {
        setShowErrors((s) => ({ ...s, [blocked]: true }));
        setStep(blocked);
        setUrlStep(blocked);
        autosave.markDirty("step", blocked);
        toast.info(`Finish the required details in step ${blocked} first.`);
        const first = getAnalysisIssues(blocked, meta, data)[0];
        if (first) focusIssue(first.field);
        return;
      }
    }
    setStep(target);
    setReached((r) => Math.max(r, target));
    setUrlStep(target);
    autosave.markDirty("step", target);
  };
  const next = () => {
    const issues = getAnalysisIssues(step, meta, data);
    if (issues.length) {
      setShowErrors((s) => ({ ...s, [step]: true }));
      focusIssue(issues[0].field);
      return;
    }
    goTo(step + 1);
  };

  React.useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    headingRef.current?.focus();
    window.scrollTo({ top: 0 });
  }, [step]);

  React.useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => {
      if (autosave.hasUnsaved() || autosave.status === "saving") {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    const onHide = () => {
      if (document.visibilityState === "hidden" && autosave.hasUnsaved()) void autosave.flush();
    };
    window.addEventListener("beforeunload", warn);
    document.addEventListener("visibilitychange", onHide);
    return () => {
      window.removeEventListener("beforeunload", warn);
      document.removeEventListener("visibilitychange", onHide);
    };
  }, [autosave]);

  const saveAndExit = async () => {
    if (!(await autosave.flush())) return void toast.error("We couldn't save your analysis. Please retry before leaving.");
    toast.success("Draft saved. Pick it up any time from your analyses.");
    router.push(LIST_HREF);
    router.refresh();
  };
  const exportFile = async (format: AnalysisExportFormat) => {
    setBusy(true);
    try {
      if (!(await autosave.flush())) return void toast.error("We couldn't save your latest changes before exporting. Please retry.");
      downloadFile(`/api/competitor-analyses/${analysisId}/export?format=${format}`);
      toast.success("Preparing your download…");
    } finally {
      window.setTimeout(() => setBusy(false), 800);
    }
  };
  const changeStatus = async (nextStatus: "draft" | "completed") => {
    setBusy(true);
    try {
      if (!(await autosave.flush())) return void toast.error("We couldn't save your latest changes first. Please retry.");
      const result = await setAnalysisStatusAction(analysisId, nextStatus);
      if (!result.ok) return void toast.error(result.error);
      setStatus(result.data.status);
      toast.success(nextStatus === "completed" ? "Analysis marked as complete" : "Analysis reopened as a draft");
      router.refresh();
    } finally {
      setBusy(false);
    }
  };

  /* ---------- derived ---------- */
  const completionIssues = getAnalysisCompletionIssues(meta, data);
  const errorsFor = (n: number) => {
    const out: Record<string, string> = {};
    if (!showErrors[n]) return out;
    for (const i of getAnalysisIssues(n, meta, data)) out[i.field] = out[i.field] ? `${out[i.field]}. ${i.message}` : i.message;
    return out;
  };
  const done = new Set<number>();
  for (let s = 1; s < COMPETITOR_REPORT_STEP; s++) {
    if (s === step || s > Math.max(step, reached)) continue;
    if (getAnalysisIssues(s, meta, data).length === 0) done.add(s);
  }
  const doc = buildAnalysisDocument({
    analysis: { title, status, updatedAt: editedAt },
    project: project ? { name: project.name, client: project.client, brief: project.brief } : null,
    preparedBy: props.preparedBy,
    market,
    content,
    competitors,
    criteria,
    cells,
    sources,
  });

  /* ---------- step bodies ---------- */
  const body = () => {
    switch (step) {
      case 1: {
        const e = errorsFor(1);
        const setOverride = (field: SharedField, value: string | undefined) =>
          updateMarket({ ...market, overrides: withOverride(market.overrides, field, value) });
        return (
          <div className="space-y-6">
            <TextField id="field-title" label="Analysis title" placeholder="e.g. Invoicing tools for freelancers" maxLength={160} error={e.title} value={title} onChange={(ev) => updateMeta({ title: ev.target.value })} />
            <SelectField id="field-projectId" label="Project" error={e.projectId} value={projectId} onChange={(ev) => updateMeta({ projectId: ev.target.value })}>
              <option value="">Choose a project…</option>
              {props.projects.map((p) => (
                <option key={p.id} value={p.id}>{p.name}{p.client ? ` (${p.client})` : ""}</option>
              ))}
            </SelectField>
            <div className="grid gap-6 sm:grid-cols-2">
              <TextField label="Market or category" optional placeholder="e.g. Invoicing software for freelancers" maxLength={300} value={market.market_category} onChange={(ev) => updateMarket({ ...market, market_category: ev.target.value })} />
              <TextField label="Geography" optional placeholder="e.g. UK and EU" maxLength={300} value={market.geography} onChange={(ev) => updateMarket({ ...market, geography: ev.target.value })} />
            </div>
            <div className="space-y-5 rounded-xl border border-border bg-secondary/50 p-4 sm:p-5">
              <div>
                <p className="text-sm font-semibold">Context from your project</p>
                <p className="text-xs text-muted-foreground">Reused from the project brief. Override a field for this analysis only; the project itself is never changed.</p>
              </div>
              {SHARED_FIELDS.map((field) => (
                <InheritedField
                  key={field}
                  field={field}
                  noun="this analysis"
                  projectId={projectId || undefined}
                  multiline={field !== "industry"}
                  inherited={project?.brief[BRIEF_KEY[field]] ?? ""}
                  override={market.overrides[field]}
                  onChange={(v) => setOverride(field, v)}
                />
              ))}
            </div>
          </div>
        );
      }
      case 2:
        return (
          <CompetitorsManager
            competitors={competitors}
            sources={sources}
            error={errorsFor(2).competitors}
            onAdd={addCompetitor}
            onChange={changeCompetitor}
            onRemove={removeCompetitor}
            onMove={moveCompetitor}
            onAddSource={addSource}
            onChangeSource={changeSource}
            onRemoveSource={removeSource}
          />
        );
      case 3:
        return <CriteriaEditor criteria={criteria} error={errorsFor(3).criteria} onAdd={addCriterion} onChange={changeCriterion} onRemove={removeCriterion} onMove={moveCriterion} />;
      case 4:
        return <MatrixEditor competitors={competitors} criteria={criteria} cells={cells} sources={sources} tags={tags} onChange={changeCell} />;
      case 5: {
        const suggestions = gapSuggestions(findGaps(competitors, criteria, cells)).filter((s) => !content.further_research.includes(s));
        const list = (key: keyof Omit<AnalysisContent, "positioning_summary">, label: string, item: string, add: string, hint?: string) => (
          <ListEditor id={`analysis-${key}`} label={label} hint={hint} itemLabel={item} addLabel={add} items={content[key]} onChange={(items) => updateContent({ ...content, [key]: items })} />
        );
        return (
          <div className="space-y-7">
            <p role="note" className="rounded-xl border border-warning/30 bg-warning-soft p-4 text-sm">
              This step is your interpretation of the matrix. In the report it is labelled as interpretation, not as recorded fact. Automated and AI analysis are switched off.
            </p>
            <TextareaField label="Positioning summary" optional rows={4} hint="How do these competitors position themselves, and where could you stand apart?" value={content.positioning_summary} onChange={(ev) => updateContent({ ...content, positioning_summary: ev.target.value })} />
            {list("positioning_differences", "Positioning differences", "Difference", "Add difference")}
            {list("strengths", "Strengths", "Strength", "Add strength", "Things a competitor does well, based on what you recorded.")}
            {list("weaknesses", "Weaknesses", "Weakness", "Add weakness", "Only where you have evidence. A gap in your research is not a weakness.")}
            {list("feature_gaps", "Feature gaps", "Feature gap", "Add feature gap")}
            {list("opportunities", "Differentiation opportunities", "Opportunity", "Add opportunity")}
            {list("further_research", "Areas requiring further research", "Research area", "Add research area")}
            {suggestions.length > 0 && (
              <div className="space-y-3 rounded-xl border border-border bg-secondary/50 p-4 sm:p-5">
                <p className="text-sm font-semibold">Suggested from gaps in your matrix</p>
                <p className="text-xs text-muted-foreground">These are cells that are unknown or not publicly available. They are also added to the report automatically.</p>
                <ul className="space-y-2">
                  {suggestions.map((s) => (
                    <li key={s} className="flex flex-wrap items-start justify-between gap-2 text-sm">
                      <span className="min-w-0 flex-1 [overflow-wrap:anywhere]">{s}</span>
                      <Button type="button" variant="outline" size="xs" onClick={() => updateContent({ ...content, further_research: [...content.further_research, s] })} aria-label={`Add to research list: ${s}`}>
                        <Plus /> Add
                      </Button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        );
      }
      default:
        return <AnalysisOutput doc={doc} issues={completionIssues} status={status} busy={busy} onEdit={goTo} onExport={exportFile} onSetStatus={changeStatus} />;
    }
  };

  return (
    <div onBlurCapture={() => autosave.hasUnsaved() && void autosave.flush()}>
      <WizardFrame
        backHref={LIST_HREF}
        backLabel="Competitor analyses"
        title={title.trim() || "Untitled analysis"}
        badges={
          <>
            <Badge variant={status === "completed" ? "default" : "secondary"}>{status === "completed" ? "Completed" : "Draft"}</Badge>
            {project && <span>{project.name}</span>}
          </>
        }
        saveStatus={autosave.status}
        saveError={autosave.error}
        onRetrySave={() => void autosave.flush()}
        onSaveAndExit={saveAndExit}
        steps={COMPETITOR_STEPS}
        step={step}
        reached={reached}
        done={done}
        onSelectStep={goTo}
        onNext={next}
        guidance={GUIDANCE[step]}
        fullWidth={step === COMPETITOR_REPORT_STEP || step === 4}
        headingRef={headingRef}
      >
        {body()}
      </WizardFrame>
    </div>
  );
}

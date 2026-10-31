"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import * as React from "react";
import { ArrowLeft, ArrowRight, Lightbulb } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";
import { SelectField, TextField } from "@/components/forms/fields";
import { MaterialsStep, type MaterialInfo } from "@/components/research-planner/materials-step";
import { ReviewStep, type ExportFormat, type ReviewSection } from "@/components/research-planner/review-step";
import { SaveStatusIndicator } from "@/components/research-planner/save-status";
import { SectionEditor, type EditorContext } from "@/components/research-planner/section-editors";
import { Stepper } from "@/components/research-planner/stepper";
import { useAutosave, type SaveResult } from "@/hooks/use-autosave";
import {
  DEFAULT_POSITIONS,
  MATERIAL_KEYS,
  PLAN_STEPS,
  REVIEW_STEP,
  TOTAL_STEPS,
  isMaterialKey,
  type MaterialKey,
  type PlanStatus,
  type SectionKey,
} from "@/lib/research-planner/constants";
import { buildPlanDocument, orderedSectionKeys } from "@/lib/research-planner/document";
import { STEP_GUIDANCE } from "@/lib/research-planner/guidance";
import { applicableMaterials } from "@/lib/research-planner/materials";
import { methodsNeedParticipants } from "@/lib/research-planner/methods";
import {
  emptyContent,
  type AnySectionContent,
  type ContextContent,
  type GoalsContent,
  type MethodsContent,
  type ParticipantsContent,
  type SectionContentMap,
} from "@/lib/research-planner/schemas";
import { firstInvalidStepBefore, getStepIssues, getCompletionIssues } from "@/lib/research-planner/validation";
import {
  generateMaterialsAction,
  reorderSectionsAction,
  savePlanSectionAction,
  setPlanStatusAction,
  updatePlanMetaAction,
} from "@/lib/research-planner/actions";

type Sections = { [K in SectionKey]?: SectionContentMap[K] };
type SectionMeta = Partial<Record<SectionKey, { position: number; source: "manual" | "template" | "ai" }>>;
type ProjectOption = { id: string; name: string; client: string | null; industry: string | null };

export type PlannerWizardProps = {
  planId: string;
  initialTitle: string;
  initialProjectId: string;
  initialStatus: PlanStatus;
  initialStep: number;
  initialSections: Sections;
  initialMeta: SectionMeta;
  projects: ProjectOption[];
  preparedBy: string | null;
  updatedAt: string;
};

const LIST_HREF = "/tools/research-planner";

/** Starts a file download without navigating away from the wizard. */
function downloadFile(url: string) {
  const link = document.createElement("a");
  link.href = url;
  link.download = "";
  document.body.appendChild(link);
  link.click();
  link.remove();
}

export function PlannerWizard(props: PlannerWizardProps) {
  const router = useRouter();
  const { planId } = props;

  const [title, setTitle] = React.useState(props.initialTitle);
  const [projectId, setProjectId] = React.useState(props.initialProjectId);
  const [status, setStatus] = React.useState<PlanStatus>(props.initialStatus);
  const [step, setStep] = React.useState(props.initialStep);
  const [reached, setReached] = React.useState(props.initialStep);
  const [sections, setSections] = React.useState<Sections>(props.initialSections);
  const [meta, setMeta] = React.useState<SectionMeta>(props.initialMeta);
  const [showErrors, setShowErrors] = React.useState<Record<number, boolean>>({});
  const [busy, setBusy] = React.useState(false);
  const [editedAt, setEditedAt] = React.useState(props.updatedAt);
  const headingRef = React.useRef<HTMLHeadingElement>(null);
  const firstRender = React.useRef(true);

  const save = React.useCallback(
    async (entries: [string, unknown][]): Promise<SaveResult> => {
      for (const [key, value] of entries) {
        const result =
          key === "meta"
            ? await updatePlanMetaAction(planId, {
                title: (value as { title: string }).title.trim() || undefined,
                projectId: (value as { projectId: string }).projectId || undefined,
              })
            : key === "step"
              ? await updatePlanMetaAction(planId, { currentStep: value as number })
              : await savePlanSectionAction(planId, key, value);
        if (!result.ok) return { ok: false, error: result.error };
      }
      setEditedAt(new Date().toISOString());
      return { ok: true };
    },
    [planId],
  );
  const autosave = useAutosave<unknown>({ save });

  const get = React.useCallback(
    <K extends SectionKey>(key: K): SectionContentMap[K] => (sections[key] ?? emptyContent(key)) as SectionContentMap[K],
    [sections],
  );

  const core = {
    context: get("context") as ContextContent,
    goals: get("goals") as GoalsContent,
    methods: get("methods") as MethodsContent,
    participants: get("participants") as ParticipantsContent,
  };
  const planMeta = { title, projectId: projectId || null };
  const participantsNeeded = methodsNeedParticipants(core.methods.selected);
  const ctx: EditorContext = { goals: core.goals, methods: core.methods };
  const project = props.projects.find((p) => p.id === projectId) ?? null;

  const updateSection = React.useCallback(
    <K extends SectionKey>(key: K, value: SectionContentMap[K]) => {
      setSections((prev) => ({ ...prev, [key]: value }));
      autosave.markDirty(key, value);
    },
    [autosave],
  );

  const updateMeta = (patch: { title?: string; projectId?: string }) => {
    const next = { title, projectId, ...patch };
    setTitle(next.title);
    setProjectId(next.projectId);
    autosave.markDirty("meta", next);
  };

  /* ---------------- navigation ---------------- */

  const setUrlStep = (n: number) => window.history.replaceState(null, "", `?step=${n}`);

  const focusIssue = (field: string) => {
    window.setTimeout(() => {
      const el = document.getElementById(`field-${field}`);
      el?.focus();
      el?.scrollIntoView({ block: "center", behavior: "smooth" });
    }, 0);
  };

  const goTo = (target: number) => {
    if (target < 1 || target > TOTAL_STEPS || target === step) return;
    if (target > step) {
      const blocked = firstInvalidStepBefore(target, planMeta, core);
      if (blocked !== null) {
        setShowErrors((s) => ({ ...s, [blocked]: true }));
        setStep(blocked);
        setUrlStep(blocked);
        autosave.markDirty("step", blocked);
        toast.info(`Finish the required details in step ${blocked} first.`);
        const first = getStepIssues(blocked, planMeta, core)[0];
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
    const issues = getStepIssues(step, planMeta, core);
    if (issues.length) {
      setShowErrors((s) => ({ ...s, [step]: true }));
      focusIssue(issues[0].field);
      return;
    }
    goTo(step + 1);
  };

  // Move focus to the step heading when the step changes (not on first load).
  React.useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    headingRef.current?.focus();
    window.scrollTo({ top: 0 });
  }, [step]);

  // Warn before closing the tab with unsaved changes.
  React.useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (autosave.hasUnsaved() || autosave.status === "saving") {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [autosave]);

  // Save as soon as the tab is hidden (switching tabs, closing, navigating away).
  React.useEffect(() => {
    const onHide = () => {
      if (document.visibilityState === "hidden" && autosave.hasUnsaved()) void autosave.flush();
    };
    document.addEventListener("visibilitychange", onHide);
    window.addEventListener("pagehide", onHide);
    return () => {
      document.removeEventListener("visibilitychange", onHide);
      window.removeEventListener("pagehide", onHide);
    };
  }, [autosave]);

  const saveAndExit = async () => {
    const ok = await autosave.flush();
    if (!ok) return toast.error("We couldn't save your plan. Please retry before leaving.");
    toast.success("Draft saved. Pick it up any time from your plans.");
    router.push(LIST_HREF);
    router.refresh();
  };

  /* ---------------- materials ---------------- */

  const applicable = applicableMaterials(core.methods.selected);

  const generate = async (options: { keys?: MaterialKey[]; overwrite?: boolean; blank?: boolean }) => {
    setBusy(true);
    try {
      // Generation reads the saved plan, so make sure everything typed so far is stored first.
      if (!(await autosave.flush())) return toast.error("We couldn't save your latest changes first. Please retry.");
      const result = await generateMaterialsAction(planId, options);
      if (!result.ok) return toast.error(result.error);
      if (!result.data.sections.length) return toast.info("Those materials already exist.");
      setSections((prev) => {
        const nextSections = { ...prev };
        for (const s of result.data.sections) (nextSections as Record<string, unknown>)[s.key] = s.content;
        return nextSections;
      });
      setMeta((prev) => {
        const nextMeta = { ...prev };
        for (const s of result.data.sections) {
          nextMeta[s.key] = { position: s.position, source: options.blank ? "manual" : "template" };
        }
        return nextMeta;
      });
      toast.success(options.blank ? "Blank section added" : "Starter materials ready to edit");
    } finally {
      setBusy(false);
    }
  };

  const materialInfo: Partial<Record<MaterialKey, MaterialInfo>> = {};
  const materialContents: Partial<Record<MaterialKey, AnySectionContent>> = {};
  for (const key of MATERIAL_KEYS) {
    const exists = sections[key] !== undefined;
    materialInfo[key] = { exists, source: meta[key]?.source ?? null };
    if (exists) materialContents[key] = sections[key] as AnySectionContent;
  }

  /* ---------------- review ---------------- */

  const positions = React.useMemo(() => {
    const out: Record<string, { content: unknown; position: number }> = {};
    for (const key of Object.keys(sections) as SectionKey[]) {
      out[key] = { content: sections[key], position: meta[key]?.position ?? DEFAULT_POSITIONS[key] };
    }
    return out;
  }, [sections, meta]);

  const doc = React.useMemo(
    () =>
      buildPlanDocument({
        title,
        status,
        updatedAt: editedAt,
        project: project ? { name: project.name, client: project.client, industry: project.industry } : null,
        preparedBy: props.preparedBy,
        sections: positions,
      }),
    [title, status, editedAt, project, props.preparedBy, positions],
  );

  const visibleKeys = orderedSectionKeys(positions).filter((key) => !isMaterialKey(key) || applicable.includes(key));
  const reviewSections: ReviewSection[] = visibleKeys.map((key) => ({
    key,
    content: (sections[key] ?? emptyContent(key)) as AnySectionContent,
    source: meta[key]?.source ?? null,
  }));
  const completionIssues = getCompletionIssues(planMeta, core);

  const moveSection = async (key: SectionKey, direction: -1 | 1) => {
    const all = orderedSectionKeys(positions);
    const visible = visibleKeys;
    const neighbour = visible[visible.indexOf(key) + direction];
    if (!neighbour) return;
    const next = [...all];
    const a = next.indexOf(key);
    const b = next.indexOf(neighbour);
    [next[a], next[b]] = [next[b], next[a]];

    const previous = meta;
    setMeta((prev) => {
      const updated = { ...prev };
      next.forEach((k, i) => {
        updated[k] = { position: i * 10, source: prev[k]?.source ?? "manual" };
      });
      return updated;
    });
    const result = await reorderSectionsAction(planId, next);
    if (!result.ok) {
      setMeta(previous);
      toast.error(result.error);
    }
  };

  const exportFile = async (format: ExportFormat) => {
    setBusy(true);
    try {
      if (!(await autosave.flush())) return toast.error("We couldn't save your latest changes before exporting. Please retry.");
      downloadFile(`/api/research-plans/${planId}/export?format=${format}`);
      toast.success("Preparing your download…");
    } finally {
      window.setTimeout(() => setBusy(false), 800);
    }
  };

  const changeStatus = async (next: PlanStatus) => {
    setBusy(true);
    try {
      if (!(await autosave.flush())) return toast.error("We couldn't save your latest changes first. Please retry.");
      const result = await setPlanStatusAction(planId, next);
      if (!result.ok) return toast.error(result.error);
      setStatus(result.data.status);
      toast.success(next === "completed" ? "Plan marked as complete" : "Plan reopened as a draft");
      router.refresh();
    } finally {
      setBusy(false);
    }
  };

  /* ---------------- step progress ---------------- */

  // A step is complete only once it has been reached and its required details are in.
  const done = new Set<number>();
  for (const s of PLAN_STEPS) {
    if (s.id === step || s.id === REVIEW_STEP || s.id > Math.max(step, reached)) continue;
    if (getStepIssues(s.id, planMeta, core).length === 0) done.add(s.id);
  }

  const errorsFor = (n: number) =>
    showErrors[n] ? Object.fromEntries(getStepIssues(n, planMeta, core).map((i) => [i.field, i.message])) : {};

  const stepInfo = PLAN_STEPS[step - 1];
  const guidance = STEP_GUIDANCE[step];

  const editor = (key: SectionKey, n: number) => (
    <SectionEditor
      sectionKey={key}
      value={(sections[key] ?? emptyContent(key)) as AnySectionContent}
      onChange={(v) => updateSection(key, v as never)}
      errors={errorsFor(n)}
      ctx={ctx}
      participantsNeeded={participantsNeeded}
    />
  );

  const stepBody = () => {
    switch (step) {
      case 1: {
        const errors = errorsFor(1);
        return (
          <div className="space-y-6">
            <TextField
              id="field-title"
              label="Research title"
              placeholder="e.g. Onboarding research for Budgeto"
              maxLength={160}
              error={errors.title}
              value={title}
              onChange={(e) => updateMeta({ title: e.target.value })}
            />
            <SelectField
              id="field-projectId"
              label="Project"
              hint="The project this research belongs to."
              error={errors.projectId}
              value={projectId}
              onChange={(e) => {
                const picked = props.projects.find((p) => p.id === e.target.value);
                updateMeta({ projectId: e.target.value });
                if (picked?.industry && !core.context.industry.trim()) {
                  updateSection("context", { ...core.context, industry: picked.industry });
                }
              }}
            >
              <option value="">Choose a project…</option>
              {props.projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                  {p.client ? ` (${p.client})` : ""}
                </option>
              ))}
            </SelectField>
            {editor("context", 1)}
          </div>
        );
      }
      case 2:
        return editor("goals", 2);
      case 3:
        return editor("methods", 3);
      case 4:
        return editor("participants", 4);
      case 5:
        return (
          <MaterialsStep
            keys={applicable}
            info={materialInfo}
            contents={materialContents}
            ctx={ctx}
            busy={busy}
            onChange={(key, value) => updateSection(key, value as never)}
            onGenerate={generate}
          />
        );
      case 6:
        return editor("logistics", 6);
      default:
        return (
          <ReviewStep
            sections={reviewSections}
            doc={doc}
            ctx={ctx}
            issues={completionIssues}
            status={status}
            busy={busy}
            participantsNeeded={participantsNeeded}
            onChange={(key, value) => updateSection(key, value as never)}
            onMove={moveSection}
            onGoToStep={goTo}
            onExport={exportFile}
            onSetStatus={changeStatus}
          />
        );
    }
  };

  return (
    // Leaving any field saves immediately instead of waiting out the debounce.
    <div onBlurCapture={() => autosave.hasUnsaved() && void autosave.flush()}>
      <div className="mb-6 flex flex-col gap-4">
        <Link href={LIST_HREF} className="inline-flex w-fit items-center gap-1.5 rounded-md text-sm font-semibold text-muted-foreground hover:text-foreground">
          <ArrowLeft aria-hidden className="size-4" /> Research plans
        </Link>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 space-y-1.5">
            <h1 className="text-[28px] leading-tight font-bold [overflow-wrap:anywhere]">{title.trim() || "Untitled research plan"}</h1>
            <p className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              <Badge variant={status === "completed" ? "default" : "secondary"}>{status === "completed" ? "Completed" : "Draft"}</Badge>
              {project && <span>{project.name}</span>}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <SaveStatusIndicator status={autosave.status} error={autosave.error} onRetry={() => void autosave.flush()} />
            <Button type="button" variant="outline" size="sm" onClick={saveAndExit}>
              Save and continue later
            </Button>
          </div>
        </div>
      </div>

      <Stepper current={step} reached={reached} done={done} onSelect={goTo} />

      <div className={step === REVIEW_STEP ? "" : "grid gap-6 lg:grid-cols-[minmax(0,1fr)_17rem]"}>
        <Card>
          <CardHeader>
            <p className="text-xs font-semibold tabular-nums text-primary-text">
              Step {step} of {TOTAL_STEPS}
            </p>
            <h2 ref={headingRef} tabIndex={-1} className="text-base leading-snug font-bold outline-none">
              {stepInfo.title}
            </h2>
            <CardDescription>{stepInfo.description}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-6 lg:hidden">
              <GuidanceBody guidance={guidance} />
            </div>
            {stepBody()}
            <div className="mt-8 flex flex-col-reverse gap-3 border-t border-border pt-5 sm:flex-row sm:items-center sm:justify-between">
              <Button type="button" variant="outline" onClick={() => goTo(step - 1)} disabled={step === 1}>
                <ArrowLeft /> Back
              </Button>
              <div className="flex flex-col gap-2 sm:flex-row">
                {step < REVIEW_STEP && (
                  <Button type="button" onClick={next}>
                    {step === REVIEW_STEP - 1 ? "Review plan" : "Next"} <ArrowRight />
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {step !== REVIEW_STEP && (
          <aside aria-label="Guidance" className="hidden lg:block">
            <div className="sticky top-6 rounded-xl border border-border bg-secondary p-5">
              <GuidanceBody guidance={guidance} />
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}

function GuidanceBody({ guidance }: { guidance: { intro: string; tips: string[] } }) {
  return (
    <div className="space-y-3 rounded-lg bg-secondary p-4 text-sm lg:bg-transparent lg:p-0">
      <p className="flex items-center gap-2 font-semibold">
        <Lightbulb aria-hidden className="size-4 text-primary-text" /> Helpful guidance
      </p>
      <p className="text-muted-foreground">{guidance.intro}</p>
      <ul className="list-disc space-y-1.5 pl-5 text-muted-foreground">
        {guidance.tips.map((t) => (
          <li key={t}>{t}</li>
        ))}
      </ul>
    </div>
  );
}

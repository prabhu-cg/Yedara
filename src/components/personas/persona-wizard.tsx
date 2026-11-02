"use client";

import { useRouter } from "next/navigation";
import * as React from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { SelectField, TextareaField, TextField } from "@/components/forms/fields";
import { ListEditor, RowsEditor } from "@/components/research-planner/editor-primitives";
import { EvidenceEditor } from "@/components/personas/evidence-editor";
import { AvatarPicker } from "@/components/personas/persona-avatar";
import { PersonaOutput, type PersonaExportFormat } from "@/components/personas/persona-output";
import { PersonaTypeBadge, PersonaTypeNotice } from "@/components/personas/persona-type";
import { PersonaTypePicker } from "@/components/personas/persona-type-picker";
import { InheritedField } from "@/components/shared/inherited-field";
import { WizardFrame, type Guidance } from "@/components/shared/wizard-frame";
import { useAutosave, type SaveResult } from "@/hooks/use-autosave";
import { downloadFile } from "@/lib/download";
import {
  addEvidenceAction,
  deleteEvidenceAction,
  savePersonaSectionAction,
  setPersonaStatusAction,
  updateEvidenceAction,
  updatePersonaMetaAction,
} from "@/lib/personas/actions";
import {
  EXPERIENCE_LABELS,
  EXPERIENCE_LEVELS,
  PERSONA_OUTPUT_STEP,
  PERSONA_STEPS,
  PERSONA_TOTAL_STEPS,
  CONFIDENCE_LABELS,
  CONFIDENCE_LEVELS,
  type PersonaSectionKey,
  type PersonaType,
} from "@/lib/personas/constants";
import { buildPersonaDocument } from "@/lib/personas/document";
import type { EvidenceInput, EvidenceRow, PersonaContent } from "@/lib/personas/schemas";
import {
  firstInvalidPersonaStepBefore,
  getPersonaCompletionIssues,
  getPersonaIssues,
  summariseEvidence,
} from "@/lib/personas/validation";
import { SHARED_FIELDS, withOverride, type ProjectBrief, type SharedField } from "@/lib/shared-context";

type ProjectOption = { id: string; name: string; client: string | null; brief: ProjectBrief };

export type PersonaWizardProps = {
  personaId: string;
  initialName: string;
  initialProjectId: string;
  initialType: PersonaType;
  initialStatus: "draft" | "completed";
  initialStep: number;
  initialContent: PersonaContent;
  initialEvidence: EvidenceRow[];
  projects: ProjectOption[];
  preparedBy: string | null;
  updatedAt: string;
};

const LIST_HREF = "/tools/persona-builder";

const GUIDANCE: Record<number, Guidance> = {
  1: {
    intro: "Decide what this persona is for and how much evidence stands behind it. Honesty here matters more than polish.",
    tips: [
      "Pick the type that matches what you really have: research, a testable hypothesis, or a team sketch.",
      "A persona describes a group of people with shared behaviour, not one individual.",
      "Project details are reused from your brief. Override them only if this persona differs.",
    ],
  },
  2: {
    intro: "Describe who this person is and where they use your product.",
    tips: [
      "Focus on context and experience. Those shape behaviour more than age or gender.",
      "Add demographics only if they change how you would design. Never guess them.",
      "If you add demographic details, say why they matter to this research.",
    ],
  },
  3: {
    intro: "Capture what this person wants and what gets in their way.",
    tips: ["Write in their words and from their point of view.", "Behaviours are things they do; preferences are things they like.", "A single strong goal beats a long, vague list."],
  },
  4: {
    intro: "Needs are the 'why' behind behaviour. Jobs to be done describe the progress someone is trying to make.",
    tips: ["Use the pattern: When [situation], I want to [motivation], so I can [outcome].", "Emotional needs are as real as functional ones.", "Workarounds reveal unmet needs: note what people do when nothing fits."],
  },
  5: {
    intro: "Record where this persona comes from, so others can judge how far to trust it.",
    tips: [
      "Research-backed personas need at least one research source and a supporting observation or quote.",
      "Copy quotes exactly and name their source. Never write a quote yourself.",
      "Hypotheses and assumptions are welcome. Keep them marked as unvalidated until tested.",
    ],
  },
  6: { intro: "Review the finished persona, edit anything, then export it or compare it with another.", tips: [] },
};

export function PersonaWizard(props: PersonaWizardProps) {
  const router = useRouter();
  const { personaId } = props;

  const [name, setName] = React.useState(props.initialName);
  const [projectId, setProjectId] = React.useState(props.initialProjectId);
  const [type, setType] = React.useState<PersonaType>(props.initialType);
  const [status, setStatus] = React.useState(props.initialStatus);
  const [step, setStep] = React.useState(props.initialStep);
  const [reached, setReached] = React.useState(props.initialStep);
  const [content, setContent] = React.useState<PersonaContent>(props.initialContent);
  const [evidence, setEvidence] = React.useState<EvidenceRow[]>(props.initialEvidence);
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
          const m = value as { name: string; projectId: string; type: PersonaType };
          result = await updatePersonaMetaAction(personaId, { name: m.name.trim() || undefined, projectId: m.projectId || undefined, personaType: m.type });
        } else if (key === "step") {
          result = await updatePersonaMetaAction(personaId, { currentStep: value as number });
        } else if (key.startsWith("evidence:")) {
          const row = value as EvidenceRow;
          // A blank item can't be stored; it is flagged in the UI and the saved text is kept.
          if (!row.content.trim()) continue;
          result = await updateEvidenceAction(personaId, row.id, row);
        } else {
          result = await savePersonaSectionAction(personaId, key, value);
        }
        if (!result.ok) return { ok: false, error: result.error ?? "We couldn't save your changes." };
      }
      setEditedAt(new Date().toISOString());
      return { ok: true };
    },
    [personaId],
  );
  const autosave = useAutosave<unknown>({ save });

  const project = props.projects.find((p) => p.id === projectId) ?? null;
  const meta = { name, projectId: projectId || null, type };
  const data = { context: content.context, profile: content.profile, behaviour: content.behaviour, evidence };

  const updateSection = <K extends PersonaSectionKey>(key: K, value: PersonaContent[K]) => {
    setContent((prev) => ({ ...prev, [key]: value }));
    autosave.markDirty(key, value);
  };
  const updateMeta = (patch: Partial<{ name: string; projectId: string; type: PersonaType }>) => {
    const next = { name, projectId, type, ...patch };
    setName(next.name);
    setProjectId(next.projectId);
    setType(next.type);
    autosave.markDirty("meta", next);
  };
  const changeEvidence = (id: string, patch: Partial<EvidenceRow>) => {
    const current = evidence.find((e) => e.id === id);
    if (!current) return;
    const row = { ...current, ...patch };
    setEvidence((prev) => prev.map((e) => (e.id === id ? row : e)));
    autosave.markDirty(`evidence:${id}`, row);
  };
  const addEvidence = async (input: EvidenceInput) => {
    const result = await addEvidenceAction(personaId, input);
    if (!result.ok) {
      toast.error(result.error);
      return false;
    }
    setEvidence((prev) => [...prev, result.data.evidence]);
    return true;
  };
  const removeEvidence = async (id: string) => {
    const result = await deleteEvidenceAction(personaId, id);
    if (!result.ok) return void toast.error(result.error);
    setEvidence((prev) => prev.filter((e) => e.id !== id));
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
    if (target < 1 || target > PERSONA_TOTAL_STEPS || target === step) return;
    if (target > step) {
      const blocked = firstInvalidPersonaStepBefore(target, meta, data);
      if (blocked !== null) {
        setShowErrors((s) => ({ ...s, [blocked]: true }));
        setStep(blocked);
        setUrlStep(blocked);
        autosave.markDirty("step", blocked);
        toast.info(`Finish the required details in step ${blocked} first.`);
        const first = getPersonaIssues(blocked, meta, data)[0];
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
    const issues = getPersonaIssues(step, meta, data);
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
    if (!(await autosave.flush())) return void toast.error("We couldn't save your persona. Please retry before leaving.");
    toast.success("Draft saved. Pick it up any time from your personas.");
    router.push(LIST_HREF);
    router.refresh();
  };
  const exportFile = async (format: PersonaExportFormat) => {
    setBusy(true);
    try {
      if (!(await autosave.flush())) return void toast.error("We couldn't save your latest changes before exporting. Please retry.");
      downloadFile(`/api/personas/${personaId}/export?format=${format}`);
      toast.success("Preparing your download…");
    } finally {
      window.setTimeout(() => setBusy(false), 800);
    }
  };
  const changeStatus = async (nextStatus: "draft" | "completed") => {
    setBusy(true);
    try {
      if (!(await autosave.flush())) return void toast.error("We couldn't save your latest changes first. Please retry.");
      const result = await setPersonaStatusAction(personaId, nextStatus);
      if (!result.ok) return void toast.error(result.error);
      setStatus(result.data.status);
      toast.success(nextStatus === "completed" ? "Persona marked as complete" : "Persona reopened as a draft");
      router.refresh();
    } finally {
      setBusy(false);
    }
  };

  /* ---------- derived ---------- */
  const completionIssues = getPersonaCompletionIssues(meta, data);
  const errorsFor = (n: number) => {
    const out: Record<string, string> = {};
    if (!showErrors[n]) return out;
    // Several issues can share a field (e.g. "evidence"); show all of them, not just the last.
    for (const i of getPersonaIssues(n, meta, data)) out[i.field] = out[i.field] ? `${out[i.field]}. ${i.message}` : i.message;
    return out;
  };
  const done = new Set<number>();
  for (let s = 1; s < PERSONA_OUTPUT_STEP; s++) {
    if (s === step || s > Math.max(step, reached)) continue;
    if (getPersonaIssues(s, meta, data).length === 0) done.add(s);
  }
  const doc = buildPersonaDocument({
    persona: { name, type, status, updatedAt: editedAt },
    project: project ? { name: project.name, client: project.client, brief: project.brief } : null,
    preparedBy: props.preparedBy,
    content,
    evidence,
  });

  /* ---------- step bodies ---------- */
  const lists = (keys: { key: keyof PersonaContent["behaviour"]; label: string; item: string; add: string; hint?: string; placeholder?: string }[], errors: Record<string, string>) =>
    keys.map((k) => (
      <div key={k.key} id={k.key === "goals" ? "field-goals" : undefined} tabIndex={k.key === "goals" ? -1 : undefined} className="outline-none">
        <ListEditor
          id={`behaviour-${k.key}`}
          label={k.label}
          hint={k.hint}
          itemLabel={k.item}
          addLabel={k.add}
          placeholder={k.placeholder}
          items={content.behaviour[k.key]}
          error={k.key === "goals" ? errors.goals : undefined}
          onChange={(items) => updateSection("behaviour", { ...content.behaviour, [k.key]: items })}
        />
      </div>
    ));

  const body = () => {
    switch (step) {
      case 1: {
        const e = errorsFor(1);
        const overrides = content.context.overrides;
        const setOverride = (field: SharedField, value: string | undefined) =>
          updateSection("context", { ...content.context, overrides: withOverride(overrides, field, value) });
        return (
          <div className="space-y-6">
            <TextField id="field-name" label="Persona name or identifier" placeholder="e.g. Maya, the time-poor freelancer" maxLength={120} error={e.name} value={name} onChange={(ev) => updateMeta({ name: ev.target.value })} />
            <SelectField id="field-projectId" label="Project" error={e.projectId} value={projectId} onChange={(ev) => updateMeta({ projectId: ev.target.value })}>
              <option value="">Choose a project…</option>
              {props.projects.map((p) => (
                <option key={p.id} value={p.id}>{p.name}{p.client ? ` (${p.client})` : ""}</option>
              ))}
            </SelectField>
            <PersonaTypePicker value={type} onChange={(t) => updateMeta({ type: t })} />
            <PersonaTypeNotice type={type} summary={summariseEvidence(evidence)} />
            <TextareaField label="Audience segment" optional rows={3} placeholder="Which group of users does this persona represent?" value={content.context.audience_segment} onChange={(ev) => updateSection("context", { ...content.context, audience_segment: ev.target.value })} />
            <div className="space-y-5 rounded-xl border border-border bg-secondary/50 p-4 sm:p-5">
              <div>
                <p className="text-sm font-semibold">Context from your project</p>
                <p className="text-xs text-muted-foreground">Reused from the project brief. Override a field for this persona only; the project itself is never changed.</p>
              </div>
              {SHARED_FIELDS.filter((f) => f !== "project_description").map((field) => (
                <InheritedField key={field} field={field} noun="this persona" projectId={projectId || undefined} multiline={field !== "industry"} inherited={project?.brief[field === "product_service" ? "product_service" : field === "target_audience" ? "target_audience" : field === "research_objectives" ? "research_objectives" : "industry"] ?? ""} override={overrides[field]} onChange={(v) => setOverride(field, v)} />
              ))}
            </div>
          </div>
        );
      }
      case 2: {
        const e = errorsFor(2);
        const p = content.profile;
        const set = (patch: Partial<typeof p>) => updateSection("profile", { ...p, ...patch });
        return (
          <div className="space-y-6">
            <AvatarPicker value={p.avatar} name={name} onChange={(avatar) => set({ avatar })} />
            <TextareaField id="field-background" label="Background" rows={4} placeholder="Who are they, and what is their story relevant to your product?" error={e.background} value={p.background} onChange={(ev) => set({ background: ev.target.value })} />
            <div className="grid gap-6 sm:grid-cols-2">
              <TextField label="Role or occupation" optional placeholder="e.g. Freelance UX designer" value={p.role} onChange={(ev) => set({ role: ev.target.value })} />
              <SelectField label="Experience level" optional value={p.experience_level} onChange={(ev) => set({ experience_level: ev.target.value as typeof p.experience_level })}>
                <option value="">Not specified</option>
                {EXPERIENCE_LEVELS.map((l) => <option key={l} value={l}>{EXPERIENCE_LABELS[l]}</option>)}
              </SelectField>
            </div>
            <TextareaField label="Context of use" optional rows={3} placeholder="Where, when and on what do they use your product?" value={p.context_of_use} onChange={(ev) => set({ context_of_use: ev.target.value })} />
            <div className="space-y-5 rounded-xl border border-border bg-secondary/50 p-4 sm:p-5">
              <div>
                <p className="text-sm font-semibold">Demographic details <span className="text-xs font-normal text-muted-foreground">Optional</span></p>
                <p className="text-xs text-muted-foreground">Add these only when they genuinely matter to your research purpose, and only if you know them. Don&apos;t guess.</p>
              </div>
              <RowsEditor id="demographics" label="Details" rowLabel="Demographic detail" addLabel="Add demographic detail" rows={p.demographics} columns={[{ key: "label", label: "Detail", placeholder: "e.g. Region" }, { key: "value", label: "Value", placeholder: "e.g. Urban, UK" }]} createRow={() => ({ label: "", value: "" })} onChange={(rows) => set({ demographics: rows })} />
              <TextareaField id="field-demographics_justification" label="Why do these details matter to your research?" optional={!p.demographics.some((d) => d.value.trim())} rows={2} error={e.demographics_justification} value={p.demographics_justification} onChange={(ev) => set({ demographics_justification: ev.target.value })} />
            </div>
          </div>
        );
      }
      case 3:
        return <div className="space-y-7">{lists([
          { key: "goals", label: "Goals", item: "Goal", add: "Add goal", hint: "What are they trying to achieve? At least one is needed.", placeholder: "e.g. Get paid on time without chasing" },
          { key: "needs", label: "Needs", item: "Need", add: "Add need" },
          { key: "motivations", label: "Motivations", item: "Motivation", add: "Add motivation" },
          { key: "behaviours", label: "Behaviours", item: "Behaviour", add: "Add behaviour" },
          { key: "preferences", label: "Preferences", item: "Preference", add: "Add preference" },
          { key: "pain_points", label: "Pain points", item: "Pain point", add: "Add pain point" },
          { key: "frustrations", label: "Frustrations", item: "Frustration", add: "Add frustration" },
          { key: "barriers", label: "Barriers", item: "Barrier", add: "Add barrier" },
        ], errorsFor(3))}</div>;
      case 4: {
        const n = content.needs;
        const set = (patch: Partial<typeof n>) => updateSection("needs", { ...n, ...patch });
        const simple = (key: "functional_needs" | "emotional_needs" | "desired_outcomes" | "alternatives" | "workarounds", label: string, item: string, add: string) => (
          <ListEditor key={key} id={`needs-${key}`} label={label} itemLabel={item} addLabel={add} items={n[key]} onChange={(items) => set({ [key]: items })} />
        );
        return (
          <div className="space-y-7">
            <RowsEditor id="jobs" label="Jobs to be done" hint="When [situation], I want to [motivation], so I can [outcome]." rowLabel="Job" addLabel="Add job" rows={n.jobs} columns={[{ key: "situation", label: "When (situation)", multiline: true }, { key: "motivation", label: "I want to (motivation)", multiline: true }, { key: "outcome", label: "So I can (outcome)", multiline: true }]} createRow={() => ({ situation: "", motivation: "", outcome: "" })} onChange={(jobs) => set({ jobs })} />
            {simple("functional_needs", "Functional needs", "Functional need", "Add functional need")}
            {simple("emotional_needs", "Emotional needs", "Emotional need", "Add emotional need")}
            {simple("desired_outcomes", "Desired outcomes", "Outcome", "Add outcome")}
            {simple("alternatives", "Current alternatives", "Alternative", "Add alternative")}
            {simple("workarounds", "Workarounds", "Workaround", "Add workaround")}
          </div>
        );
      }
      case 5: {
        const ev = content.evidence;
        return (
          <div className="space-y-8">
            <PersonaTypeNotice type={type} summary={summariseEvidence(evidence)} />
            <EvidenceEditor evidence={evidence} errors={errorsFor(5)} onAdd={addEvidence} onChange={changeEvidence} onRemove={removeEvidence} />
            <div className="space-y-5 rounded-xl border border-border bg-secondary/50 p-4 sm:p-5">
              <p className="text-sm font-semibold">Overall assessment</p>
              <SelectField label="Overall confidence in this persona" optional value={ev.overall_confidence} onChange={(e) => updateSection("evidence", { ...ev, overall_confidence: e.target.value as typeof ev.overall_confidence })}>
                <option value="">Not rated</option>
                {CONFIDENCE_LEVELS.map((c) => <option key={c} value={c}>{CONFIDENCE_LABELS[c]}</option>)}
              </SelectField>
              <TextareaField label="Notes on the evidence" optional rows={3} value={ev.summary_notes} onChange={(e) => updateSection("evidence", { ...ev, summary_notes: e.target.value })} />
              <TextareaField label="Limitations" optional rows={3} hint="Small sample? One segment? Say so." value={ev.limitations} onChange={(e) => updateSection("evidence", { ...ev, limitations: e.target.value })} />
            </div>
          </div>
        );
      }
      default:
        return (
          <PersonaOutput
            name={name}
            type={type}
            projectName={project?.name ?? null}
            content={content}
            evidence={evidence}
            doc={doc}
            issues={completionIssues}
            status={status}
            busy={busy}
            personaId={personaId}
            onChangeOutput={(v) => updateSection("output", v)}
            onEdit={goTo}
            onExport={exportFile}
            onSetStatus={changeStatus}
          />
        );
    }
  };

  return (
    <div onBlurCapture={() => autosave.hasUnsaved() && void autosave.flush()}>
      <WizardFrame
        backHref={LIST_HREF}
        backLabel="Personas"
        title={name.trim() || "Untitled persona"}
        badges={
          <>
            <PersonaTypeBadge type={type} />
            <Badge variant={status === "completed" ? "default" : "secondary"}>{status === "completed" ? "Completed" : "Draft"}</Badge>
            {project && <span>{project.name}</span>}
          </>
        }
        saveStatus={autosave.status}
        saveError={autosave.error}
        onRetrySave={() => void autosave.flush()}
        onSaveAndExit={saveAndExit}
        steps={PERSONA_STEPS}
        step={step}
        reached={reached}
        done={done}
        onSelectStep={goTo}
        onNext={next}
        guidance={GUIDANCE[step]}
        fullWidth={step === PERSONA_OUTPUT_STEP}
        headingRef={headingRef}
      >
        {body()}
      </WizardFrame>
    </div>
  );
}

"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { CancelButton } from "@/components/layout/route-drawer";
import { FormAlert, SelectField, SubmitButton, TextField, TextareaField } from "@/components/forms/fields";
import { JOURNEY_STATES, JOURNEY_STATE_HINTS, JOURNEY_STATE_LABELS, JOURNEY_TYPES, JOURNEY_TYPE_LABELS, type JourneyState, type JourneyType } from "@/lib/journeys/constants";
import { createJourneyAction } from "@/lib/journeys/actions";

export function NewJourneyForm({ projects, personas, defaultProjectId }: { projects: { id: string; name: string; client: string | null }[]; personas: { id: string; name: string; project_id: string }[]; defaultProjectId?: string }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [projectId, setProjectId] = useState(projects.find((p) => p.id === defaultProjectId)?.id ?? "");
  const [personaId, setPersonaId] = useState("");
  const [journeyType, setJourneyType] = useState<JourneyType>("customer");
  const [state, setState] = useState<JourneyState>("current");
  const [scenario, setScenario] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const options = useMemo(() => personas.filter((p) => p.project_id === projectId), [personas, projectId]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const next: Record<string, string> = {};
    if (!name.trim()) next.name = "Give the journey a name";
    if (!projectId) next.projectId = "Choose a project";
    setErrors(next);
    if (Object.keys(next).length) return;

    setPending(true);
    setFormError(null);
    const result = await createJourneyAction({ name, projectId, personaId, journeyType, scenario, state });
    if (!result.ok) {
      setPending(false);
      setErrors(Object.fromEntries(Object.entries(result.fieldErrors ?? {}).map(([k, v]) => [k, v[0]])));
      return setFormError(result.error);
    }
    toast.success("Journey created. Add its stages next.");
    router.push(`/tools/journey-mapper/${result.data.id}`);
  };

  return (
    <form onSubmit={submit} noValidate className="space-y-6">
      <FormAlert message={formError} />
      <TextField label="Journey name" placeholder="e.g. First week with Budgeto" maxLength={160} error={errors.name} value={name} onChange={(e) => setName(e.target.value)} />
      <div className="grid gap-4 sm:grid-cols-2">
        <SelectField label="Project" error={errors.projectId} value={projectId} onChange={(e) => { setProjectId(e.target.value); setPersonaId(""); }}>
          <option value="">Choose a project…</option>
          {projects.map((p) => <option key={p.id} value={p.id}>{p.name}{p.client ? ` (${p.client})` : ""}</option>)}
        </SelectField>
        <SelectField label="Persona" optional error={errors.personaId} hint={projectId && options.length === 0 ? "This project has no personas yet." : "From the chosen project."} value={personaId} onChange={(e) => setPersonaId(e.target.value)} disabled={!projectId}>
          <option value="">No persona</option>
          {options.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </SelectField>
        <SelectField label="Journey type" value={journeyType} onChange={(e) => setJourneyType(e.target.value as JourneyType)}>
          {JOURNEY_TYPES.map((t) => <option key={t} value={t}>{JOURNEY_TYPE_LABELS[t]}</option>)}
        </SelectField>
        <SelectField label="State" hint={JOURNEY_STATE_HINTS[state]} value={state} onChange={(e) => setState(e.target.value as JourneyState)}>
          {JOURNEY_STATES.map((s) => <option key={s} value={s}>{JOURNEY_STATE_LABELS[s]}</option>)}
        </SelectField>
      </div>
      <TextareaField label="Scenario" optional rows={3} maxLength={2000} placeholder="The situation this journey follows, e.g. a freelancer sets up invoicing for the first time." value={scenario} onChange={(e) => setScenario(e.target.value)} />
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <CancelButton href="/tools/journey-mapper" />
        <SubmitButton pending={pending} pendingLabel="Creating…">Start mapping</SubmitButton>
      </div>
    </form>
  );
}

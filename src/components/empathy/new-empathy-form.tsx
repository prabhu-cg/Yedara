"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { CancelButton } from "@/components/layout/route-drawer";
import { FormAlert, SelectField, SubmitButton, TextField, TextareaField } from "@/components/forms/fields";
import { createEmpathyMapAction } from "@/lib/empathy/actions";
import { EMPATHY_LIMITS } from "@/lib/empathy/constants";

export function NewEmpathyForm({
  projects,
  personas,
  defaultProjectId,
}: {
  projects: { id: string; name: string; client: string | null }[];
  personas: { id: string; name: string; project_id: string }[];
  defaultProjectId?: string;
}) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [projectId, setProjectId] = useState(projects.find((p) => p.id === defaultProjectId)?.id ?? "");
  const [personaId, setPersonaId] = useState("");
  const [subject, setSubject] = useState("");
  const [context, setContext] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const options = useMemo(() => personas.filter((p) => p.project_id === projectId), [personas, projectId]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const next: Record<string, string> = {};
    if (!title.trim()) next.title = "Give the map a title";
    if (!projectId) next.projectId = "Choose a project";
    if (!personaId && !subject.trim()) next.subject = "Say who this map is about, or choose a persona";
    setErrors(next);
    if (Object.keys(next).length) return;

    setPending(true);
    setFormError(null);
    const result = await createEmpathyMapAction({ title, projectId, personaId, subject, context });
    if (!result.ok) {
      setPending(false);
      setErrors(Object.fromEntries(Object.entries(result.fieldErrors ?? {}).map(([k, v]) => [k, v[0]])));
      return setFormError(result.error);
    }
    toast.success("Empathy map created. Add what you know.");
    router.push(`/tools/empathy-mapper/${result.data.id}`);
  };

  return (
    <form onSubmit={submit} noValidate className="space-y-6">
      <FormAlert message={formError} />
      <TextField label="Map title" placeholder="e.g. Maya planning dinner on a weeknight" maxLength={EMPATHY_LIMITS.title} error={errors.title} value={title} onChange={(e) => setTitle(e.target.value)} />
      <SelectField label="Project" error={errors.projectId} value={projectId} onChange={(e) => { setProjectId(e.target.value); setPersonaId(""); }}>
        <option value="">Choose a project…</option>
        {projects.map((p) => <option key={p.id} value={p.id}>{p.name}{p.client ? ` (${p.client})` : ""}</option>)}
      </SelectField>
      <fieldset className="space-y-4 rounded-lg border border-border p-4">
        <legend className="px-1.5 text-sm font-semibold">Who is it about?</legend>
        <p className="text-sm text-muted-foreground">Link a persona, or just name the person or group. You don&apos;t need a persona to make an empathy map.</p>
        <SelectField label="Persona" optional error={errors.personaId} hint={projectId && options.length === 0 ? "This project has no personas yet." : "From the chosen project."} value={personaId} onChange={(e) => setPersonaId(e.target.value)} disabled={!projectId}>
          <option value="">No persona</option>
          {options.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </SelectField>
        <TextField label={personaId ? "Name on the map" : "Subject"} optional={Boolean(personaId)} placeholder={personaId ? "Defaults to the persona's name" : "e.g. First-time home cook, or Participant P3"} maxLength={EMPATHY_LIMITS.subject} error={errors.subject} value={subject} onChange={(e) => setSubject(e.target.value)} />
      </fieldset>
      <TextareaField label="Situation" optional rows={3} maxLength={EMPATHY_LIMITS.context} placeholder="The moment this map describes, e.g. planning the week's dinners on a Sunday evening." value={context} onChange={(e) => setContext(e.target.value)} />
      <div className="form-actions flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <CancelButton href="/tools/empathy-mapper" />
        <SubmitButton pending={pending} pendingLabel="Creating…">Start mapping</SubmitButton>
      </div>
    </form>
  );
}

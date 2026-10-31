"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { FormAlert, SelectField, SubmitButton, TextField } from "@/components/forms/fields";
import { PersonaTypePicker } from "@/components/personas/persona-type-picker";
import { createPersonaAction } from "@/lib/personas/actions";
import type { PersonaType } from "@/lib/personas/constants";

export function NewPersonaForm({ projects, defaultProjectId }: { projects: { id: string; name: string; client: string | null }[]; defaultProjectId?: string }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [projectId, setProjectId] = useState(projects.find((p) => p.id === defaultProjectId)?.id ?? "");
  const [type, setType] = useState<PersonaType>("hypothesis");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const next: Record<string, string> = {};
    if (!name.trim()) next.name = "Give the persona a name or identifier";
    if (!projectId) next.projectId = "Choose a project";
    setErrors(next);
    if (Object.keys(next).length) return;

    setPending(true);
    setFormError(null);
    const result = await createPersonaAction({ name, projectId, personaType: type });
    if (!result.ok) {
      setPending(false);
      setErrors(Object.fromEntries(Object.entries(result.fieldErrors ?? {}).map(([k, v]) => [k, v[0]])));
      return setFormError(result.error);
    }
    toast.success("Persona created. It saves automatically as you go.");
    router.push(`/tools/persona-builder/${result.data.id}`);
  };

  return (
    <form onSubmit={submit} noValidate className="space-y-6">
      <FormAlert message={formError} />
      <TextField label="Persona name or identifier" placeholder="e.g. Maya, the time-poor freelancer" maxLength={120} error={errors.name} value={name} onChange={(e) => setName(e.target.value)} />
      <SelectField label="Project" hint="You can change this later." error={errors.projectId} value={projectId} onChange={(e) => setProjectId(e.target.value)}>
        <option value="">Choose a project…</option>
        {projects.map((p) => <option key={p.id} value={p.id}>{p.name}{p.client ? ` (${p.client})` : ""}</option>)}
      </SelectField>
      <PersonaTypePicker value={type} onChange={setType} />
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button asChild variant="outline"><Link href="/tools/persona-builder">Cancel</Link></Button>
        <SubmitButton pending={pending} pendingLabel="Creating…">Start building</SubmitButton>
      </div>
    </form>
  );
}

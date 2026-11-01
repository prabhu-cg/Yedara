"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { CancelButton } from "@/components/layout/route-drawer";
import { FormAlert, SelectField, SubmitButton, TextField } from "@/components/forms/fields";
import { createSynthesisAction } from "@/lib/synthesizer/actions";

export function NewSynthesisForm({ projects, defaultProjectId }: { projects: { id: string; name: string; client: string | null }[]; defaultProjectId?: string }) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [projectId, setProjectId] = useState(projects.find((p) => p.id === defaultProjectId)?.id ?? "");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const next: Record<string, string> = {};
    if (!title.trim()) next.title = "Give the synthesis a title";
    if (!projectId) next.projectId = "Choose a project";
    setErrors(next);
    if (Object.keys(next).length) return;

    setPending(true);
    setFormError(null);
    const result = await createSynthesisAction({ title, projectId });
    if (!result.ok) {
      setPending(false);
      setErrors(Object.fromEntries(Object.entries(result.fieldErrors ?? {}).map(([k, v]) => [k, v[0]])));
      return setFormError(result.error);
    }
    toast.success("Synthesis created. The board and report save automatically.");
    router.push(`/tools/research-synthesizer/${result.data.id}`);
  };

  return (
    <form onSubmit={submit} noValidate className="space-y-6">
      <FormAlert message={formError} />
      <TextField label="Synthesis title" placeholder="e.g. Onboarding interviews, round 1" maxLength={160} error={errors.title} value={title} onChange={(e) => setTitle(e.target.value)} />
      <SelectField label="Project" hint="You can change the project later." error={errors.projectId} value={projectId} onChange={(e) => setProjectId(e.target.value)}>
        <option value="">Choose a project…</option>
        {projects.map((p) => <option key={p.id} value={p.id}>{p.name}{p.client ? ` (${p.client})` : ""}</option>)}
      </SelectField>
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <CancelButton href="/tools/research-synthesizer" />
        <SubmitButton pending={pending} pendingLabel="Creating…">Start synthesis</SubmitButton>
      </div>
    </form>
  );
}

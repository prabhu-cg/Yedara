"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { FormAlert, SelectField, SubmitButton, TextField } from "@/components/forms/fields";
import { createAnalysisAction } from "@/lib/competitors/actions";

export function NewAnalysisForm({ projects, defaultProjectId }: { projects: { id: string; name: string; client: string | null }[]; defaultProjectId?: string }) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [projectId, setProjectId] = useState(projects.find((p) => p.id === defaultProjectId)?.id ?? "");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const next: Record<string, string> = {};
    if (!title.trim()) next.title = "Give the analysis a title";
    if (!projectId) next.projectId = "Choose a project";
    setErrors(next);
    if (Object.keys(next).length) return;

    setPending(true);
    setFormError(null);
    const result = await createAnalysisAction({ title, projectId });
    if (!result.ok) {
      setPending(false);
      setErrors(Object.fromEntries(Object.entries(result.fieldErrors ?? {}).map(([k, v]) => [k, v[0]])));
      return setFormError(result.error);
    }
    toast.success("Analysis created. It saves automatically as you go.");
    router.push(`/tools/competitor-analyzer/${result.data.id}`);
  };

  return (
    <form onSubmit={submit} noValidate className="space-y-6">
      <FormAlert message={formError} />
      <TextField label="Analysis title" placeholder="e.g. Invoicing tools for freelancers" maxLength={160} error={errors.title} value={title} onChange={(e) => setTitle(e.target.value)} />
      <SelectField label="Project" hint="Its brief is reused here. You can change the project later." error={errors.projectId} value={projectId} onChange={(e) => setProjectId(e.target.value)}>
        <option value="">Choose a project…</option>
        {projects.map((p) => <option key={p.id} value={p.id}>{p.name}{p.client ? ` (${p.client})` : ""}</option>)}
      </SelectField>
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button asChild variant="outline"><Link href="/tools/competitor-analyzer">Cancel</Link></Button>
        <SubmitButton pending={pending} pendingLabel="Creating…">Start analysis</SubmitButton>
      </div>
    </form>
  );
}

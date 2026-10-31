"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { applyFieldErrors, FormAlert, SelectField, SubmitButton, TextField } from "@/components/forms/fields";
import { createPlanAction } from "@/lib/research-planner/actions";

const schema = z.object({
  title: z.string().trim().min(1, "Give your research a title").max(160, "Use 160 characters or fewer"),
  projectId: z.string().min(1, "Choose a project"),
});
type Values = z.infer<typeof schema>;

export function NewPlanForm({
  projects,
  defaultProjectId,
}: {
  projects: { id: string; name: string; client: string | null }[];
  defaultProjectId?: string;
}) {
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);
  const initialProject = projects.find((p) => p.id === defaultProjectId);
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: initialProject ? `Research plan for ${initialProject.name}` : "",
      projectId: initialProject?.id ?? "",
    },
  });

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    const result = await createPlanAction(values);
    if (!result.ok) {
      applyFieldErrors(setError, result.fieldErrors);
      setFormError(result.error);
      return;
    }
    toast.success("Plan created. It saves automatically as you go.");
    router.push(`/tools/research-planner/${result.data.id}`);
  });

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-6">
      <FormAlert message={formError} />
      <TextField
        label="Research title"
        placeholder="e.g. Onboarding research for Budgeto"
        maxLength={160}
        error={errors.title?.message}
        {...register("title")}
      />
      <SelectField label="Project" hint="You can change this later." error={errors.projectId?.message} {...register("projectId")}>
        <option value="">Choose a project…</option>
        {projects.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
            {p.client ? ` (${p.client})` : ""}
          </option>
        ))}
      </SelectField>
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button asChild variant="outline">
          <Link href="/tools/research-planner">Cancel</Link>
        </Button>
        <SubmitButton pending={isSubmitting} pendingLabel="Creating…">
          Start planning
        </SubmitButton>
      </div>
    </form>
  );
}

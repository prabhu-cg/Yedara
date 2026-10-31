"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { createProjectAction, updateProjectAction } from "@/lib/projects/actions";
import { projectFormSchema, type ProjectFormValues } from "@/lib/projects/schemas";
import {
  EDITABLE_STATUSES,
  INDUSTRY_SUGGESTIONS,
  PROJECT_TYPES,
  STATUS_LABELS,
} from "@/lib/projects/constants";
import {
  applyFieldErrors,
  FormAlert,
  SelectField,
  SubmitButton,
  TextareaField,
  TextField,
} from "@/components/forms/fields";
import { Button } from "@/components/ui/button";

const EMPTY: ProjectFormValues = {
  name: "",
  description: "",
  client: "",
  industry: "",
  project_type: "ux_research",
  status: "planning",
};

type Props =
  | { mode: "create"; defaultValues?: undefined; projectId?: undefined; archived?: undefined }
  | { mode: "edit"; defaultValues: ProjectFormValues; projectId: string; archived?: boolean };

export function ProjectForm({ mode, defaultValues, projectId, archived }: Props) {
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<ProjectFormValues>({
    resolver: zodResolver(projectFormSchema),
    defaultValues: defaultValues ?? EMPTY,
  });

  const cancelHref = mode === "edit" ? `/projects/${projectId}` : "/projects";

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    const result =
      mode === "create"
        ? await createProjectAction(values)
        : await updateProjectAction(projectId, values);

    if (!result.ok) {
      applyFieldErrors(setError, result.fieldErrors);
      setFormError(result.error);
      return;
    }
    toast.success(mode === "create" ? "Project created" : "Changes saved");
    router.push(`/projects/${result.data.id}`);
    router.refresh();
  });

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-6">
      <FormAlert message={formError} />

      <TextField
        label="Project name"
        placeholder="e.g. Onboarding research for Acme"
        autoComplete="off"
        error={errors.name?.message}
        {...register("name")}
      />

      <TextareaField
        label="Description"
        optional
        rows={4}
        placeholder="What are you trying to learn or achieve?"
        error={errors.description?.message}
        {...register("description")}
      />

      <div className="grid gap-6 sm:grid-cols-2">
        <TextField
          label="Client"
          optional
          placeholder="Who is this for?"
          autoComplete="off"
          error={errors.client?.message}
          {...register("client")}
        />
        <div>
          <TextField
            label="Industry"
            optional
            list="industry-suggestions"
            placeholder="e.g. Fintech"
            autoComplete="off"
            error={errors.industry?.message}
            {...register("industry")}
          />
          <datalist id="industry-suggestions">
            {INDUSTRY_SUGGESTIONS.map((industry) => (
              <option key={industry} value={industry} />
            ))}
          </datalist>
        </div>
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <SelectField label="Project type" error={errors.project_type?.message} {...register("project_type")}>
          {PROJECT_TYPES.map((type) => (
            <option key={type.value} value={type.value}>
              {type.label}
            </option>
          ))}
        </SelectField>
        <SelectField
          label="Status"
          disabled={archived}
          hint={archived ? "Restore this project to change its status." : undefined}
          error={errors.status?.message}
          {...register("status")}
        >
          {EDITABLE_STATUSES.map((status) => (
            <option key={status} value={status}>
              {STATUS_LABELS[status]}
            </option>
          ))}
        </SelectField>
      </div>

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button asChild variant="outline">
          <Link href={cancelHref}>Cancel</Link>
        </Button>
        <SubmitButton
          pending={isSubmitting}
          pendingLabel={mode === "create" ? "Creating…" : "Saving…"}
        >
          {mode === "create" ? "Create project" : "Save changes"}
        </SubmitButton>
      </div>
    </form>
  );
}

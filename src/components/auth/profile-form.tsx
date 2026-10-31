"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { updateProfileAction } from "@/lib/auth/actions";
import { profileSchema, type ProfileValues } from "@/lib/auth/schemas";
import { applyFieldErrors, FormAlert, SubmitButton, TextField } from "@/components/forms/fields";

export function ProfileForm({ defaultValues }: { defaultValues: ProfileValues }) {
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    setError,
    reset,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<ProfileValues>({ resolver: zodResolver(profileSchema), defaultValues });

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    const result = await updateProfileAction(values);
    if (!result.ok) {
      applyFieldErrors(setError, result.fieldErrors);
      setFormError(result.error);
      return;
    }
    toast.success("Profile updated");
    reset(values);
  });

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-5">
      <FormAlert message={formError} />
      <TextField label="Full name" autoComplete="name" error={errors.fullName?.message} {...register("fullName")} />
      <TextField
        label="Job title"
        optional
        autoComplete="organization-title"
        error={errors.jobTitle?.message}
        {...register("jobTitle")}
      />
      <TextField
        label="Company or studio"
        optional
        autoComplete="organization"
        error={errors.company?.message}
        {...register("company")}
      />
      <SubmitButton pending={isSubmitting} pendingLabel="Saving…" disabled={!isDirty}>
        Save changes
      </SubmitButton>
    </form>
  );
}

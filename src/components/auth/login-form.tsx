"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { signInAction } from "@/lib/auth/actions";
import { loginSchema, type LoginValues } from "@/lib/auth/schemas";
import { applyFieldErrors, FormAlert, PasswordField, SubmitButton, TextField } from "@/components/forms/fields";

export function LoginForm({ next, initialError }: { next?: string; initialError?: string }) {
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(initialError ?? null);
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({ resolver: zodResolver(loginSchema), defaultValues: { email: "", password: "" } });

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    const result = await signInAction(values, next);
    if (!result.ok) {
      applyFieldErrors(setError, result.fieldErrors);
      setFormError(result.error);
      return;
    }
    router.replace(result.data.redirectTo);
    router.refresh();
  });

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-5">
      <FormAlert message={formError} />
      <TextField
        label="Email"
        type="email"
        autoComplete="email"
        inputMode="email"
        error={errors.email?.message}
        {...register("email")}
      />
      <PasswordField
        label="Password"
        autoComplete="current-password"
        error={errors.password?.message}
        {...register("password")}
      />
      <div className="flex justify-end">
        <Link href="/forgot-password" className="text-sm font-semibold text-primary-text underline-offset-4 hover:underline">
          Forgot password?
        </Link>
      </div>
      <SubmitButton pending={isSubmitting} pendingLabel="Signing in…" className="w-full">
        Sign in
      </SubmitButton>
    </form>
  );
}

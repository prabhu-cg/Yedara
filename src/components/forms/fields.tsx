"use client";

import * as React from "react";
import { Eye, EyeOff, LoaderCircle, CircleAlert } from "lucide-react";
import type { FieldValues, Path, UseFormSetError } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

type FieldShellProps = {
  label: string;
  error?: string;
  hint?: string;
  optional?: boolean;
  className?: string;
};

function describedBy(id: string, error?: string, hint?: string) {
  const ids = [hint && `${id}-hint`, error && `${id}-error`].filter(Boolean);
  return ids.length ? ids.join(" ") : undefined;
}

function FieldShell({
  id,
  label,
  error,
  hint,
  optional,
  className,
  children,
}: FieldShellProps & { id: string; children: React.ReactNode }) {
  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-baseline justify-between gap-2">
        <Label htmlFor={id}>{label}</Label>
        {optional && <span className="text-xs text-muted-foreground">Optional</span>}
      </div>
      {children}
      {hint && !error && (
        <p id={`${id}-hint`} className="text-xs text-muted-foreground">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} role="alert" className="text-sm font-medium text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}

export function TextField({
  label,
  error,
  hint,
  optional,
  className,
  id: idProp,
  ...props
}: FieldShellProps & React.ComponentProps<"input">) {
  const generated = React.useId();
  const id = idProp ?? generated;
  return (
    <FieldShell id={id} label={label} error={error} hint={hint} optional={optional} className={className}>
      <Input id={id} aria-invalid={Boolean(error)} aria-describedby={describedBy(id, error, hint)} {...props} />
    </FieldShell>
  );
}

export function PasswordField({
  label,
  error,
  hint,
  className,
  id: idProp,
  ...props
}: FieldShellProps & Omit<React.ComponentProps<"input">, "type">) {
  const generated = React.useId();
  const id = idProp ?? generated;
  const [visible, setVisible] = React.useState(false);
  return (
    <FieldShell id={id} label={label} error={error} hint={hint} className={className}>
      <div className="relative">
        <Input
          id={id}
          type={visible ? "text" : "password"}
          aria-invalid={Boolean(error)}
          aria-describedby={describedBy(id, error, hint)}
          className="pr-11"
          {...props}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? "Hide password" : "Show password"}
          aria-pressed={visible}
          className="absolute top-1/2 right-1 inline-flex size-8 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
        >
          {visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
        </button>
      </div>
    </FieldShell>
  );
}

export function TextareaField({
  label,
  error,
  hint,
  optional,
  className,
  id: idProp,
  ...props
}: FieldShellProps & React.ComponentProps<"textarea">) {
  const generated = React.useId();
  const id = idProp ?? generated;
  return (
    <FieldShell id={id} label={label} error={error} hint={hint} optional={optional} className={className}>
      <Textarea id={id} aria-invalid={Boolean(error)} aria-describedby={describedBy(id, error, hint)} {...props} />
    </FieldShell>
  );
}

export function SelectField({
  label,
  error,
  hint,
  optional,
  className,
  id: idProp,
  children,
  ...props
}: FieldShellProps & React.ComponentProps<"select">) {
  const generated = React.useId();
  const id = idProp ?? generated;
  return (
    <FieldShell id={id} label={label} error={error} hint={hint} optional={optional} className={className}>
      <NativeSelect id={id} aria-invalid={Boolean(error)} aria-describedby={describedBy(id, error, hint)} {...props}>
        {children}
      </NativeSelect>
    </FieldShell>
  );
}

export function SubmitButton({
  pending,
  children,
  pendingLabel,
  ...props
}: React.ComponentProps<typeof Button> & { pending: boolean; pendingLabel?: string }) {
  return (
    <Button type="submit" disabled={pending || props.disabled} aria-busy={pending} {...props}>
      {pending && <LoaderCircle aria-hidden className="animate-spin" />}
      {pending ? (pendingLabel ?? children) : children}
    </Button>
  );
}

export function FormAlert({ message }: { message?: string | null }) {
  if (!message) return null;
  return (
    <div
      role="alert"
      className="flex items-start gap-2.5 rounded-md border border-destructive/30 bg-destructive/5 px-3.5 py-3 text-sm text-destructive"
    >
      <CircleAlert aria-hidden className="mt-0.5 size-4 shrink-0" />
      <span>{message}</span>
    </div>
  );
}

/** Copies server-side validation errors onto the matching react-hook-form fields. */
export function applyFieldErrors<T extends FieldValues>(
  setError: UseFormSetError<T>,
  fieldErrors?: Record<string, string[]>,
) {
  if (!fieldErrors) return;
  for (const [name, messages] of Object.entries(fieldErrors)) {
    setError(name as Path<T>, { type: "server", message: messages[0] });
  }
}

"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { CircleCheck } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { applyFieldErrors, FormAlert, SelectField, SubmitButton, TextareaField, TextField } from "@/components/forms/fields";
import { Button } from "@/components/ui/button";
import { sendContactMessageAction } from "@/lib/contact/actions";
import { CONTACT_TOPICS, contactSchema, isContactTopic, type ContactValues } from "@/lib/contact/schema";

export function ContactForm() {
  const params = useSearchParams();
  const requested = params.get("topic");
  const [formError, setFormError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  // When the form appeared; the server rejects submissions that arrive faster than a person can write.
  const [openedAt, setOpenedAt] = useState(() => Date.now());
  const confirmation = useRef<HTMLDivElement>(null);

  const {
    register,
    handleSubmit,
    setError,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ContactValues>({
    resolver: zodResolver(contactSchema),
    defaultValues: {
      name: "",
      email: "",
      topic: isContactTopic(requested) ? requested : "general",
      message: "",
      website: "",
    },
  });

  useEffect(() => {
    if (sent) confirmation.current?.focus();
  }, [sent]);

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    const result = await sendContactMessageAction({ ...values, openedAt });
    if (!result.ok) {
      applyFieldErrors(setError, result.fieldErrors);
      setFormError(result.error);
      return;
    }
    setSent(true);
  });

  if (sent) {
    return (
      <div
        ref={confirmation}
        tabIndex={-1}
        role="status"
        className="rounded-3xl border border-success/30 bg-success-soft p-8 outline-none sm:p-10"
      >
        <CircleCheck aria-hidden className="size-9 text-success" />
        <h2 className="mt-4 text-2xl font-extrabold tracking-tight">Message sent.</h2>
        <p className="mt-2 max-w-[44ch] text-foreground/80">
          Thank you. We&apos;ve got your message and will reply to the email address you gave.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Button
            variant="outline"
            onClick={() => {
              reset();
              setOpenedAt(Date.now());
              setSent(false);
            }}
          >
            Send another message
          </Button>
          <Button asChild variant="ghost">
            <Link href="/">Back to home</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-5 rounded-3xl border border-border-strong bg-card p-6 sm:p-9">
      <FormAlert message={formError} />
      <div className="grid gap-5 sm:grid-cols-2">
        <TextField label="Name" autoComplete="name" error={errors.name?.message} {...register("name")} />
        <TextField
          label="Email"
          type="email"
          autoComplete="email"
          inputMode="email"
          error={errors.email?.message}
          {...register("email")}
        />
      </div>
      <SelectField label="What is this about?" error={errors.topic?.message} {...register("topic")}>
        {CONTACT_TOPICS.map((topic) => (
          <option key={topic.value} value={topic.value}>
            {topic.label}
          </option>
        ))}
      </SelectField>
      <TextareaField
        label="Message"
        rows={6}
        hint="Please don't include passwords or participant details."
        error={errors.message?.message}
        {...register("message")}
      />
      {/* Honeypot: hidden from people and assistive tech, tempting to bots. */}
      <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
        <label>
          Website
          <input type="text" tabIndex={-1} autoComplete="off" {...register("website")} />
        </label>
      </div>
      <SubmitButton pending={isSubmitting} pendingLabel="Sending…" size="lg" className="h-12 w-full text-base font-bold sm:w-auto sm:px-8">
        Send message
      </SubmitButton>
    </form>
  );
}

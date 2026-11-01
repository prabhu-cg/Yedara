"use client";

import { useEffect, useRef, useState } from "react";
import { Check, MessageSquare, X } from "lucide-react";
import { OPEN_FEEDBACK_EVENT } from "@/components/feedback/feedback-trigger";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { sendFeedbackAction } from "@/lib/feedback/actions";
import { FEEDBACK_TYPES, MAX_FEEDBACK_LENGTH, type FeedbackType } from "@/lib/feedback/schema";
import { cn } from "@/lib/utils";

type Status = "idle" | "sending" | "sent" | "error";

/** Floating feedback button that opens a non-modal panel in the bottom-right corner. Used on the public site and in the app. */
export function FeedbackWidget() {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<FeedbackType>("bug");
  const [message, setMessage] = useState("");
  const [website, setWebsite] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  // When the panel was opened; the server ignores submissions that arrive faster than a person can write.
  const [openedAt, setOpenedAt] = useState(() => Date.now());
  const buttonRef = useRef<HTMLButtonElement>(null);
  const confirmationRef = useRef<HTMLDivElement>(null);

  function show(next: FeedbackType | undefined) {
    if (next) setType(next);
    setOpenedAt(Date.now());
    setOpen(true);
  }

  function close() {
    setOpen(false);
    buttonRef.current?.focus();
  }

  useEffect(() => {
    const onOpen = (event: Event) => show((event as CustomEvent<{ type?: FeedbackType }>).detail?.type);
    window.addEventListener(OPEN_FEEDBACK_EVENT, onOpen);
    return () => window.removeEventListener(OPEN_FEEDBACK_EVENT, onOpen);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  useEffect(() => {
    if (status === "sent") confirmationRef.current?.focus();
  }, [status]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setStatus("sending");
    setError(null);
    const result = await sendFeedbackAction({ type, message, website, openedAt });
    if (!result.ok) {
      setError(result.fieldErrors?.message?.[0] ?? result.error);
      setStatus("error");
      return;
    }
    setStatus("sent");
    setMessage("");
  }

  const sending = status === "sending";

  return (
    <div className="fixed right-4 bottom-4 z-50 flex flex-col items-end gap-3 sm:right-6 sm:bottom-6">
      {open && (
        <section
          role="dialog"
          aria-labelledby="feedback-title"
          className="max-h-[calc(100dvh-6rem)] w-[min(24rem,calc(100vw-2rem))] overflow-y-auto rounded-2xl border border-border bg-card p-5 shadow-xl"
        >
          <div className="mb-4 flex items-start justify-between gap-4">
            <div>
              <h2 id="feedback-title" className="text-lg font-extrabold tracking-tight">
                Send feedback
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">Found a problem or have an idea? Tell us.</p>
            </div>
            <button
              type="button"
              onClick={close}
              aria-label="Close feedback"
              className="-mt-1 -mr-2 rounded-lg p-2 text-foreground hover:bg-muted"
            >
              <X className="size-5" aria-hidden />
            </button>
          </div>

          {status === "sent" ? (
            <div ref={confirmationRef} tabIndex={-1} role="status" className="rounded-xl bg-muted p-4 outline-none">
              <p className="text-lg font-bold">Thank you</p>
              <p className="mt-1 leading-relaxed text-muted-foreground">Your feedback has been sent to the Yedara team.</p>
              <button
                type="button"
                onClick={() => {
                  setOpenedAt(Date.now());
                  setStatus("idle");
                }}
                className="mt-3 font-semibold text-primary-text underline underline-offset-4"
              >
                Send more feedback
              </button>
            </div>
          ) : (
            <form onSubmit={submit} className="space-y-5">
              <fieldset>
                <legend className="text-sm font-bold">What kind of feedback is it?</legend>
                <div className="mt-2 flex flex-wrap gap-2">
                  {(Object.keys(FEEDBACK_TYPES) as FeedbackType[]).map((key) => (
                    <label
                      key={key}
                      className={cn(
                        "cursor-pointer rounded-lg border px-3 py-2 text-sm font-semibold has-[:focus-visible]:ring-[3px] has-[:focus-visible]:ring-ring/50",
                        type === key ? "border-primary bg-muted" : "border-border hover:border-border-strong",
                      )}
                    >
                      <input
                        type="radio"
                        name="feedback-type"
                        value={key}
                        checked={type === key}
                        onChange={() => setType(key)}
                        className="sr-only"
                      />
                      {type === key && <Check className="mr-1.5 -mt-0.5 inline size-4 text-primary-text" aria-hidden />}
                      {FEEDBACK_TYPES[key].label}
                    </label>
                  ))}
                </div>
              </fieldset>

              <div>
                <label htmlFor="feedback-message" className="text-sm font-bold">
                  Your feedback
                </label>
                <Textarea
                  id="feedback-message"
                  value={message}
                  onChange={(event) => setMessage(event.target.value)}
                  readOnly={sending}
                  maxLength={MAX_FEEDBACK_LENGTH + 200}
                  rows={5}
                  autoFocus
                  required
                  aria-describedby={`feedback-hint${error ? " feedback-error" : ""}`}
                  aria-invalid={status === "error" || undefined}
                  className="mt-2"
                  placeholder="What happened, or what would make Yedara better?"
                />
                <p id="feedback-hint" className="mt-2 text-sm text-muted-foreground">
                  Feedback is posted publicly on GitHub, so please don&apos;t include personal or confidential details.
                </p>
              </div>

              {/* Honeypot: hidden from people, filled in by bots. */}
              <div aria-hidden="true" className="absolute -left-[9999px]">
                <label>
                  Website
                  <input type="text" tabIndex={-1} autoComplete="off" value={website} onChange={(e) => setWebsite(e.target.value)} />
                </label>
              </div>

              {error && (
                <p id="feedback-error" role="alert" className="text-sm font-semibold text-destructive">
                  {error}
                </p>
              )}

              <Button type="submit" disabled={sending} className="w-full font-bold">
                {sending ? "Sending…" : "Send feedback"}
              </Button>
            </form>
          )}
        </section>
      )}
      <button
        ref={buttonRef}
        type="button"
        onClick={() => (open ? close() : show(undefined))}
        aria-expanded={open}
        className="inline-flex items-center gap-2 rounded-full bg-foreground px-4 py-3 text-sm font-semibold text-background shadow-lg transition-opacity hover:opacity-90 focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
      >
        <MessageSquare className="size-5" aria-hidden />
        Feedback
      </button>
    </div>
  );
}

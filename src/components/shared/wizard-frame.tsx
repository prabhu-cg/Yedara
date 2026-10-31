"use client";

import Link from "next/link";
import * as React from "react";
import { ArrowLeft, ArrowRight, Lightbulb } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";
import { SaveStatusIndicator } from "@/components/research-planner/save-status";
import { Stepper, type StepperStep } from "@/components/research-planner/stepper";
import type { SaveStatus } from "@/hooks/use-autosave";

export type Guidance = { intro: string; tips: string[] };

export function GuidanceBody({ guidance }: { guidance: Guidance }) {
  return (
    <div className="space-y-3 rounded-lg bg-secondary p-4 text-sm lg:bg-transparent lg:p-0">
      <p className="flex items-center gap-2 font-semibold">
        <Lightbulb aria-hidden className="size-4 text-primary-text" /> Helpful guidance
      </p>
      <p className="text-muted-foreground">{guidance.intro}</p>
      <ul className="list-disc space-y-1.5 pl-5 text-muted-foreground">
        {guidance.tips.map((t) => (
          <li key={t}>{t}</li>
        ))}
      </ul>
    </div>
  );
}

/** Shared chrome for the multi-step, autosaving research tools. */
export function WizardFrame({
  backHref,
  backLabel,
  title,
  badges,
  saveStatus,
  saveError,
  onRetrySave,
  onSaveAndExit,
  steps,
  step,
  reached,
  done,
  onSelectStep,
  onNext,
  guidance,
  fullWidth,
  headingRef,
  children,
}: {
  backHref: string;
  backLabel: string;
  title: string;
  badges?: React.ReactNode;
  saveStatus: SaveStatus;
  saveError: string | null;
  onRetrySave: () => void;
  onSaveAndExit: () => void;
  steps: readonly StepperStep[] & readonly { description: string }[];
  step: number;
  reached: number;
  done: ReadonlySet<number>;
  onSelectStep: (step: number) => void;
  onNext: () => void;
  guidance: Guidance;
  /** The last step has no guidance column and no Next button. */
  fullWidth?: boolean;
  headingRef: React.RefObject<HTMLHeadingElement | null>;
  children: React.ReactNode;
}) {
  const info = steps[step - 1];
  const last = step === steps.length;

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4">
        <Link href={backHref} className="inline-flex w-fit items-center gap-1.5 rounded-md text-sm font-semibold text-muted-foreground hover:text-foreground">
          <ArrowLeft aria-hidden className="size-4" /> {backLabel}
        </Link>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 space-y-1.5">
            <h1 className="text-[28px] leading-tight font-bold [overflow-wrap:anywhere]">{title}</h1>
            <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">{badges}</div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <SaveStatusIndicator status={saveStatus} error={saveError} onRetry={onRetrySave} />
            <Button type="button" variant="outline" size="sm" onClick={onSaveAndExit}>
              Save and continue later
            </Button>
          </div>
        </div>
      </div>

      <Stepper steps={steps} current={step} reached={reached} done={done} onSelect={onSelectStep} />

      <div className={fullWidth ? "" : "grid gap-6 lg:grid-cols-[minmax(0,1fr)_17rem]"}>
        <Card>
          <CardHeader>
            <p className="text-xs font-semibold tabular-nums text-primary-text">
              Step {step} of {steps.length}
            </p>
            <h2 ref={headingRef} tabIndex={-1} className="text-base leading-snug font-bold outline-none">
              {info.title}
            </h2>
            <CardDescription>{info.description}</CardDescription>
          </CardHeader>
          <CardContent>
            {!fullWidth && (
              <div className="mb-6 lg:hidden">
                <GuidanceBody guidance={guidance} />
              </div>
            )}
            {children}
            <div className="mt-8 flex flex-col-reverse gap-3 border-t border-border pt-5 sm:flex-row sm:items-center sm:justify-between">
              <Button type="button" variant="outline" onClick={() => onSelectStep(step - 1)} disabled={step === 1}>
                <ArrowLeft /> Back
              </Button>
              {!last && (
                <Button type="button" onClick={onNext}>
                  {step === steps.length - 1 ? "Review" : "Next"} <ArrowRight />
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {!fullWidth && (
          <aside aria-label="Guidance" className="hidden lg:block">
            <div className="sticky top-6 rounded-xl border border-border bg-secondary p-5">
              <GuidanceBody guidance={guidance} />
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}

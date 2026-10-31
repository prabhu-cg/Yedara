"use client";

import * as React from "react";
import { Check, ChevronDown, Info, Lightbulb, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TextareaField, TextField } from "@/components/forms/fields";
import type { MethodId } from "@/lib/research-planner/constants";
import {
  GUIDANCE_DISCLAIMER,
  METHODS,
  considerations,
  getMethod,
  suggestMethods,
  type MethodInfo,
} from "@/lib/research-planner/methods";
import type { GoalsContent, MethodsContent } from "@/lib/research-planner/schemas";
import { cn } from "@/lib/utils";

function MethodCard({ method, selected, onToggle }: { method: MethodInfo; selected: boolean; onToggle: () => void }) {
  const id = `method-${method.id}`;
  return (
    <li
      className={cn(
        "flex flex-col rounded-xl border bg-card transition-colors",
        selected ? "border-primary ring-1 ring-primary" : "border-border hover:border-input",
      )}
    >
      <label htmlFor={id} className="flex cursor-pointer items-start gap-3 p-4">
        <input
          id={id}
          type="checkbox"
          checked={selected}
          onChange={onToggle}
          className="mt-0.5 size-4 shrink-0 accent-[var(--primary)]"
        />
        <span className="min-w-0 space-y-1">
          <span className="flex flex-wrap items-center gap-2">
            <span className="font-semibold">{method.name}</span>
            <Badge variant="outline">{method.effort} effort</Badge>
          </span>
          <span className="block text-sm text-muted-foreground">{method.summary}</span>
        </span>
      </label>
      <details className="group border-t border-border px-4 py-2 text-sm">
        <summary className="flex cursor-pointer list-none items-center gap-1.5 rounded-md py-1 font-semibold text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring">
          <ChevronDown aria-hidden className="size-4 transition-transform group-open:rotate-180" />
          When to use it
          <span className="sr-only"> ({method.name})</span>
        </summary>
        <div className="space-y-3 pt-2 pb-2 text-muted-foreground">
          <div>
            <p className="font-semibold text-foreground">Useful when</p>
            <ul className="list-disc pl-5">
              {method.useWhen.map((u) => (
                <li key={u}>{u}</li>
              ))}
            </ul>
          </div>
          {method.lessSuitedFor.length > 0 && (
            <div>
              <p className="font-semibold text-foreground">Less suited to</p>
              <ul className="list-disc pl-5">
                {method.lessSuitedFor.map((u) => (
                  <li key={u}>{u}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </details>
    </li>
  );
}

export function MethodsEditor({
  value,
  onChange,
  errors = {},
  goals,
}: {
  value: MethodsContent;
  onChange: (value: MethodsContent) => void;
  errors?: Record<string, string>;
  goals: GoalsContent;
}) {
  const [showSuggestions, setShowSuggestions] = React.useState(false);
  const suggestions = React.useMemo(() => (showSuggestions ? suggestMethods(goals) : []), [showSuggestions, goals]);
  const notes = React.useMemo(() => considerations(value.selected), [value.selected]);
  const hasInput = [goals.primary_goal, ...goals.objectives, ...goals.research_questions, ...goals.business_questions, ...goals.user_questions].some((t) => t.trim());

  const toggle = (id: MethodId) =>
    onChange({
      ...value,
      selected: value.selected.includes(id) ? value.selected.filter((m) => m !== id) : [...value.selected, id],
    });

  return (
    <div className="space-y-8">
      <section aria-labelledby="suggestions-heading" className="rounded-xl border border-border bg-secondary p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <h3 id="suggestions-heading" className="flex items-center gap-2 font-semibold">
              <Lightbulb aria-hidden className="size-4 text-primary" /> Method suggestions
              <Badge variant="secondary">Optional</Badge>
            </h3>
            <p className="max-w-xl text-sm text-muted-foreground">
              Not sure where to start? We can point out methods that often fit the questions you wrote. You can ignore this entirely.
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            aria-expanded={showSuggestions}
            onClick={() => setShowSuggestions((s) => !s)}
          >
            {showSuggestions ? "Hide suggestions" : "Show suggestions"}
          </Button>
        </div>

        {showSuggestions && (
          <div className="mt-4 space-y-3">
            {!hasInput ? (
              <p className="text-sm text-muted-foreground">Add a goal or some questions in the previous step and suggestions will appear here.</p>
            ) : suggestions.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nothing in your questions pointed clearly to a particular method. That&apos;s fine: choose whichever fits your situation.
              </p>
            ) : (
              <ul className="space-y-3" aria-label="Suggested methods">
                {suggestions.map((s) => {
                  const chosen = value.selected.includes(s.method);
                  return (
                    <li key={s.method} className="rounded-lg border border-border bg-background p-4">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="flex items-center gap-2 font-semibold">
                          {s.name}
                          <Badge variant={s.strength === "strong" ? "default" : "secondary"}>
                            {s.strength === "strong" ? "Several questions point here" : "Possible fit"}
                          </Badge>
                        </p>
                        {chosen ? (
                          <span className="inline-flex items-center gap-1 text-sm font-semibold text-success">
                            <Check aria-hidden className="size-4" /> Selected
                          </span>
                        ) : (
                          <Button type="button" size="sm" variant="outline" onClick={() => toggle(s.method)} aria-label={`Add ${s.name}`}>
                            <Plus /> Add
                          </Button>
                        )}
                      </div>
                      <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                        {s.reasons.map((r) => (
                          <li key={r}>{r}</li>
                        ))}
                      </ul>
                      <p className="mt-2 text-xs text-muted-foreground">
                        Based on: {s.matchedText.map((t) => `“${t}”`).join(", ")}
                      </p>
                    </li>
                  );
                })}
              </ul>
            )}
            <p className="flex items-start gap-2 text-xs text-muted-foreground">
              <Info aria-hidden className="mt-0.5 size-3.5 shrink-0" />
              {GUIDANCE_DISCLAIMER}
            </p>
          </div>
        )}
      </section>

      <div id="field-selected" tabIndex={-1} className="space-y-3 outline-none">
        <div>
          <h3 className="font-semibold">Choose your methods</h3>
          <p className="text-sm text-muted-foreground">Select one or more. Open “When to use it” on a card for details.</p>
        </div>
        <ul className="grid items-start gap-3 md:grid-cols-2" aria-label="Research methods">
          {METHODS.map((m) => (
            <MethodCard key={m.id} method={m} selected={value.selected.includes(m.id)} onToggle={() => toggle(m.id)} />
          ))}
        </ul>
        {errors.selected && (
          <p role="alert" className="text-sm font-medium text-destructive">
            {errors.selected}
          </p>
        )}
      </div>

      {value.selected.includes("other") && (
        <TextField
          id="field-other_description"
          label="Describe the other method"
          placeholder="e.g. Stakeholder workshop"
          error={errors.other_description}
          value={value.other_description}
          onChange={(e) => onChange({ ...value, other_description: e.target.value })}
        />
      )}

      {notes.length > 0 && (
        <section aria-labelledby="considerations-heading" className="rounded-xl border border-border p-4 sm:p-5">
          <h3 id="considerations-heading" className="mb-2 font-semibold">
            Things to consider
          </h3>
          <ul className="space-y-2 text-sm text-muted-foreground">
            {notes.map((n) => (
              <li key={n.id} className="flex items-start gap-2">
                <Info aria-hidden className="mt-0.5 size-4 shrink-0" />
                {n.text}
              </li>
            ))}
          </ul>
        </section>
      )}

      {value.selected.length > 0 && (
        <section aria-labelledby="rationale-heading" className="space-y-4">
          <div>
            <h3 id="rationale-heading" className="font-semibold">
              Why these methods?
              <span className="ml-2 text-xs font-normal text-muted-foreground">Optional</span>
            </h3>
            <p className="text-sm text-muted-foreground">A line per method helps stakeholders understand your choices.</p>
          </div>
          {value.selected.map((id) => (
            <TextareaField
              key={id}
              label={getMethod(id).name}
              rows={2}
              placeholder="Why does this method fit your questions?"
              value={value.rationale[id] ?? ""}
              onChange={(e) => onChange({ ...value, rationale: { ...value.rationale, [id]: e.target.value } })}
            />
          ))}
        </section>
      )}

      <TextareaField
        label="Notes on your approach"
        optional
        rows={3}
        placeholder="e.g. Run interviews before usability testing so findings can shape the tasks."
        value={value.notes}
        onChange={(e) => onChange({ ...value, notes: e.target.value })}
      />
    </div>
  );
}

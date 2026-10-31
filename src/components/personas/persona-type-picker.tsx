"use client";

import { Badge } from "@/components/ui/badge";
import { PERSONA_TYPES, PERSONA_TYPE_INFO, type PersonaType } from "@/lib/personas/constants";
import { cn } from "@/lib/utils";

/** Choose research-backed, hypothesis or proto-persona. Each choice says plainly what it means. */
export function PersonaTypePicker({
  value,
  onChange,
  name = "persona-type",
}: {
  value: PersonaType;
  onChange: (type: PersonaType) => void;
  name?: string;
}) {
  return (
    <fieldset className="space-y-2">
      <legend className="text-sm font-semibold">Persona type</legend>
      <p className="text-xs text-muted-foreground">Be honest about the evidence. The type is shown on the persona and in every export.</p>
      <div className="grid gap-3 sm:grid-cols-3">
        {PERSONA_TYPES.map((type) => {
          const info = PERSONA_TYPE_INFO[type];
          const selected = value === type;
          return (
            <label
              key={type}
              className={cn(
                "flex cursor-pointer flex-col gap-2 rounded-xl border bg-card p-4 shadow-card transition-[border-color,box-shadow] has-[:focus-visible]:ring-[3px] has-[:focus-visible]:ring-ring/50",
                selected ? "border-primary ring-1 ring-primary" : "border-border hover:border-primary hover:shadow-raised",
              )}
            >
              <span className="flex items-center gap-2">
                <input
                  type="radio"
                  name={name}
                  value={type}
                  checked={selected}
                  onChange={() => onChange(type)}
                  className="size-4 accent-[var(--primary)]"
                />
                <span className="font-semibold">{info.label}</span>
              </span>
              <Badge variant={info.badge} className="w-fit">{type === "research_backed" ? "Evidence required" : "Not yet validated"}</Badge>
              <span className="text-xs text-muted-foreground">{info.summary}</span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

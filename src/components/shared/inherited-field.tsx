"use client";

import Link from "next/link";
import { RotateCcw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SHARED_FIELD_LABELS, type SharedField } from "@/lib/shared-context";

/**
 * A field whose value comes from the project brief. It can be overridden for this module only:
 * the project's own value is shown, never edited here.
 */
export function InheritedField({
  field,
  inherited,
  override,
  onChange,
  projectId,
  multiline = true,
  label,
  noun,
  placeholder,
}: {
  field: SharedField;
  inherited: string;
  /** `undefined` = inheriting; a string (even empty) = overridden. */
  override: string | undefined;
  onChange: (override: string | undefined) => void;
  projectId?: string;
  multiline?: boolean;
  label?: string;
  /** What the override applies to, e.g. "this persona". */
  noun: string;
  placeholder?: string;
}) {
  const id = `field-${field}`;
  const overridden = override !== undefined;
  const name = label ?? SHARED_FIELD_LABELS[field];
  const Control = multiline ? Textarea : Input;

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Label htmlFor={id}>{name}</Label>
        <span className="flex items-center gap-2">
          <Badge variant={overridden ? "warning" : "secondary"}>{overridden ? `Overridden for ${noun}` : "From project"}</Badge>
          {overridden ? (
            <Button type="button" variant="ghost" size="xs" onClick={() => onChange(undefined)} aria-label={`Reset ${name} to the project value`}>
              <RotateCcw /> Reset
            </Button>
          ) : (
            <Button type="button" variant="outline" size="xs" onClick={() => onChange(inherited)} aria-label={`Override ${name} for ${noun}`}>
              Override
            </Button>
          )}
        </span>
      </div>

      {overridden ? (
        <>
          <Control
            id={id}
            {...(multiline ? { rows: 3 } : {})}
            value={override}
            placeholder={placeholder}
            onChange={(e) => onChange(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            {inherited ? (
              <>
                Project says: <span className="text-foreground/80">&ldquo;{inherited.length > 140 ? `${inherited.slice(0, 140)}…` : inherited}&rdquo;</span>. Your project is not changed.
              </>
            ) : (
              "The project brief is empty for this field. Your project is not changed."
            )}
          </p>
        </>
      ) : (
        <div id={id} tabIndex={-1} className="min-h-9 rounded-lg border border-dashed border-border bg-muted/60 px-3 py-2 text-sm whitespace-pre-line text-foreground/90">
          {inherited || (
            <span className="text-muted-foreground">
              Not set in the project brief.{" "}
              {projectId && (
                <Link href={`/projects/${projectId}/edit`} className="font-semibold text-primary-text underline-offset-2 hover:underline">
                  Add it to the project
                </Link>
              )}{" "}
              or use Override to write it just for {noun}.
            </span>
          )}
        </div>
      )}
    </div>
  );
}

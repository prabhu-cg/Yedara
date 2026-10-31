"use client";

import * as React from "react";
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { TextField } from "@/components/forms/fields";
import { cn } from "@/lib/utils";

function move<T>(items: T[], from: number, to: number) {
  if (to < 0 || to >= items.length) return items;
  const next = [...items];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

function Group({
  label,
  hint,
  error,
  children,
  id,
  className,
}: {
  label: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
  id: string;
  className?: string;
}) {
  return (
    <div role="group" aria-labelledby={`${id}-label`} aria-describedby={hint ? `${id}-hint` : undefined} className={cn("space-y-2", className)}>
      <div>
        <p id={`${id}-label`} className="text-sm font-semibold text-foreground">
          {label}
        </p>
        {hint && (
          <p id={`${id}-hint`} className="mt-0.5 text-xs text-muted-foreground">
            {hint}
          </p>
        )}
      </div>
      {children}
      {error && (
        <p role="alert" className="text-sm font-medium text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}

function RowButtons({
  index,
  count,
  label,
  onMove,
  onRemove,
}: {
  index: number;
  count: number;
  label: string;
  onMove: (to: number) => void;
  onRemove: () => void;
}) {
  return (
    <div className="flex shrink-0 items-center">
      <Button type="button" variant="ghost" size="icon" className="size-8" disabled={index === 0} onClick={() => onMove(index - 1)} aria-label={`Move ${label} up`}>
        <ArrowUp />
      </Button>
      <Button type="button" variant="ghost" size="icon" className="size-8" disabled={index === count - 1} onClick={() => onMove(index + 1)} aria-label={`Move ${label} down`}>
        <ArrowDown />
      </Button>
      <Button type="button" variant="ghost" size="icon" className="size-8 text-muted-foreground hover:text-destructive" onClick={onRemove} aria-label={`Remove ${label}`}>
        <Trash2 />
      </Button>
    </div>
  );
}

/** An editable list of text items. Enter adds a new item; new items take focus. */
export function ListEditor({
  id,
  label,
  hint,
  items,
  onChange,
  placeholder,
  addLabel = "Add item",
  itemLabel,
  max = 50,
  multiline = false,
  error,
  className,
}: {
  id: string;
  label: string;
  hint?: string;
  items: string[];
  onChange: (items: string[]) => void;
  placeholder?: string;
  addLabel?: string;
  itemLabel?: string;
  max?: number;
  multiline?: boolean;
  error?: string;
  className?: string;
}) {
  const refs = React.useRef<(HTMLInputElement | HTMLTextAreaElement | null)[]>([]);
  const pendingFocus = React.useRef<number | null>(null);
  const name = itemLabel ?? label;

  // Focus a newly added item once it has rendered.
  React.useEffect(() => {
    if (pendingFocus.current !== null) {
      refs.current[pendingFocus.current]?.focus();
      pendingFocus.current = null;
    }
  }, [items.length]);

  const add = (at = items.length) => {
    if (items.length >= max) return;
    const next = [...items];
    next.splice(at, 0, "");
    pendingFocus.current = at;
    onChange(next);
  };

  return (
    <Group id={id} label={label} hint={hint} error={error} className={className}>
      <ul className="space-y-2">
        {items.map((item, i) => (
          <li key={i} className="flex items-start gap-1">
            {multiline ? (
              <Textarea
                ref={(el) => void (refs.current[i] = el)}
                rows={2}
                value={item}
                placeholder={placeholder}
                aria-label={`${name} ${i + 1}`}
                className="min-h-14"
                onChange={(e) => onChange(items.map((v, j) => (j === i ? e.target.value : v)))}
              />
            ) : (
              <Input
                ref={(el) => void (refs.current[i] = el)}
                value={item}
                placeholder={placeholder}
                aria-label={`${name} ${i + 1}`}
                onChange={(e) => onChange(items.map((v, j) => (j === i ? e.target.value : v)))}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    add(i + 1);
                  }
                }}
              />
            )}
            <RowButtons index={i} count={items.length} label={`${name} ${i + 1}`} onMove={(to) => onChange(move(items, i, to))} onRemove={() => onChange(items.filter((_, j) => j !== i))} />
          </li>
        ))}
      </ul>
      <Button type="button" variant="outline" size="sm" onClick={() => add()} disabled={items.length >= max}>
        <Plus /> {addLabel}
      </Button>
    </Group>
  );
}

export type Column<T> = { key: keyof T & string; label: string; placeholder?: string; multiline?: boolean };

/** An editable list of records with a few text columns (e.g. role + responsibility). */
export function RowsEditor<T extends Record<string, string>>({
  id,
  label,
  hint,
  rows,
  columns,
  onChange,
  createRow,
  addLabel = "Add row",
  rowLabel,
  max = 40,
}: {
  id: string;
  label: string;
  hint?: string;
  rows: T[];
  columns: Column<T>[];
  onChange: (rows: T[]) => void;
  createRow: () => T;
  addLabel?: string;
  rowLabel: string;
  max?: number;
}) {
  return (
    <Group id={id} label={label} hint={hint}>
      <ul className="space-y-3">
        {rows.map((row, i) => (
          <li key={i} className="flex items-start gap-1 rounded-lg border border-border bg-secondary/50 p-3">
            <div className="grid flex-1 gap-3 sm:grid-cols-2">
              {columns.map((col) => (
                <div key={col.key} className="space-y-1.5">
                  <label htmlFor={`${id}-${i}-${col.key}`} className="text-xs font-semibold text-muted-foreground">
                    {col.label}
                  </label>
                  {col.multiline ? (
                    <Textarea
                      id={`${id}-${i}-${col.key}`}
                      rows={2}
                      className="min-h-14 bg-background"
                      value={row[col.key]}
                      placeholder={col.placeholder}
                      onChange={(e) => onChange(rows.map((r, j) => (j === i ? { ...r, [col.key]: e.target.value } : r)))}
                    />
                  ) : (
                    <Input
                      id={`${id}-${i}-${col.key}`}
                      value={row[col.key]}
                      placeholder={col.placeholder}
                      onChange={(e) => onChange(rows.map((r, j) => (j === i ? { ...r, [col.key]: e.target.value } : r)))}
                    />
                  )}
                </div>
              ))}
            </div>
            <RowButtons index={i} count={rows.length} label={`${rowLabel} ${i + 1}`} onMove={(to) => onChange(move(rows, i, to))} onRemove={() => onChange(rows.filter((_, j) => j !== i))} />
          </li>
        ))}
      </ul>
      <Button type="button" variant="outline" size="sm" onClick={() => onChange([...rows, createRow()])} disabled={rows.length >= max}>
        <Plus /> {addLabel}
      </Button>
    </Group>
  );
}

/** Number input that stores `null` when empty. */
export function NumberField({
  label,
  value,
  onChange,
  min = 1,
  max,
  hint,
  error,
  optional,
  id,
  placeholder,
}: {
  label: string;
  value: number | null;
  onChange: (value: number | null) => void;
  min?: number;
  max?: number;
  hint?: string;
  error?: string;
  optional?: boolean;
  id?: string;
  placeholder?: string;
}) {
  return (
    <TextField
      id={id}
      label={label}
      type="number"
      inputMode="numeric"
      min={min}
      max={max}
      hint={hint}
      error={error}
      optional={optional}
      placeholder={placeholder}
      value={value ?? ""}
      onChange={(e) => {
        const raw = e.target.value;
        if (raw === "") return onChange(null);
        const n = Math.floor(Number(raw));
        onChange(Number.isFinite(n) ? Math.min(Math.max(n, min), max ?? 100000) : null);
      }}
    />
  );
}

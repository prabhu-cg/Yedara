"use client";

import * as React from "react";
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SelectField, TextField } from "@/components/forms/fields";
import { CATEGORY_LABELS, CRITERIA_CATEGORIES, SUGGESTED_CRITERIA } from "@/lib/competitors/constants";
import type { CriterionInput, CriterionRow } from "@/lib/competitors/schemas";

type AddResult = { ok: true } | { ok: false; error: string };

export function CriteriaEditor({
  criteria,
  error,
  onAdd,
  onChange,
  onRemove,
  onMove,
}: {
  criteria: CriterionRow[];
  error?: string;
  onAdd: (input: CriterionInput) => Promise<AddResult>;
  onChange: (id: string, patch: Partial<CriterionRow>) => void;
  onRemove: (id: string) => void;
  onMove: (id: string, direction: -1 | 1) => void;
}) {
  const [name, setName] = React.useState("");
  const [category, setCategory] = React.useState<CriterionInput["category"]>("custom");
  const [description, setDescription] = React.useState("");
  const [addError, setAddError] = React.useState<string | undefined>();
  const [busy, setBusy] = React.useState(false);

  const has = (n: string) => criteria.some((c) => c.name.trim().toLowerCase() === n.trim().toLowerCase());

  const add = async (input: CriterionInput) => {
    setBusy(true);
    const result = await onAdd(input);
    setBusy(false);
    return result;
  };
  const submitCustom = async () => {
    if (!name.trim()) return setAddError("Name the criterion");
    if (has(name)) return setAddError("That criterion is already in the list");
    const result = await add({ name: name.trim(), category, description: description.trim() });
    if (result.ok) {
      setName("");
      setDescription("");
      setCategory("custom");
      setAddError(undefined);
    } else setAddError(result.error);
  };

  return (
    <div className="space-y-6">
      <div id="field-criteria" tabIndex={-1} className="outline-none">
        {error && <p role="alert" className="text-sm font-medium text-destructive">{error}</p>}
      </div>

      <div className="space-y-3">
        <p className="text-sm font-semibold">Suggested categories</p>
        <p className="text-xs text-muted-foreground">Add any that fit your market, then rename or describe them. They are only starting points.</p>
        <div className="flex flex-wrap gap-2">
          {SUGGESTED_CRITERIA.map((s) => (
            <Button key={s.category} type="button" variant="outline" size="sm" disabled={busy || has(s.name)} onClick={() => void add({ name: s.name, category: s.category, description: "" })} aria-label={`Add suggested criterion ${s.name}`}>
              <Plus /> {s.name}
            </Button>
          ))}
        </div>
      </div>

      <div role="group" aria-label="Custom criterion" className="space-y-4 rounded-xl border border-border bg-secondary/50 p-4 sm:p-5">
        <p className="text-sm font-semibold">Add your own criterion</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField id="new-criterion-name" label="Criterion" placeholder="e.g. Offline mode" maxLength={160} error={addError} value={name} onChange={(e) => { setName(e.target.value); setAddError(undefined); }} />
          <SelectField label="Category" value={category} onChange={(e) => setCategory(e.target.value as CriterionInput["category"])}>
            {CRITERIA_CATEGORIES.map((c) => <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>)}
          </SelectField>
        </div>
        <TextField label="What does this criterion mean?" optional maxLength={500} value={description} onChange={(e) => setDescription(e.target.value)} />
        <Button type="button" onClick={submitCustom} disabled={busy}><Plus /> Add criterion</Button>
      </div>

      <div className="space-y-3">
        <p className="text-sm font-semibold">Your criteria <span className="text-xs font-normal text-muted-foreground">{criteria.length} in the matrix, in this order</span></p>
        {criteria.length === 0 && <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">No criteria yet. Add a suggestion above or write your own.</p>}
        <ul className="space-y-3">
          {criteria.map((c, index) => (
            <li key={c.id} aria-label={`Criterion ${index + 1}: ${c.name || "unnamed"}`} className="space-y-3 rounded-lg border border-border bg-card p-3 sm:p-4">
              <div className="grid gap-3 sm:grid-cols-[1fr_14rem]">
                <TextField label="Criterion" maxLength={160} value={c.name} error={!c.name.trim() ? "A criterion needs a name" : undefined} onChange={(e) => onChange(c.id, { name: e.target.value })} />
                <SelectField label="Category" value={c.category} onChange={(e) => onChange(c.id, { category: e.target.value as CriterionRow["category"] })}>
                  {CRITERIA_CATEGORIES.map((k) => <option key={k} value={k}>{CATEGORY_LABELS[k]}</option>)}
                </SelectField>
              </div>
              <TextField label="Description" optional maxLength={500} value={c.description} onChange={(e) => onChange(c.id, { description: e.target.value })} />
              <div className="flex items-center justify-end gap-1">
                <Button type="button" variant="ghost" size="icon" disabled={index === 0} onClick={() => onMove(c.id, -1)} aria-label={`Move ${c.name || "criterion"} earlier`}><ArrowUp /></Button>
                <Button type="button" variant="ghost" size="icon" disabled={index === criteria.length - 1} onClick={() => onMove(c.id, 1)} aria-label={`Move ${c.name || "criterion"} later`}><ArrowDown /></Button>
                <Button type="button" variant="ghost" size="xs" onClick={() => onRemove(c.id)} aria-label={`Remove criterion ${c.name || "unnamed"}`}><Trash2 /> Remove</Button>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

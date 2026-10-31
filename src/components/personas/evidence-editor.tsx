"use client";

import * as React from "react";
import { Plus, ShieldAlert, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SelectField, SubmitButton, TextareaField, TextField } from "@/components/forms/fields";
import {
  CONFIDENCE_LABELS,
  CONFIDENCE_LEVELS,
  EVIDENCE_KINDS,
  EVIDENCE_KIND_INFO,
  VALIDATION_LABELS,
  VALIDATION_STATUSES,
  type EvidenceKind,
} from "@/lib/personas/constants";
import type { EvidenceInput, EvidenceRow } from "@/lib/personas/schemas";
import { AI_ASSUMPTION_LABEL } from "@/lib/ai/persona-ai";

const needsConfidence = (kind: EvidenceKind) => kind === "research_source" || kind === "observation" || kind === "quote";
const needsValidation = (kind: EvidenceKind) => kind === "assumption" || kind === "hypothesis";

const BLANK: Omit<EvidenceInput, "kind"> = {
  content: "",
  source_label: "",
  source_url: "",
  participant_ref: "",
  confidence: "",
  validation_status: "unvalidated",
};

function ConfidenceSelect({ label, value, onChange }: { label: string; value: string; onChange: (v: EvidenceRow["confidence"]) => void }) {
  return (
    <SelectField label={label} value={value} onChange={(e) => onChange(e.target.value as EvidenceRow["confidence"])}>
      <option value="">Not rated</option>
      {CONFIDENCE_LEVELS.map((c) => (
        <option key={c} value={c}>
          {CONFIDENCE_LABELS[c]}
        </option>
      ))}
    </SelectField>
  );
}

function EvidenceItem({
  row,
  label,
  error,
  onChange,
  onRemove,
}: {
  row: EvidenceRow;
  label: string;
  error?: string;
  onChange: (patch: Partial<EvidenceRow>) => void;
  onRemove: () => void;
}) {
  const quote = row.kind === "quote";
  return (
    <li className="space-y-3 rounded-lg border border-border bg-secondary/50 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {row.origin === "ai" && <Badge variant="warning">AI-generated</Badge>}
          {needsValidation(row.kind) && (
            <Badge variant={row.validation_status === "validated" ? "success" : row.validation_status === "invalidated" ? "secondary" : "warning"}>
              {VALIDATION_LABELS[row.validation_status]}
            </Badge>
          )}
        </div>
        <Button type="button" variant="ghost" size="icon" className="-mt-1 -mr-2 size-8 text-muted-foreground hover:text-destructive" onClick={onRemove} aria-label={`Remove ${label}`}>
          <Trash2 />
        </Button>
      </div>
      {row.origin === "ai" && <p className="text-xs text-muted-foreground">{AI_ASSUMPTION_LABEL}</p>}

      <TextareaField
        label={label}
        rows={quote ? 2 : 3}
        error={!row.content.trim() ? "Evidence can't be empty. Remove it instead." : undefined}
        value={row.content}
        onChange={(e) => onChange({ content: e.target.value })}
      />
      {row.kind !== "assumption" && row.kind !== "hypothesis" && (
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            id={`field-evidence-${row.id}`}
            label={`Source of ${label.toLowerCase()}`}
            hint={quote ? "Required for quotes, for example “Interview P3, 12 Oct”." : "Where this came from."}
            error={error}
            value={row.source_label}
            onChange={(e) => onChange({ source_label: e.target.value })}
          />
          <TextField
            label={`Link for ${label.toLowerCase()}`}
            optional
            type="url"
            inputMode="url"
            placeholder="https://"
            value={row.source_url}
            onChange={(e) => onChange({ source_url: e.target.value })}
          />
          {quote && (
            <TextField
              label={`Participant for ${label.toLowerCase()}`}
              optional
              hint="An ID or pseudonym, not a real name."
              value={row.participant_ref}
              onChange={(e) => onChange({ participant_ref: e.target.value })}
            />
          )}
          {needsConfidence(row.kind) && (
            <ConfidenceSelect label={`Confidence in ${label.toLowerCase()}`} value={row.confidence} onChange={(confidence) => onChange({ confidence })} />
          )}
        </div>
      )}
      {needsValidation(row.kind) && (
        <SelectField label={`Status of ${label.toLowerCase()}`} value={row.validation_status} onChange={(e) => onChange({ validation_status: e.target.value as EvidenceRow["validation_status"] })}>
          {VALIDATION_STATUSES.map((v) => (
            <option key={v} value={v}>
              {VALIDATION_LABELS[v]}
            </option>
          ))}
        </SelectField>
      )}
    </li>
  );
}

function AddForm({ kind, onAdd, onCancel }: { kind: EvidenceKind; onAdd: (input: EvidenceInput) => Promise<boolean>; onCancel: () => void }) {
  const info = EVIDENCE_KIND_INFO[kind];
  const [draft, setDraft] = React.useState<Omit<EvidenceInput, "kind">>(BLANK);
  const [error, setError] = React.useState<string | null>(null);
  // Pending belongs to this form alone, so adding one item never disables another form.
  const [pending, setPending] = React.useState(false);
  const quote = kind === "quote";

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!draft.content.trim()) return setError("Write the evidence first");
    if (quote && !draft.source_label.trim()) return setError("Say where this quote came from");
    setError(null);
    setPending(true);
    const added = await onAdd({ kind, ...draft });
    setPending(false);
    if (added) onCancel();
  };

  return (
    <form onSubmit={submit} noValidate aria-label={`Add ${info.label.toLowerCase()}`} className="space-y-3 rounded-lg border border-primary/40 bg-background p-4">
      <TextareaField
        label={`New ${info.label.toLowerCase()}`}
        rows={quote ? 2 : 3}
        placeholder={quote ? "Paste exactly what the participant said" : undefined}
        value={draft.content}
        onChange={(e) => setDraft({ ...draft, content: e.target.value })}
        error={error && !draft.content.trim() ? error : undefined}
      />
      {kind !== "assumption" && kind !== "hypothesis" && (
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            label={`Source of new ${info.label.toLowerCase()}`}
            hint={quote ? "Required for quotes." : undefined}
            value={draft.source_label}
            error={error && draft.content.trim() ? error : undefined}
            onChange={(e) => setDraft({ ...draft, source_label: e.target.value })}
          />
          {quote && (
            <TextField label="Participant (ID or pseudonym)" optional value={draft.participant_ref} onChange={(e) => setDraft({ ...draft, participant_ref: e.target.value })} />
          )}
          {needsConfidence(kind) && (
            <ConfidenceSelect label={`Confidence in new ${info.label.toLowerCase()}`} value={draft.confidence} onChange={(confidence) => setDraft({ ...draft, confidence })} />
          )}
        </div>
      )}
      <div className="flex gap-2">
        <SubmitButton pending={pending} pendingLabel="Adding…" size="sm">
          Add {info.label.toLowerCase()}
        </SubmitButton>
        <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

export function EvidenceEditor({
  evidence,
  errors,
  onAdd,
  onChange,
  onRemove,
}: {
  evidence: EvidenceRow[];
  errors: Record<string, string>;
  onAdd: (input: EvidenceInput) => Promise<boolean>;
  onChange: (id: string, patch: Partial<EvidenceRow>) => void;
  onRemove: (id: string) => void;
}) {
  const [adding, setAdding] = React.useState<EvidenceKind | null>(null);

  return (
    <div className="space-y-8">
      <div id="field-evidence" tabIndex={-1} className="outline-none">
        {errors.evidence && (
          <p role="alert" className="mb-3 rounded-lg border border-destructive/30 bg-destructive-soft px-4 py-3 text-sm font-medium text-destructive">
            {errors.evidence}
          </p>
        )}
        <p className="flex items-start gap-2.5 rounded-lg border border-border bg-secondary p-4 text-sm text-muted-foreground">
          <ShieldAlert aria-hidden className="mt-0.5 size-4 shrink-0 text-foreground" />
          Only record what you actually have. Quotes must be exactly what a participant said and say where they came from. Yedara never writes
          research, quotes or demographic facts for you.
        </p>
      </div>

      {EVIDENCE_KINDS.map((kind) => {
        const info = EVIDENCE_KIND_INFO[kind];
        const rows = evidence.filter((e) => e.kind === kind);
        return (
          <section key={kind} aria-labelledby={`evidence-${kind}`} className="space-y-3">
            <div>
              <h3 id={`evidence-${kind}`} className="flex items-center gap-2 text-sm font-semibold">
                {info.plural} <Badge variant="secondary">{rows.length}</Badge>
              </h3>
              <p className="text-xs text-muted-foreground">{info.help}</p>
            </div>
            {rows.length > 0 && (
              <ul className="space-y-3">
                {rows.map((row, i) => (
                  <EvidenceItem
                    key={row.id}
                    row={row}
                    label={`${info.label} ${i + 1}`}
                    error={errors[`evidence-${row.id}`]}
                    onChange={(patch) => onChange(row.id, patch)}
                    onRemove={() => onRemove(row.id)}
                  />
                ))}
              </ul>
            )}
            {/* Each form closes only itself: another may have been opened while an add was in flight. */}
            {adding === kind ? (
              <AddForm kind={kind} onAdd={onAdd} onCancel={() => setAdding((current) => (current === kind ? null : current))} />
            ) : (
              <Button type="button" variant="outline" size="sm" onClick={() => setAdding(kind)}>
                <Plus /> Add {info.label.toLowerCase()}
              </Button>
            )}
          </section>
        );
      })}
    </div>
  );
}

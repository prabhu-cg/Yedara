"use client";

import * as React from "react";
import { FileText, ShieldCheck, X } from "lucide-react";
import { toast } from "sonner";
import { FormAlert, SelectField, SubmitButton, TextField, TextareaField } from "@/components/forms/fields";
import { Button } from "@/components/ui/button";
import { importObservationsAction } from "@/lib/synthesizer/actions";
import { FILE_LIMIT_TEXT, LIMITS, OBSERVATION_KINDS, OBSERVATION_KIND_LABELS, SOURCE_TYPES, SOURCE_TYPE_LABELS, type ObservationKind, type SourceType } from "@/lib/synthesizer/constants";
import { cleanText, delimiterFor, isDelimited, parseDelimited, splitStatements, statementsFromColumn, validateImportFile, type ParseResult, type SplitMode } from "@/lib/synthesizer/import-parse";
import type { CardRow, ObservationRow, SourceRow } from "@/lib/synthesizer/schemas";

type Imported = { source: SourceRow; observations: ObservationRow[]; cards: CardRow[] };
type Mode = "paste" | "file";

const fieldClass = "space-y-4 rounded-xl border border-border bg-secondary/50 p-4 sm:p-5";

/**
 * Pasted notes or a text file, turned into observation cards in two steps. Nothing is read from a
 * file until it is chosen, nothing is saved until the person reviews the statements and confirms,
 * and the file itself is never uploaded: only the confirmed text is.
 */
export function ImportFlow({ synthesisId, mode, onImported, onCancel }: { synthesisId: string; mode: Mode; onImported: (r: Imported) => void; onCancel: () => void }) {
  const [step, setStep] = React.useState<"input" | "review">("input");
  const [text, setText] = React.useState("");
  const [split, setSplit] = React.useState<SplitMode>("paragraphs");
  const [file, setFile] = React.useState<{ name: string; size: number } | null>(null);
  const [rows, setRows] = React.useState<string[][] | null>(null);
  const [column, setColumn] = React.useState(0);
  const [hasHeader, setHasHeader] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [parsed, setParsed] = React.useState<ParseResult | null>(null);
  const [statements, setStatements] = React.useState<string[]>([]);
  const [meta, setMeta] = React.useState({ name: "", type: (mode === "file" ? "document" : "interview") as SourceType, participant: "", kind: "observation" as ObservationKind, tags: "" });
  const [pending, setPending] = React.useState(false);

  const chooseFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const chosen = e.target.files?.[0];
    e.target.value = "";
    setError(null);
    if (!chosen) return;
    const check = validateImportFile(chosen);
    if (!check.ok) { setFile(null); setRows(null); setText(""); return setError(check.error); }
    const raw = cleanText(await chosen.text());
    if (raw === null) { setFile(null); return setError(`${check.name} doesn't look like a text file.`); }
    setFile({ name: check.name, size: chosen.size });
    setText(raw);
    setMeta((m) => ({ ...m, name: m.name || check.name.replace(/\.[^.]+$/, "") }));
    if (isDelimited(check.name)) {
      const table = parseDelimited(raw, delimiterFor(check.name));
      setRows(table);
      setColumn(0);
    } else setRows(null);
  };

  const review = () => {
    setError(null);
    if (mode === "file" && !file) return setError("Choose a file first.");
    if (mode === "paste" && !text.trim()) return setError("Paste some notes first.");
    const result = rows ? statementsFromColumn(rows, column, hasHeader) : splitStatements(text, split);
    if (!result.statements.length) return setError(rows ? "That column has no usable text. Try another column." : "No statements found. Separate statements with blank lines, or choose one per line.");
    setParsed(result);
    setStatements(result.statements);
    setMeta((m) => ({ ...m, name: m.name || (mode === "paste" ? "Pasted notes" : "") }));
    setStep("review");
  };

  const confirm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!meta.name.trim()) return setError("Name the source, for example “Interview with P3”.");
    setPending(true);
    setError(null);
    const result = await importObservationsAction(synthesisId, {
      source: { name: meta.name, sourceType: meta.type, participantRef: meta.participant, fileName: file?.name ?? "", fileSize: file?.size ?? null, importMethod: mode },
      statements,
      kind: meta.kind,
      participantRef: meta.participant,
      tags: meta.tags.split(","),
    });
    setPending(false);
    if (!result.ok) return setError(result.error);
    toast.success(`${result.data.observations.length} observations added`);
    onImported(result.data);
  };

  if (step === "review" && parsed) {
    return (
      <form onSubmit={confirm} noValidate aria-label="Review before adding" className={fieldClass}>
        <div>
          <h3 className="text-sm font-bold">Review before adding</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {statements.length} {statements.length === 1 ? "statement" : "statements"} will become observation cards. Remove any you don&apos;t want. Nothing is saved until you confirm.
          </p>
        </div>
        {(parsed.tooLong > 0 || parsed.overLimit > 0) && (
          <p role="note" className="rounded-lg border border-warning/30 bg-warning-soft p-3 text-sm">
            {parsed.tooLong > 0 && <>{parsed.tooLong} {parsed.tooLong === 1 ? "statement was" : "statements were"} left out for being over {LIMITS.statementChars} characters. Split {parsed.tooLong === 1 ? "it" : "them"} and import again. </>}
            {parsed.overLimit > 0 && <>{parsed.overLimit} more {parsed.overLimit === 1 ? "was" : "were"} left out: one import takes up to {LIMITS.importStatements}.</>}
          </p>
        )}
        <ul aria-label="Statements to add" className="max-h-72 space-y-1.5 overflow-y-auto rounded-lg border border-border bg-background p-2">
          {statements.map((s, i) => (
            <li key={`${i}-${s.slice(0, 20)}`} className="flex items-start gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-secondary">
              <span className="flex-1 [overflow-wrap:anywhere]">{s}</span>
              <button type="button" aria-label={`Remove statement ${i + 1}`} onClick={() => setStatements((all) => all.filter((_, j) => j !== i))} className="mt-0.5 shrink-0 rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring">
                <X aria-hidden className="size-4" />
              </button>
            </li>
          ))}
        </ul>
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField label="Source name" placeholder="e.g. Interview with P3" maxLength={200} value={meta.name} onChange={(e) => setMeta({ ...meta, name: e.target.value })} />
          <SelectField label="Source type" value={meta.type} onChange={(e) => setMeta({ ...meta, type: e.target.value as SourceType })}>
            {SOURCE_TYPES.map((t) => <option key={t} value={t}>{SOURCE_TYPE_LABELS[t]}</option>)}
          </SelectField>
          <TextField label="Participant" optional placeholder="e.g. P3" maxLength={120} hint="A code, not a name." value={meta.participant} onChange={(e) => setMeta({ ...meta, participant: e.target.value })} />
          <SelectField label="Card type" value={meta.kind} onChange={(e) => setMeta({ ...meta, kind: e.target.value as ObservationKind })}>
            {OBSERVATION_KINDS.map((k) => <option key={k} value={k}>{OBSERVATION_KIND_LABELS[k]}</option>)}
          </SelectField>
          <TextField label="Tags" optional className="sm:col-span-2" placeholder="pricing, onboarding" hint="Separate with commas. Added to every card." value={meta.tags} onChange={(e) => setMeta({ ...meta, tags: e.target.value })} />
        </div>
        <FormAlert message={error} />
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" onClick={() => { setStep("input"); setError(null); }}>Back</Button>
          <SubmitButton pending={pending} pendingLabel="Adding…" disabled={statements.length === 0}>Add {statements.length} {statements.length === 1 ? "observation" : "observations"}</SubmitButton>
        </div>
      </form>
    );
  }

  return (
    <div role="group" aria-label={mode === "paste" ? "Paste notes" : "Upload a file"} className={fieldClass}>
      <p className="flex items-start gap-2 text-sm text-muted-foreground">
        <ShieldCheck aria-hidden className="mt-0.5 size-4 shrink-0" />
        {mode === "file" ? `${FILE_LIMIT_TEXT} The file is read in your browser and is not uploaded. You review the text before anything is saved.` : "Paste interview notes, observations or survey answers. You review how they are split before anything is saved."}
      </p>
      {mode === "paste" ? (
        <TextareaField label="Notes" rows={8} placeholder={"Participant struggled to find the pricing page.\n\nSaid the setup felt quick, “I was done in five minutes”."} value={text} onChange={(e) => setText(e.target.value)} />
      ) : (
        <div className="space-y-3">
          <label className="block space-y-2">
            <span className="text-sm leading-none font-medium">Text file</span>
            <input type="file" accept=".txt,.md,.csv,.tsv,text/plain,text/markdown,text/csv,text/tab-separated-values" onChange={chooseFile} className="block w-full cursor-pointer rounded-lg border border-input bg-background text-sm file:mr-3 file:cursor-pointer file:border-0 file:bg-muted file:px-3 file:py-2 file:text-sm file:font-medium" />
          </label>
          {file && (
            <p className="flex items-center gap-2 text-sm"><FileText aria-hidden className="size-4 text-muted-foreground" /> <span className="font-semibold [overflow-wrap:anywhere]">{file.name}</span> <span className="text-muted-foreground">{Math.max(1, Math.round(file.size / 1000))} KB</span></p>
          )}
          {rows && (
            <div className="grid gap-4 sm:grid-cols-2">
              <SelectField label="Column to import" hint="Each row's text in this column becomes one card." value={String(column)} onChange={(e) => setColumn(Number(e.target.value))}>
                {(rows[0] ?? []).map((cell, i) => <option key={i} value={i}>{hasHeader && cell.trim() ? cell.trim().slice(0, 60) : `Column ${i + 1}`}</option>)}
              </SelectField>
              <label className="flex items-center gap-2 self-end pb-2 text-sm"><input type="checkbox" checked={hasHeader} onChange={(e) => setHasHeader(e.target.checked)} className="size-4 accent-[var(--primary)]" /> First row is a header</label>
            </div>
          )}
        </div>
      )}
      {!rows && (mode === "paste" || file) && (
        <fieldset className="space-y-2">
          <legend className="text-sm font-medium">One card per</legend>
          <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
            {(["paragraphs", "lines"] as const).map((v) => (
              <label key={v} className="flex items-center gap-2"><input type="radio" name={`split-${mode}`} checked={split === v} onChange={() => setSplit(v)} className="size-4 accent-[var(--primary)]" /> {v === "paragraphs" ? "Paragraph (separated by a blank line)" : "Line"}</label>
            ))}
          </div>
        </fieldset>
      )}
      <FormAlert message={error} />
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
        <Button type="button" onClick={review}>Review</Button>
      </div>
    </div>
  );
}

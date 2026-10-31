"use client";

import { CircleAlert, CircleCheck, Download, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { DocumentView } from "@/components/research-planner/document-view";
import type { PlanDocument } from "@/lib/research-planner/document";
import type { AnalysisIssue } from "@/lib/competitors/validation";

export type AnalysisExportFormat = "md" | "pdf" | "docx";

export function AnalysisOutput({
  doc,
  issues,
  status,
  busy,
  onEdit,
  onExport,
  onSetStatus,
}: {
  doc: PlanDocument;
  issues: AnalysisIssue[];
  status: "draft" | "completed";
  busy: boolean;
  onEdit: (step: number) => void;
  onExport: (format: AnalysisExportFormat) => void;
  onSetStatus: (status: "draft" | "completed") => void;
}) {
  return (
    <div className="space-y-6">
      {issues.length > 0 ? (
        <div role="alert" className="rounded-xl border border-destructive/30 bg-destructive-soft p-4">
          <p className="flex items-center gap-2 font-semibold text-destructive"><CircleAlert aria-hidden className="size-4" /> A few required details are missing</p>
          <ul className="mt-2 space-y-1 text-sm">
            {issues.map((i) => (
              <li key={`${i.step}-${i.field}`}>
                <button type="button" onClick={() => onEdit(i.step)} className="rounded text-left text-destructive underline underline-offset-2 hover:no-underline">
                  Step {i.step}: {i.message}
                </button>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-muted-foreground">You can still preview and export. These are only needed to mark the analysis complete.</p>
        </div>
      ) : (
        <p className="flex items-center gap-2 rounded-xl border border-border bg-secondary p-4 text-sm">
          <CircleCheck aria-hidden className="size-4 text-success" />
          {status === "completed" ? "This analysis is marked as complete." : "All required details are in. You can mark the analysis complete."}
        </p>
      )}

      <div className="flex flex-wrap items-center justify-end gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" disabled={busy}><Download /> Export</Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={() => onExport("pdf")}><FileText /> PDF document</DropdownMenuItem>
            <DropdownMenuItem onSelect={() => onExport("docx")}><FileText /> Word document (.docx)</DropdownMenuItem>
            <DropdownMenuItem onSelect={() => onExport("md")}><FileText /> Markdown (.md)</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        {status === "completed" ? (
          <Button variant="outline" onClick={() => onSetStatus("draft")} disabled={busy}>Reopen as draft</Button>
        ) : (
          <Button onClick={() => onSetStatus("completed")} disabled={busy}>Mark analysis as complete</Button>
        )}
      </div>

      <div role="region" aria-label="Report preview"><DocumentView doc={doc} /></div>
    </div>
  );
}

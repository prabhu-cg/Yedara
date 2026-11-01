"use client";

import { CheckCircle2, Download, RotateCcw } from "lucide-react";
import { TextareaField } from "@/components/forms/fields";
import { DocumentView } from "@/components/research-planner/document-view";
import { Button } from "@/components/ui/button";
import type { PlanDocument } from "@/lib/research-planner/document";
import type { ReportContent } from "@/lib/synthesizer/schemas";

const FIELDS: { key: keyof ReportContent; label: string; hint: string; rows: number }[] = [
  { key: "overview", label: "Research overview", hint: "Why this research was done and what you set out to learn.", rows: 4 },
  { key: "methodology", label: "Methodology", hint: "How you collected and analysed the material. Your sources are listed automatically.", rows: 4 },
  { key: "participantsNote", label: "About the participants", hint: "Who took part and how they were chosen. Participant codes are listed automatically.", rows: 3 },
  { key: "painPointsNote", label: "Pain points: your summary", hint: "Problems recorded on insights are listed automatically.", rows: 3 },
  { key: "recommendationsNote", label: "Recommendations: your summary", hint: "Actions recorded on insights are listed automatically.", rows: 3 },
  { key: "limitations", label: "Limitations", hint: "What this research can't tell you. Counts of unlinked or low-confidence insights are added for you.", rows: 4 },
];

export function ReportPanel({ report, onReport, doc, status, onToggleComplete, onExport, completing }: { report: ReportContent; onReport: (next: ReportContent) => void; doc: PlanDocument; status: "draft" | "completed"; onToggleComplete: () => void; onExport: (format: "pdf" | "docx" | "md") => void; completing: boolean }) {
  return (
    <div className="grid gap-8 xl:grid-cols-[minmax(0,26rem)_minmax(0,1fr)]">
      <div className="space-y-5">
        <p className="text-sm text-muted-foreground">Write the parts only you can write. Themes, observations, insights, user needs and sources come from your work and are added to the report for you.</p>
        {FIELDS.map((f) => (
          <TextareaField key={f.key} label={f.label} hint={f.hint} rows={f.rows} maxLength={f.key === "overview" || f.key === "methodology" || f.key === "limitations" ? 6000 : 3000} value={report[f.key]} onChange={(e) => onReport({ ...report, [f.key]: e.target.value })} />
        ))}
      </div>
      <div className="min-w-0 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-base font-bold">Report preview</h2>
          <div className="flex flex-wrap items-center gap-2">
            {([["pdf", "PDF"], ["docx", "Word"], ["md", "Markdown"]] as const).map(([format, label]) => (
              <Button key={format} type="button" variant="outline" size="sm" onClick={() => onExport(format)} aria-label={`Export as ${label}`}><Download /> {label}</Button>
            ))}
            <Button type="button" size="sm" variant={status === "completed" ? "outline" : "default"} onClick={onToggleComplete} disabled={completing}>
              {status === "completed" ? <><RotateCcw /> Reopen</> : <><CheckCircle2 /> Mark as complete</>}
            </Button>
          </div>
        </div>
        <div className="rounded-card border border-border bg-card p-5 shadow-card sm:p-6"><DocumentView doc={doc} /></div>
      </div>
    </div>
  );
}

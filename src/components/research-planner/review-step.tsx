"use client";

import * as React from "react";
import { ArrowDown, ArrowUp, CircleAlert, CircleCheck, Download, Eye, FileText, Pencil, PencilOff } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { BlocksView, DocumentView } from "@/components/research-planner/document-view";
import { SectionEditor, type EditorContext } from "@/components/research-planner/section-editors";
import { SECTION_TITLES, type SectionKey } from "@/lib/research-planner/constants";
import { type PlanDocument } from "@/lib/research-planner/document";
import type { AnySectionContent } from "@/lib/research-planner/schemas";
import type { StepIssue } from "@/lib/research-planner/validation";
import { cn } from "@/lib/utils";

export type ExportFormat = "md" | "pdf" | "docx";

export type ReviewSection = {
  key: SectionKey;
  content: AnySectionContent;
  source: "manual" | "template" | "ai" | null;
};

export function ReviewStep({
  sections,
  doc,
  ctx,
  issues,
  status,
  busy,
  participantsNeeded,
  onChange,
  onMove,
  onGoToStep,
  onExport,
  onSetStatus,
}: {
  sections: ReviewSection[];
  doc: PlanDocument;
  ctx: EditorContext;
  issues: StepIssue[];
  status: "draft" | "completed";
  busy: boolean;
  participantsNeeded: boolean;
  onChange: (key: SectionKey, value: AnySectionContent) => void;
  onMove: (key: SectionKey, direction: -1 | 1) => void;
  onGoToStep: (step: number) => void;
  onExport: (format: ExportFormat) => void;
  onSetStatus: (status: "draft" | "completed") => void;
}) {
  const [view, setView] = React.useState<"sections" | "preview">("sections");
  const [editing, setEditing] = React.useState<SectionKey | null>(null);
  const byKey = React.useMemo(() => new Map(doc.sections.map((s) => [s.key, s])), [doc]);

  return (
    <div className="space-y-6">
      {issues.length > 0 ? (
        <div role="alert" className="rounded-xl border border-destructive/30 bg-destructive/5 p-4">
          <p className="flex items-center gap-2 font-semibold text-destructive">
            <CircleAlert aria-hidden className="size-4" /> A few required details are missing
          </p>
          <ul className="mt-2 space-y-1 text-sm">
            {issues.map((issue) => (
              <li key={`${issue.step}-${issue.field}`}>
                <button
                  type="button"
                  onClick={() => onGoToStep(issue.step)}
                  className="rounded text-left text-destructive underline underline-offset-2 hover:no-underline focus-visible:ring-2 focus-visible:ring-ring"
                >
                  Step {issue.step}: {issue.message}
                </button>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-muted-foreground">You can still preview and export while these are missing. They are only needed to mark the plan complete.</p>
        </div>
      ) : (
        <p className="flex items-center gap-2 rounded-xl border border-border bg-secondary p-4 text-sm">
          <CircleCheck aria-hidden className="size-4 text-success" />
          {status === "completed" ? "This plan is marked as complete." : "All required details are in. You can mark the plan complete."}
        </p>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div role="tablist" aria-label="Review view" className="inline-flex rounded-lg border border-border p-0.5">
          {(
            [
              ["sections", "Edit sections", Pencil],
              ["preview", "Preview document", Eye],
            ] as const
          ).map(([id, label, Icon]) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={view === id}
              onClick={() => setView(id)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-semibold outline-none focus-visible:ring-2 focus-visible:ring-ring",
                view === id ? "bg-primary-soft text-primary-text" : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Icon aria-hidden className="size-4" /> {label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" disabled={busy}>
                <Download /> Export
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={() => onExport("pdf")}>
                <FileText /> PDF document
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => onExport("docx")}>
                <FileText /> Word document (.docx)
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => onExport("md")}>
                <FileText /> Markdown (.md)
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          {status === "completed" ? (
            <Button variant="outline" onClick={() => onSetStatus("draft")} disabled={busy}>
              Reopen as draft
            </Button>
          ) : (
            <Button onClick={() => onSetStatus("completed")} disabled={busy}>
              Mark plan as complete
            </Button>
          )}
        </div>
      </div>

      {view === "preview" ? (
        <div role="tabpanel" aria-label="Document preview">
          <DocumentView doc={doc} />
        </div>
      ) : (
        <div role="tabpanel" aria-label="Plan sections">
          <ol className="space-y-3">
            {sections.map((section, i) => {
              const docSection = byKey.get(section.key);
              const isEditing = editing === section.key;
              const title = SECTION_TITLES[section.key];
              return (
                <li key={section.key} className="rounded-card border border-border bg-card shadow-card" aria-label={title}>
                  <div className="flex flex-wrap items-center justify-between gap-2 p-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-semibold">{title}</h3>
                      {section.source === "template" && <Badge variant="default">Starter draft</Badge>}
                      {!docSection && <Badge variant="secondary">Empty: left out of exports</Badge>}
                    </div>
                    <div className="flex items-center gap-1">
                      <Button type="button" variant="ghost" size="icon" className="size-8" disabled={i === 0 || busy} onClick={() => onMove(section.key, -1)} aria-label={`Move ${title} up`}>
                        <ArrowUp />
                      </Button>
                      <Button type="button" variant="ghost" size="icon" className="size-8" disabled={i === sections.length - 1 || busy} onClick={() => onMove(section.key, 1)} aria-label={`Move ${title} down`}>
                        <ArrowDown />
                      </Button>
                      <Button type="button" variant="outline" size="sm" aria-expanded={isEditing} onClick={() => setEditing(isEditing ? null : section.key)} aria-label={`${isEditing ? "Done editing" : "Edit"} ${title}`}>
                        {isEditing ? <PencilOff /> : <Pencil />} {isEditing ? "Done" : "Edit"}
                      </Button>
                    </div>
                  </div>
                  <div className="border-t border-border p-4">
                    {isEditing ? (
                      <SectionEditor
                        sectionKey={section.key}
                        value={section.content}
                        onChange={(v) => onChange(section.key, v)}
                        ctx={ctx}
                        participantsNeeded={participantsNeeded}
                      />
                    ) : docSection ? (
                      <BlocksView blocks={docSection.blocks} />
                    ) : (
                      <p className="text-sm text-muted-foreground">Nothing added yet. Use Edit to add content.</p>
                    )}
                  </div>
                </li>
              );
            })}
          </ol>
        </div>
      )}
    </div>
  );
}


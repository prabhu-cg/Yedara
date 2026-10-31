"use client";

import * as React from "react";
import { ChevronDown, FileText, Sparkles } from "lucide-react";
import { EmptyState } from "@/components/layout/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { SectionEditor, type EditorContext } from "@/components/research-planner/section-editors";
import { SECTION_TITLES, type MaterialKey } from "@/lib/research-planner/constants";
import type { AnySectionContent } from "@/lib/research-planner/schemas";

export type MaterialInfo = { exists: boolean; source: "manual" | "template" | "ai" | null };

export function MaterialsStep({
  keys,
  info,
  contents,
  ctx,
  busy,
  onChange,
  onGenerate,
}: {
  keys: MaterialKey[];
  info: Partial<Record<MaterialKey, MaterialInfo>>;
  contents: Partial<Record<MaterialKey, AnySectionContent>>;
  ctx: EditorContext;
  busy: boolean;
  onChange: (key: MaterialKey, value: AnySectionContent) => void;
  onGenerate: (options: { keys?: MaterialKey[]; overwrite?: boolean; blank?: boolean }) => void;
}) {
  const [confirmKey, setConfirmKey] = React.useState<MaterialKey | null>(null);
  const missing = keys.filter((k) => !info[k]?.exists);

  if (keys.length === 0) {
    return (
      <EmptyState
        icon={FileText}
        title="No materials for these methods"
        description="Materials are prepared for interviews, surveys, usability testing and contextual inquiry. Your selected methods don't need any, so you can skip this step. Choose different methods in step 3 to see materials here."
      />
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-secondary p-4">
        <div className="max-w-xl space-y-1">
          <p className="font-semibold">Starter materials</p>
          <p className="text-sm text-muted-foreground">
            Built from your answers and the methods you chose. They are drafts: edit anything, and replace text in [brackets].
          </p>
        </div>
        {missing.length > 0 && (
          <Button type="button" onClick={() => onGenerate({ keys: missing })} disabled={busy} aria-busy={busy}>
            <Sparkles /> {busy ? "Generating…" : `Generate ${missing.length === keys.length ? "all" : "remaining"} materials`}
          </Button>
        )}
      </div>

      <ul className="space-y-3">
        {keys.map((key) => {
          const meta = info[key];
          const content = contents[key];
          return (
            <li key={key} className="rounded-xl border border-border bg-card">
              {meta?.exists && content ? (
                <details className="group">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-3 rounded-xl p-4 outline-none focus-visible:ring-2 focus-visible:ring-ring">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold">{SECTION_TITLES[key]}</span>
                      {meta.source === "template" && <Badge variant="default">Starter draft</Badge>}
                    </span>
                    <ChevronDown aria-hidden className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" />
                  </summary>
                  <div className="space-y-5 border-t border-border p-4">
                    <SectionEditor sectionKey={key} value={content} onChange={(v) => onChange(key, v)} ctx={ctx} />
                    <div className="border-t border-border pt-4">
                      <Button type="button" variant="outline" size="sm" disabled={busy} onClick={() => setConfirmKey(key)}>
                        <Sparkles /> Regenerate starter
                      </Button>
                    </div>
                  </div>
                </details>
              ) : (
                <div className="flex flex-wrap items-center justify-between gap-3 p-4">
                  <div>
                    <p className="font-semibold">{SECTION_TITLES[key]}</p>
                    <p className="text-sm text-muted-foreground">Not created yet</p>
                  </div>
                  <div className="flex gap-2">
                    <Button type="button" size="sm" disabled={busy} onClick={() => onGenerate({ keys: [key] })} aria-label={`Generate ${SECTION_TITLES[key]}`}>
                      <Sparkles /> Generate
                    </Button>
                    <Button type="button" size="sm" variant="outline" disabled={busy} onClick={() => onGenerate({ keys: [key], blank: true })} aria-label={`Start ${SECTION_TITLES[key]} blank`}>
                      Start blank
                    </Button>
                  </div>
                </div>
              )}
            </li>
          );
        })}
      </ul>

      <AlertDialog open={confirmKey !== null} onOpenChange={(open) => !open && setConfirmKey(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Replace with a fresh starter?</AlertDialogTitle>
            <AlertDialogDescription>
              This replaces everything in <strong className="text-foreground">{confirmKey ? SECTION_TITLES[confirmKey] : ""}</strong>, including your edits. This can&apos;t be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep my version</AlertDialogCancel>
            <Button
              variant="destructive"
              onClick={() => {
                if (confirmKey) onGenerate({ keys: [confirmKey], overwrite: true });
                setConfirmKey(null);
              }}
            >
              Replace
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

"use client";

import * as React from "react";
import { Lightbulb, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { removeCandidateAction } from "@/lib/journeys/actions";
import { ITEM_KIND_INFO } from "@/lib/journeys/constants";
import type { CandidateRow } from "@/lib/journeys/schemas";

/** Pain points and opportunities handed on for evaluation. Each keeps its stage and evidence. */
export function OpportunitiesPanel({ candidates, onRemoved }: { candidates: CandidateRow[]; onRemoved: (id: string) => void }) {
  const remove = async (c: CandidateRow) => {
    const result = await removeCandidateAction(c.id);
    if (!result.ok) return void toast.error(result.error);
    onRemoved(c.id);
    toast.success("Removed from opportunities");
  };
  return (
    <div className="space-y-4">
      <p className="max-w-prose text-sm text-muted-foreground">
        Pain points and opportunities you add from the Edit stages tab are kept here with their stage and evidence, ready to be evaluated in the Opportunity Analyzer when it arrives. Removing one here doesn&apos;t change the journey.
      </p>
      {candidates.length === 0 ? (
        <p className="rounded-card border border-dashed border-input bg-secondary px-5 py-8 text-center text-sm text-muted-foreground"><Lightbulb aria-hidden className="mx-auto mb-2 size-5" />Nothing here yet. In Edit stages, use “Add to opportunities” on a pain point or opportunity.</p>
      ) : (
        <ul className="space-y-3">
          {candidates.map((c) => (
            <li key={c.id} data-candidate={c.id}>
              <article className="flex items-start gap-3 rounded-card border border-border bg-card p-4 shadow-card">
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <Badge variant={c.origin_kind === "pain_point" ? "warning" : "success"}>{ITEM_KIND_INFO[c.origin_kind].label}</Badge>
                    <span className="text-muted-foreground">{c.stage_name ? `Stage: ${c.stage_name}` : "Stage removed"}{c.journey_name ? ` · ${c.journey_name}` : ""}</span>
                  </div>
                  <p className="font-semibold [overflow-wrap:anywhere]">{c.title}</p>
                  {c.evidence_note && <p className="text-sm text-muted-foreground [overflow-wrap:anywhere]">Evidence: {c.evidence_note}</p>}
                  {c.observation_id && <p className="text-xs text-muted-foreground">Linked to a research observation</p>}
                </div>
                <Button type="button" variant="ghost" size="icon" aria-label={`Remove from opportunities: ${c.title.slice(0, 40)}`} onClick={() => remove(c)}><Trash2 /></Button>
              </article>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

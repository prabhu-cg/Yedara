"use client";

import { useRef, useState } from "react";
import { ChevronDown, ChevronUp, EllipsisVertical, Link2, Pencil, Plus, Trash2, Unlink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { BASIS_LABELS, EMPATHY_LIMITS, QUADRANT_INFO, type Quadrant } from "@/lib/empathy/constants";
import type { EmpathyItemRow } from "@/lib/empathy/schemas";
import type { EvidenceOption } from "@/lib/synthesizer/queries";
import { cn } from "@/lib/utils";

export type QuadrantHandlers = {
  onAdd: (quadrant: Quadrant, content: string) => Promise<boolean>;
  onEdit: (item: EmpathyItemRow, content: string) => Promise<boolean>;
  onDelete: (item: EmpathyItemRow) => void;
  onMove: (item: EmpathyItemRow, direction: -1 | 1) => void;
  onLink: (item: EmpathyItemRow) => void;
  onUnlink: (item: EmpathyItemRow) => void;
  onNotResearched: (quadrant: Quadrant, on: boolean) => void;
};

/** Where a note came from: the observation it cites, or an honest "Assumed". */
function Provenance({ item, evidence, onLink }: { item: EmpathyItemRow; evidence: EvidenceOption | undefined; onLink: () => void }) {
  if (item.observation_id) {
    return (
      <span className="inline-flex max-w-full items-center gap-1.5 rounded-full bg-primary-soft py-0.5 pr-2.5 pl-2 text-xs font-semibold text-primary-text" title={evidence?.label}>
        <Link2 aria-hidden className="size-3 shrink-0" />
        <span className="truncate">{evidence ? `${evidence.participant ? `${evidence.participant}: ` : ""}${evidence.label}` : "Linked observation"}</span>
      </span>
    );
  }
  return (
    <button
      type="button"
      onClick={onLink}
      className="inline-flex items-center gap-1.5 rounded-full border border-dashed border-border-strong px-2.5 py-0.5 text-xs font-semibold text-muted-foreground transition-colors outline-none hover:border-primary hover:bg-muted hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/40"
    >
      Assumed <span aria-hidden>·</span> <span className="underline underline-offset-2">Link evidence</span>
    </button>
  );
}

function Note({
  item,
  quadrant,
  first,
  last,
  evidence,
  handlers,
}: {
  item: EmpathyItemRow;
  quadrant: Quadrant;
  first: boolean;
  last: boolean;
  evidence: EvidenceOption | undefined;
  handlers: QuadrantHandlers;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(item.content);
  const [saving, setSaving] = useState(false);
  const label = QUADRANT_INFO[quadrant].label.toLowerCase();

  if (editing) {
    return (
      <li className="rounded-lg border border-primary bg-card p-3">
        <Textarea
          aria-label={`Edit note: ${item.content}`}
          autoFocus
          rows={3}
          maxLength={EMPATHY_LIMITS.itemChars}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Escape") setEditing(false);
          }}
        />
        <div className="mt-2 flex justify-end gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => setEditing(false)}>Cancel</Button>
          <Button
            type="button"
            size="sm"
            disabled={saving || !draft.trim()}
            onClick={async () => {
              setSaving(true);
              const ok = await handlers.onEdit(item, draft.trim());
              setSaving(false);
              if (ok) setEditing(false);
            }}
          >
            Save note
          </Button>
        </div>
      </li>
    );
  }

  return (
    <li data-note={item.id} data-quadrant={quadrant} className="group relative rounded-lg border border-border bg-background py-3 pr-12 pl-3.5">
      <p className="text-sm leading-snug [overflow-wrap:anywhere]">
        {quadrant === "says" ? <span className="text-foreground">&ldquo;{item.content}&rdquo;</span> : item.content}
      </p>
      {item.evidence_note && <p className="mt-1 text-xs text-muted-foreground [overflow-wrap:anywhere]">{item.evidence_note}</p>}
      <div className="mt-2 flex min-w-0 flex-wrap items-center gap-2">
        <Provenance item={item} evidence={evidence} onLink={() => handlers.onLink(item)} />
      </div>
      <div className="absolute top-1.5 right-1.5">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="size-8" aria-label={`Actions for this ${label} note: ${item.content}`}>
              <EllipsisVertical />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={() => { setDraft(item.content); setEditing(true); }}><Pencil /> Edit</DropdownMenuItem>
            <DropdownMenuItem onSelect={() => handlers.onLink(item)}><Link2 /> {item.observation_id ? "Change evidence" : "Link evidence"}</DropdownMenuItem>
            {item.observation_id && <DropdownMenuItem onSelect={() => handlers.onUnlink(item)}><Unlink /> Remove evidence link</DropdownMenuItem>}
            <DropdownMenuSeparator />
            <DropdownMenuItem disabled={first} onSelect={() => handlers.onMove(item, -1)}><ChevronUp /> Move up</DropdownMenuItem>
            <DropdownMenuItem disabled={last} onSelect={() => handlers.onMove(item, 1)}><ChevronDown /> Move down</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem destructive onSelect={() => handlers.onDelete(item)}><Trash2 /> Delete note</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </li>
  );
}

/** One quadrant of the map: its prompt, its notes, and a one-line way to add another. */
export function EmpathyQuadrant({
  quadrant,
  items,
  notResearched,
  evidenceById,
  handlers,
  className,
  corner,
}: {
  quadrant: Quadrant;
  items: EmpathyItemRow[];
  notResearched: boolean;
  evidenceById: Map<string, EvidenceOption>;
  handlers: QuadrantHandlers;
  className?: string;
  /** Drawn on this quadrant's bottom-right corner, which is the crosshair of the map. */
  corner?: React.ReactNode;
}) {
  const info = QUADRANT_INFO[quadrant];
  const [text, setText] = useState("");
  const [adding, setAdding] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const headingId = `quadrant-${quadrant}`;

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() || adding) return;
    setAdding(true);
    const ok = await handlers.onAdd(quadrant, text.trim());
    setAdding(false);
    if (ok) {
      setText("");
      inputRef.current?.focus();
    }
  };

  return (
    <section aria-labelledby={headingId} data-quadrant-section={quadrant} className={cn("relative flex min-w-0 flex-col gap-4 bg-card p-5 sm:p-6", className)}>
      <header>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <h2 id={headingId} className="text-2xl leading-tight">{info.label}</h2>
          <Badge variant={info.basis === "observed" ? "default" : "outline"}>{BASIS_LABELS[info.basis]}</Badge>
          <span className="text-sm text-muted-foreground tabular-nums">{items.length}</span>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">{info.prompt}</p>
      </header>

      {items.length > 0 && (
        <ul className="space-y-2.5">
          {items.map((item, i) => (
            <Note key={item.id} item={item} quadrant={quadrant} first={i === 0} last={i === items.length - 1} evidence={item.observation_id ? evidenceById.get(item.observation_id) : undefined} handlers={handlers} />
          ))}
        </ul>
      )}

      {notResearched ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-dashed border-border-strong bg-surface px-4 py-3">
          <div>
            <p className="text-sm font-semibold">Not yet researched</p>
            <p className="text-sm text-muted-foreground">Left empty on purpose. This is a gap, not a finding.</p>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={() => handlers.onNotResearched(quadrant, false)}>Undo</Button>
        </div>
      ) : (
        <>
          {items.length === 0 && (
            <div className="rounded-lg border border-dashed border-border-strong px-4 py-4">
              <p className="text-sm text-muted-foreground">{info.emptyHint}</p>
              <Button type="button" variant="link" size="sm" className="mt-1 h-auto p-0" onClick={() => handlers.onNotResearched(quadrant, true)}>
                Mark as not yet researched
              </Button>
            </div>
          )}
          {/* The subject medallion sits on the crosshair, so the top row's fields stay clear of it. */}
          <form onSubmit={add} className={cn("mt-auto flex items-center gap-2", quadrant === "says" && "md:pr-14", quadrant === "thinks" && "md:pl-14")}>
            <Input
              ref={inputRef}
              aria-label={info.addLabel}
              placeholder={info.placeholder}
              maxLength={EMPATHY_LIMITS.itemChars}
              value={text}
              onChange={(e) => setText(e.target.value)}
              readOnly={adding}
            />
            <Button type="submit" variant="outline" size="icon" aria-label={`Add note to ${info.label}`} disabled={!text.trim() || adding}>
              <Plus />
            </Button>
          </form>
        </>
      )}
      {corner}
    </section>
  );
}

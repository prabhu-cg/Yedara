"use client";

import * as React from "react";
import { closestCorners, DndContext, DragOverlay, KeyboardSensor, PointerSensor, useDroppable, useSensor, useSensors, type DragEndEvent, type DragStartEvent } from "@dnd-kit/core";
import { SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ArrowLeft, ArrowRight, GripVertical, NotebookPen, Pencil, Plus, Redo2, Trash2, Undo2, ZoomIn, ZoomOut } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { addTheme, columnCards, moveCard, moveTheme, removeTheme, renameTheme, setThemeNotes, type BoardState, type BoardTheme } from "@/lib/synthesizer/board-state";
import { LIMITS, OBSERVATION_KIND_LABELS, UNGROUPED_LABEL } from "@/lib/synthesizer/constants";
import type { ObservationRow } from "@/lib/synthesizer/schemas";
import { cn } from "@/lib/utils";

const colId = (themeId: string | null) => `col:${themeId ?? "none"}`;
const parseColId = (id: string) => (id === "col:none" ? null : id.slice(4));
export const ZOOM_STEPS = [0.6, 0.75, 0.9, 1, 1.15, 1.3, 1.5] as const;

type Common = {
  state: BoardState;
  themes: BoardTheme[];
  obsOf: (cardId: string) => ObservationRow | undefined;
  refOf: (obsId: string) => string;
  sourceOf: (obs: ObservationRow) => string | null;
  onMove: (cardId: string, themeId: string | null) => void;
  onEdit: (obsId: string) => void;
};

function CardBody({ obs, refLabel, source }: { obs: ObservationRow; refLabel: string; source: string | null }) {
  return (
    <>
      <p className="line-clamp-6 whitespace-pre-wrap [overflow-wrap:anywhere]">{obs.content}</p>
      <div className="mt-[0.5em] flex flex-wrap items-center gap-x-[0.6em] gap-y-[0.3em] text-[0.8em] text-muted-foreground">
        <span className="font-semibold text-foreground tabular-nums">{refLabel}</span>
        <span>{OBSERVATION_KIND_LABELS[obs.kind]}</span>
        {obs.participant_ref && <span>{obs.participant_ref}</span>}
        {source && <span className="truncate">{source}</span>}
        {obs.tags.map((t) => <Badge key={t} variant="outline" className="h-[1.6em] text-[1em]">{t}</Badge>)}
      </div>
    </>
  );
}

function BoardCard({ cardId, columnId, c }: { cardId: string; columnId: string; c: Common }) {
  const obs = c.obsOf(cardId);
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id: cardId, data: { columnId } });
  if (!obs) return null;
  const label = c.refOf(obs.id);
  const current = c.state.cards[cardId]?.themeId ?? "";
  return (
    <li ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition }} data-card={cardId} data-observation={obs.id} className={cn("rounded-[0.6em] border border-border bg-card p-[0.75em] shadow-card", isDragging && "opacity-40")}>
      <div className="flex items-start gap-[0.5em]">
        <button ref={setActivatorNodeRef} type="button" {...attributes} {...listeners} aria-label={`Drag card ${label}`} className="mt-[0.1em] shrink-0 cursor-grab touch-none rounded p-[0.15em] text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring active:cursor-grabbing">
          <GripVertical aria-hidden className="size-4" />
        </button>
        <div className="min-w-0 flex-1"><CardBody obs={obs} refLabel={label} source={c.sourceOf(obs)} /></div>
        <button type="button" onClick={() => c.onEdit(obs.id)} aria-label={`Edit card ${label}`} className="shrink-0 rounded p-[0.15em] text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring">
          <Pencil aria-hidden className="size-4" />
        </button>
      </div>
      <label className="mt-[0.6em] block text-[0.8em] text-muted-foreground">
        <span className="sr-only">Move card {label} to</span>
        <select aria-label={`Move card ${label} to`} value={current} onChange={(e) => c.onMove(cardId, e.target.value || null)} className="w-full rounded-md border border-input bg-background px-[0.5em] py-[0.3em] text-foreground">
          <option value="">{UNGROUPED_LABEL}</option>
          {c.themes.map((t) => <option key={t.id} value={t.id}>{t.title}</option>)}
        </select>
      </label>
    </li>
  );
}

function Column({ theme, index, count, c, onChange }: { theme: BoardTheme | null; index: number; count: number; c: Common; onChange: (s: BoardState) => void }) {
  const id = colId(theme?.id ?? null);
  const { setNodeRef, isOver } = useDroppable({ id });
  const ids = columnCards(c.state, theme?.id ?? null);
  const [notesOpen, setNotesOpen] = React.useState(false);
  const title = theme?.title ?? UNGROUPED_LABEL;
  const commitTitle = (el: HTMLInputElement) => {
    if (!theme) return;
    const next = el.value.trim();
    if (!next) el.value = theme.title;
    else if (next !== theme.title) onChange(renameTheme(c.state, theme.id, next));
  };
  return (
    <section data-column={theme?.id ?? "none"} aria-label={`${title}, ${ids.length} ${ids.length === 1 ? "card" : "cards"}`} className={cn("flex w-[19em] flex-none flex-col rounded-[0.8em] border bg-secondary/60 p-[0.6em]", isOver ? "border-primary" : "border-border")}>
      <header className="mb-[0.5em] space-y-[0.4em]">
        {theme ? (
          <>
            <Input key={theme.title} aria-label={`Theme title ${index + 1}`} defaultValue={theme.title} maxLength={120} onBlur={(e) => commitTitle(e.currentTarget)} onKeyDown={(e) => { if (e.key === "Enter") e.currentTarget.blur(); if (e.key === "Escape") { e.currentTarget.value = theme.title; e.currentTarget.blur(); } }} className="h-auto w-full border-transparent bg-transparent px-[0.4em] py-[0.25em] font-bold shadow-none hover:border-input focus-visible:bg-background" style={{ fontSize: "1em" }} />
            <div className="flex items-center gap-[0.25em]">
              <p className="flex-1 px-[0.4em] text-[0.8em] text-muted-foreground tabular-nums">{ids.length} {ids.length === 1 ? "card" : "cards"}</p>
            <Button type="button" variant="ghost" size="icon" className="size-8" aria-label={`Move theme ${theme.title} left`} disabled={index === 0} onClick={() => onChange(moveTheme(c.state, theme.id, -1))}><ArrowLeft /></Button>
            <Button type="button" variant="ghost" size="icon" className="size-8" aria-label={`Move theme ${theme.title} right`} disabled={index === count - 1} onClick={() => onChange(moveTheme(c.state, theme.id, 1))}><ArrowRight /></Button>
            <Button type="button" variant="ghost" size="icon" className="size-8" aria-label={`Notes for theme ${theme.title}`} aria-expanded={notesOpen} onClick={() => setNotesOpen((o) => !o)}><NotebookPen /></Button>
            <Button type="button" variant="ghost" size="icon" className="size-8" aria-label={`Delete theme ${theme.title}`} onClick={() => onChange(removeTheme(c.state, theme.id))}><Trash2 /></Button>
            </div>
          </>
        ) : (
          <>
            <h3 className="px-[0.4em] py-[0.25em] font-bold">{UNGROUPED_LABEL}</h3>
            <p className="px-[0.4em] text-[0.8em] text-muted-foreground tabular-nums">{ids.length} {ids.length === 1 ? "card" : "cards"}</p>
          </>
        )}
        {theme && (notesOpen || theme.notes) && (
          <Textarea aria-label={`Notes for theme ${theme.title}`} rows={2} maxLength={2000} placeholder="Notes on this theme" defaultValue={theme.notes} onBlur={(e) => { if (e.currentTarget.value !== theme.notes) onChange(setThemeNotes(c.state, theme.id, e.currentTarget.value)); }} className="bg-background text-[0.9em]" />
        )}
      </header>
      <SortableContext items={ids} strategy={verticalListSortingStrategy}>
        <ul ref={setNodeRef} className="flex min-h-[4em] flex-1 flex-col gap-[0.5em]">
          {ids.map((cardId) => <BoardCard key={cardId} cardId={cardId} columnId={id} c={c} />)}
          {ids.length === 0 && <li className="rounded-[0.6em] border border-dashed border-input px-[0.75em] py-[1em] text-center text-[0.85em] text-muted-foreground">{theme ? "Drop cards here" : "Every card is grouped"}</li>}
        </ul>
      </SortableContext>
    </section>
  );
}

export function AffinityBoard({ state, onChange, canUndo, canRedo, onUndo, onRedo, zoom, onZoom, observationOfCard, refOf, sourceOf, onEdit }: {
  state: BoardState;
  onChange: (next: BoardState) => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  zoom: number;
  onZoom: (zoom: number) => void;
  observationOfCard: (cardId: string) => ObservationRow | undefined;
  refOf: (obsId: string) => string;
  sourceOf: (obs: ObservationRow) => string | null;
  onEdit: (obsId: string) => void;
}) {
  const [newTheme, setNewTheme] = React.useState("");
  const [activeId, setActiveId] = React.useState<string | null>(null);
  const scroller = React.useRef<HTMLDivElement>(null);
  const pan = React.useRef<{ x: number; y: number; left: number; top: number } | null>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));

  const common: Common = { state, themes: state.themes, obsOf: observationOfCard, refOf, sourceOf, onMove: (cardId, themeId) => onChange(moveCard(state, cardId, themeId)), onEdit };
  const total = Object.keys(state.cards).length;
  const zoomIndex = Math.max(0, ZOOM_STEPS.findIndex((z) => z >= zoom - 0.001));

  const addNewTheme = (e: React.FormEvent) => {
    e.preventDefault();
    const title = newTheme.trim();
    if (!title || state.themes.length >= LIMITS.themes) return;
    onChange(addTheme(state, crypto.randomUUID(), title));
    setNewTheme("");
  };

  const dragEnd = (e: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const cardId = String(active.id);
    const overId = String(over.id);
    if (overId.startsWith("col:")) return onChange(moveCard(state, cardId, parseColId(overId)));
    const target = state.cards[overId];
    if (!target) return;
    onChange(moveCard(state, cardId, target.themeId, columnCards(state, target.themeId).indexOf(overId)));
  };

  const panDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.target !== e.currentTarget || !scroller.current) return;
    pan.current = { x: e.clientX, y: e.clientY, left: scroller.current.scrollLeft, top: scroller.current.scrollTop };
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const panMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const p = pan.current;
    if (!p || !scroller.current) return;
    scroller.current.scrollLeft = p.left - (e.clientX - p.x);
    scroller.current.scrollTop = p.top - (e.clientY - p.y);
  };

  const activeObs = activeId ? observationOfCard(activeId) : undefined;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2" role="toolbar" aria-label="Board tools">
        <div className="flex items-center gap-1">
          <Button type="button" variant="outline" size="sm" onClick={onUndo} disabled={!canUndo} aria-label="Undo board change"><Undo2 /> Undo</Button>
          <Button type="button" variant="outline" size="sm" onClick={onRedo} disabled={!canRedo} aria-label="Redo board change"><Redo2 /> Redo</Button>
        </div>
        <form onSubmit={addNewTheme} className="flex items-center gap-2">
          <Input aria-label="New theme title" placeholder="New theme" maxLength={120} value={newTheme} onChange={(e) => setNewTheme(e.target.value)} className="w-44" />
          <Button type="submit" size="sm" disabled={!newTheme.trim() || state.themes.length >= LIMITS.themes}><Plus /> Add theme</Button>
        </form>
        <div className="ml-auto flex items-center gap-1" role="group" aria-label="Zoom">
          <Button type="button" variant="ghost" size="icon" aria-label="Zoom out" disabled={zoomIndex === 0} onClick={() => onZoom(ZOOM_STEPS[zoomIndex - 1])}><ZoomOut /></Button>
          <span className="w-12 text-center text-sm tabular-nums text-muted-foreground" aria-live="polite">{Math.round(zoom * 100)}%</span>
          <Button type="button" variant="ghost" size="icon" aria-label="Zoom in" disabled={zoomIndex === ZOOM_STEPS.length - 1} onClick={() => onZoom(ZOOM_STEPS[zoomIndex + 1])}><ZoomIn /></Button>
        </div>
      </div>
      <p className="text-sm text-muted-foreground">
        Drag a card by its handle, or use its “Move to” menu. With the keyboard, focus a handle, press Space, move with the arrow keys, and press Space to drop. Ctrl or ⌘ + Z undoes. Drag empty space to pan.
      </p>
      {total === 0 ? (
        <p className="rounded-card border border-dashed border-input bg-secondary px-5 py-8 text-center text-sm text-muted-foreground">No cards yet. Add observations on the Research material tab, then group them here.</p>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={(e: DragStartEvent) => setActiveId(String(e.active.id))} onDragCancel={() => setActiveId(null)} onDragEnd={dragEnd}>
          <div ref={scroller} role="region" aria-label="Affinity board" tabIndex={0} onPointerDown={panDown} onPointerMove={panMove} onPointerUp={() => (pan.current = null)} onPointerCancel={() => (pan.current = null)} className="max-h-[70vh] min-h-[22rem] overflow-auto rounded-card border border-border bg-background p-3 outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50" style={{ fontSize: `${14 * zoom}px` }}>
            <div className="flex w-max items-start gap-[0.8em]">
              <Column theme={null} index={-1} count={state.themes.length} c={common} onChange={onChange} />
              {state.themes.map((t, i) => <Column key={t.id} theme={t} index={i} count={state.themes.length} c={common} onChange={onChange} />)}
            </div>
          </div>
          <DragOverlay>
            {activeObs ? <div className="w-[19em] rounded-[0.6em] border border-primary bg-card p-[0.75em] shadow-raised" style={{ fontSize: `${14 * zoom}px` }}><CardBody obs={activeObs} refLabel={refOf(activeObs.id)} source={sourceOf(activeObs)} /></div> : null}
          </DragOverlay>
        </DndContext>
      )}
    </div>
  );
}

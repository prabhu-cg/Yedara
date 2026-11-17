"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import * as React from "react";
import { ArrowLeft, CheckCircle2, ChevronRight, RotateCcw, Unlink } from "lucide-react";
import { toast } from "sonner";
import { SelectField, TextField, TextareaField } from "@/components/forms/fields";
import { EmpathyQuadrant, type QuadrantHandlers } from "@/components/empathy/empathy-quadrant";
import { ProjectChip } from "@/components/layout/project-chip";
import { PersonaAvatar, personaInitials } from "@/components/personas/persona-avatar";
import { SaveStatusIndicator } from "@/components/research-planner/save-status";
import { AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SideDrawer } from "@/components/ui/side-drawer";
import type { SaveStatus } from "@/hooks/use-autosave";
import {
  addEmpathyItemAction,
  deleteEmpathyItemAction,
  reorderEmpathyItemsAction,
  setEmpathyStatusAction,
  updateEmpathyItemAction,
  updateEmpathyMapAction,
} from "@/lib/empathy/actions";
import { completionIssues, EMPATHY_LIMITS, QUADRANT_INFO, type Quadrant } from "@/lib/empathy/constants";
import type { EmpathyItemRow } from "@/lib/empathy/schemas";
import type { EvidenceOption } from "@/lib/synthesizer/queries";
import { cn } from "@/lib/utils";

type Meta = { title: string; subject: string; context: string; personaId: string };
type PersonaOption = { id: string; name: string; avatar: string };

const byPosition = (a: EmpathyItemRow, b: EmpathyItemRow) => a.position - b.position || a.created_at.localeCompare(b.created_at);

/** The subject at the crosshair: a persona's portrait or initials, or the typed subject's initials in an amber tile. */
function SubjectMark({ persona, subject, className }: { persona: PersonaOption | null; subject: string; className?: string }) {
  if (persona) return <PersonaAvatar avatarId={persona.avatar} name={persona.name} decorative className={className} />;
  return (
    <span aria-hidden className={cn("flex shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground", className)}>
      {personaInitials(subject || "?")}
    </span>
  );
}

function EvidenceDrawer({
  item,
  options,
  onClose,
  onPick,
  onUnlink,
}: {
  item: EmpathyItemRow | null;
  options: EvidenceOption[];
  onClose: () => void;
  onPick: (observationId: string) => void;
  onUnlink: () => void;
}) {
  const [query, setQuery] = React.useState("");
  const shown = options.filter((o) => `${o.label} ${o.participant ?? ""} ${o.synthesis}`.toLowerCase().includes(query.trim().toLowerCase()));
  return (
    <SideDrawer open={item !== null} onOpenChange={(open) => { if (!open) { setQuery(""); onClose(); } }} title="Link evidence" description={item ? `Choose the observation behind: “${item.content}”` : undefined}>
      {item && (
        <div className="space-y-4">
          {options.length === 0 ? (
            <p className="rounded-lg border border-dashed border-border-strong p-4 text-sm text-muted-foreground">
              This project has no observations yet. Add some in a Research Synthesizer, then link them here. Until then the note stays marked as assumed.
            </p>
          ) : (
            <>
              <Input aria-label="Search observations" placeholder="Search observations" value={query} onChange={(e) => setQuery(e.target.value)} />
              <ul className="space-y-2">
                {shown.map((o) => (
                  <li key={o.id}>
                    <button
                      type="button"
                      onClick={() => onPick(o.id)}
                      aria-pressed={item.observation_id === o.id}
                      className={cn(
                        "w-full rounded-lg border p-3 text-left transition-colors outline-none focus-visible:ring-[3px] focus-visible:ring-ring/40",
                        item.observation_id === o.id ? "border-primary bg-accent" : "border-border hover:bg-muted",
                      )}
                    >
                      <span className="block text-sm [overflow-wrap:anywhere]">{o.label}</span>
                      <span className="mt-1 block text-xs text-muted-foreground">{o.participant ? `${o.participant} · ` : ""}{o.synthesis}</span>
                    </button>
                  </li>
                ))}
                {shown.length === 0 && <li className="text-sm text-muted-foreground">No observations match.</li>}
              </ul>
            </>
          )}
          {item.observation_id && (
            <Button type="button" variant="outline" size="sm" onClick={onUnlink}><Unlink /> Remove the link</Button>
          )}
        </div>
      )}
    </SideDrawer>
  );
}

export function EmpathyWorkspace(props: {
  mapId: string;
  initialMeta: Meta;
  initialStatus: "draft" | "completed";
  initialNotResearched: Quadrant[];
  project: { id: string; name: string } | null;
  personas: PersonaOption[];
  initialItems: EmpathyItemRow[];
  evidenceOptions: EvidenceOption[];
}) {
  const router = useRouter();
  const { mapId } = props;
  const [meta, setMeta] = React.useState<Meta>(props.initialMeta);
  // What the server has, so edits are compared with that and a rejected edit can be put back.
  const [saved, setSaved] = React.useState<Meta>(props.initialMeta);
  const [status, setStatus] = React.useState(props.initialStatus);
  const [notResearched, setNotResearched] = React.useState<Quadrant[]>(props.initialNotResearched);
  const [items, setItems] = React.useState<EmpathyItemRow[]>(props.initialItems);
  // Save status is derived: anything in flight is "saving", else the last failure, else saved once something has saved.
  const [inflight, setInflight] = React.useState(0);
  const [saveError, setSaveError] = React.useState<string | null>(null);
  const [everSaved, setEverSaved] = React.useState(false);
  const saveStatus: SaveStatus = inflight > 0 ? "saving" : saveError ? "error" : everSaved ? "saved" : "idle";
  const [linkingId, setLinkingId] = React.useState<string | null>(null);
  const [completing, setCompleting] = React.useState(false);
  // A note being deleted waits for confirmation, because deleting is permanent.
  const [deleting, setDeleting] = React.useState<EmpathyItemRow | null>(null);
  const [deletePending, setDeletePending] = React.useState(false);

  const evidenceById = React.useMemo(() => new Map(props.evidenceOptions.map((o) => [o.id, o])), [props.evidenceOptions]);
  const persona = props.personas.find((p) => p.id === meta.personaId) ?? null;
  const subjectName = meta.subject || persona?.name || "Untitled subject";
  const missing = completionIssues(items, notResearched);
  const total = items.length;
  const evidenced = items.filter((i) => i.observation_id).length;

  /** Wraps every save so the status line is always honest, even with several in flight. */
  const track = React.useCallback(async <T extends { ok: boolean; error?: string }>(run: () => Promise<T>): Promise<T> => {
    setInflight((n) => n + 1);
    const result = await run();
    setInflight((n) => n - 1);
    if (!result.ok) setSaveError(result.error ?? "Couldn't save");
    else {
      setSaveError(null);
      setEverSaved(true);
    }
    return result;
  }, []);

  const saveMeta = async (patch: Partial<Meta> & { notResearched?: Quadrant[] }, revert?: () => void) => {
    const result = await track(() => updateEmpathyMapAction(mapId, patch));
    if (!result.ok) {
      toast.error(result.error);
      revert?.();
      return false;
    }
    const { notResearched: _ignored, ...fields } = patch;
    void _ignored;
    setSaved((m) => ({ ...m, ...fields, ...(patch.personaId !== undefined && result.data.subject !== null ? { subject: result.data.subject } : {}) }));
    if (patch.personaId !== undefined && result.data.subject !== null) setMeta((m) => ({ ...m, subject: result.data.subject ?? m.subject }));
    return true;
  };

  const itemsIn = (q: Quadrant) => items.filter((i) => i.quadrant === q).sort(byPosition);
  const linking = items.find((i) => i.id === linkingId) ?? null;

  const handlers: QuadrantHandlers = {
    onAdd: async (quadrant, content) => {
      const result = await track(() => addEmpathyItemAction(mapId, { quadrant, content }));
      if (!result.ok) {
        toast.error(result.error);
        return false;
      }
      setItems((prev) => [...prev, result.data.item]);
      setNotResearched(result.data.notResearched);
      return true;
    },
    onEdit: async (item, content) => {
      const result = await track(() => updateEmpathyItemAction(mapId, item.id, { content }));
      if (!result.ok) {
        toast.error(result.error);
        return false;
      }
      setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, content } : i)));
      return true;
    },
    onDelete: (item) => setDeleting(item),
    onMove: async (item, direction) => {
      const list = itemsIn(item.quadrant as Quadrant);
      const from = list.findIndex((i) => i.id === item.id);
      const to = from + direction;
      if (from < 0 || to < 0 || to >= list.length) return;
      const next = [...list];
      [next[from], next[to]] = [next[to], next[from]];
      const before = items;
      const positions = new Map(next.map((i, index) => [i.id, index * 10]));
      setItems((prev) => prev.map((i) => (positions.has(i.id) ? { ...i, position: positions.get(i.id)! } : i)));
      const result = await track(() => reorderEmpathyItemsAction(mapId, next.map((i) => i.id)));
      if (!result.ok) {
        setItems(before);
        toast.error(result.error);
      }
    },
    onLink: (item) => setLinkingId(item.id),
    onUnlink: async (item) => {
      const result = await track(() => updateEmpathyItemAction(mapId, item.id, { observationId: "" }));
      if (!result.ok) return void toast.error(result.error);
      setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, observation_id: null } : i)));
    },
    onNotResearched: async (quadrant, on) => {
      const next = on ? [...new Set([...notResearched, quadrant])] : notResearched.filter((q) => q !== quadrant);
      const before = notResearched;
      setNotResearched(next);
      await saveMeta({ notResearched: next }, () => setNotResearched(before));
    },
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    const item = deleting;
    const before = items;
    setDeletePending(true);
    setItems((prev) => prev.filter((i) => i.id !== item.id));
    const result = await track(() => deleteEmpathyItemAction(mapId, item.id));
    setDeletePending(false);
    setDeleting(null);
    if (!result.ok) {
      setItems(before);
      toast.error(result.error);
    }
  };

  const pickEvidence = async (observationId: string) => {
    if (!linking) return;
    const id = linking.id;
    const result = await track(() => updateEmpathyItemAction(mapId, id, { observationId }));
    if (!result.ok) return void toast.error(result.error);
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, observation_id: observationId } : i)));
    setLinkingId(null);
    toast.success("Evidence linked");
  };

  const toggleComplete = async () => {
    setCompleting(true);
    const next = status === "completed" ? "draft" : "completed";
    const result = await track(() => setEmpathyStatusAction(mapId, next));
    setCompleting(false);
    if (!result.ok) return void toast.error(result.error);
    setStatus(next);
    toast.success(next === "completed" ? "Marked as complete" : "Reopened as a draft");
  };

  const quadrantProps = (q: Quadrant) => ({
    quadrant: q,
    items: itemsIn(q),
    notResearched: notResearched.includes(q),
    evidenceById,
    handlers,
  });

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <Link href="/tools/empathy-mapper" className="inline-flex w-fit items-center gap-1.5 rounded-md text-sm font-semibold text-muted-foreground hover:text-foreground">
            <ArrowLeft aria-hidden className="size-4" /> Empathy maps
          </Link>
          <ProjectChip project={props.project} />
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 flex-1 space-y-2">
            <Input
              aria-label="Map title"
              aria-invalid={!meta.title.trim()}
              value={meta.title}
              maxLength={EMPATHY_LIMITS.title}
              onChange={(e) => setMeta((m) => ({ ...m, title: e.target.value }))}
              onBlur={() => {
                const title = meta.title.trim();
                if (!title) return setMeta((m) => ({ ...m, title: saved.title }));
                if (title !== saved.title) void saveMeta({ title });
              }}
              className="font-display h-auto max-w-2xl border-transparent bg-transparent px-0 text-xl leading-tight font-bold shadow-none hover:border-input focus-visible:bg-background sm:text-[28px] md:text-[28px]"
            />
            <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              <Badge variant={status === "completed" ? "default" : "secondary"}>{status === "completed" ? "Completed" : "Draft"}</Badge>
              <span className="tabular-nums">{total} {total === 1 ? "note" : "notes"} · {evidenced} with evidence</span>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <SaveStatusIndicator status={saveStatus} error={saveError} onRetry={() => setSaveError(null)} />
            <Button type="button" variant={status === "completed" ? "outline" : "default"} size="sm" onClick={toggleComplete} disabled={completing}>
              {status === "completed" ? <><RotateCcw /> Reopen</> : <><CheckCircle2 /> Mark as complete</>}
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={() => router.push("/tools/empathy-mapper")}>Save and close</Button>
          </div>
        </div>
        {status === "draft" && missing.length > 0 && (
          <p className="text-sm text-muted-foreground" data-completion-hint>
            Still to do before this is complete: {missing.map((q) => QUADRANT_INFO[q].label).join(", ")}. Add a note, or mark the quadrant not yet researched.
          </p>
        )}
        <details className="group rounded-lg border border-border">
          <summary className="flex cursor-pointer list-none items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold outline-none focus-visible:ring-[3px] focus-visible:ring-ring/40 [&::-webkit-details-marker]:hidden">
            <ChevronRight aria-hidden className="size-4 transition-transform group-open:rotate-90" />
            Subject and situation
            <span className="truncate font-normal text-muted-foreground">{subjectName}</span>
          </summary>
          <div className="grid gap-4 border-t border-border p-4 sm:grid-cols-2">
            <SelectField label="Persona" optional hint="From this project. Not needed to make a map." value={meta.personaId} onChange={(e) => { const personaId = e.target.value; const before = meta.personaId; setMeta((m) => ({ ...m, personaId })); void saveMeta({ personaId }, () => setMeta((m) => ({ ...m, personaId: before }))); }}>
              <option value="">No persona</option>
              {props.personas.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </SelectField>
            <TextField
              label="Who it is about"
              hint={persona ? "Shown on the map. Defaults to the persona's name." : "A person or group, e.g. First-time home cook."}
              maxLength={EMPATHY_LIMITS.subject}
              value={meta.subject}
              onChange={(e) => setMeta((m) => ({ ...m, subject: e.target.value }))}
              onBlur={() => {
                const subject = meta.subject.trim();
                if (subject === saved.subject) return;
                if (!subject && !meta.personaId) {
                  toast.error("Say who this map is about, or choose a persona");
                  return setMeta((m) => ({ ...m, subject: saved.subject }));
                }
                void saveMeta({ subject });
              }}
            />
            <TextareaField
              label="Situation"
              optional
              className="sm:col-span-2"
              rows={2}
              maxLength={EMPATHY_LIMITS.context}
              value={meta.context}
              onChange={(e) => setMeta((m) => ({ ...m, context: e.target.value }))}
              onBlur={() => { if (meta.context.trim() !== saved.context) void saveMeta({ context: meta.context.trim() }); }}
            />
          </div>
        </details>
      </div>

      <div className="mb-4 flex items-center gap-3">
        <SubjectMark persona={persona} subject={subjectName} className="size-10 text-sm md:hidden" />
        <div className="min-w-0">
          <p className="truncate font-semibold">{subjectName}</p>
          <p className="line-clamp-2 text-sm text-muted-foreground">
            {persona ? `Persona: ${persona.name}` : "Not linked to a persona"}
            {meta.context ? ` · ${meta.context}` : ""}
            {persona?.avatar ? " · Illustrative stock photo. Not a real participant." : ""}
          </p>
        </div>
      </div>

      {/* The classic cross: Says and Thinks on top, Does and Feels below. Hairlines are the grid's gap. */}
      <div className="grid gap-px overflow-hidden rounded-card border border-border bg-border md:grid-cols-2">
        {/* The subject sits on the crosshair: the bottom-right corner of Says. Anchoring it there, not at the grid's
            midpoint, keeps it on the hairlines however tall each row grows. The lower row starts below it. */}
        <EmpathyQuadrant
          {...quadrantProps("says")}
          className="max-md:order-1"
          corner={
            <div
              aria-hidden
              data-medallion
              className="pointer-events-none absolute right-0 bottom-0 z-10 hidden size-24 translate-x-1/2 translate-y-1/2 items-center justify-center rounded-full border border-border bg-background md:flex"
            >
              <SubjectMark persona={persona} subject={subjectName} className="size-14 text-lg" />
            </div>
          }
        />
        <EmpathyQuadrant {...quadrantProps("thinks")} className="max-md:order-3" />
        <EmpathyQuadrant {...quadrantProps("does")} className="max-md:order-2 md:pt-14" />
        <EmpathyQuadrant {...quadrantProps("feels")} className="max-md:order-4 md:pt-14" />
      </div>

      <p className="mt-4 text-sm text-muted-foreground">
        Says and Does are what you observed. Thinks and Feels are what you infer. A note with no linked observation is shown as assumed, never as evidence.
      </p>

      <AlertDialog open={deleting !== null} onOpenChange={(open) => { if (!open && !deletePending) setDeleting(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this note?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleting ? <>&ldquo;<span className="text-foreground [overflow-wrap:anywhere]">{deleting.content.length > 160 ? `${deleting.content.slice(0, 157)}…` : deleting.content}</span>&rdquo;</> : null} will be permanently deleted from {deleting ? QUADRANT_INFO[deleting.quadrant as Quadrant].label : "the map"}. This can&apos;t be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletePending}>Cancel</AlertDialogCancel>
            <Button variant="destructive" onClick={confirmDelete} disabled={deletePending} aria-busy={deletePending}>{deletePending ? "Deleting…" : "Delete note"}</Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <EvidenceDrawer
        key={linkingId ?? "none"}
        item={linking}
        options={props.evidenceOptions}
        onClose={() => setLinkingId(null)}
        onPick={pickEvidence}
        onUnlink={() => { if (linking) { void handlers.onUnlink(linking); setLinkingId(null); } }}
      />
    </div>
  );
}

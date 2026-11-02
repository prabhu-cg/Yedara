"use client";

import * as React from "react";
import Link from "next/link";
import { CircleCheck, CircleAlert, Download, Eye, FileText, GitCompareArrows, Pencil, UserRound } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { TextareaField, TextField } from "@/components/forms/fields";
import { DocumentView } from "@/components/research-planner/document-view";
import { PersonaAvatar } from "@/components/personas/persona-avatar";
import { PersonaTypeNotice, PersonaTypeBadge } from "@/components/personas/persona-type";
import { AVATAR_LABEL, getAvatar } from "@/lib/personas/avatars";
import { CONFIDENCE_LABELS, EXPERIENCE_LABELS, type PersonaType } from "@/lib/personas/constants";
import type { PlanDocument } from "@/lib/research-planner/document";
import type { EvidenceRow, PersonaContent } from "@/lib/personas/schemas";
import { summariseEvidence, type PersonaIssue } from "@/lib/personas/validation";
import { cn } from "@/lib/utils";

export type PersonaExportFormat = "md" | "pdf" | "docx";

function Section({ title, step, onEdit, children, empty }: { title: string; step: number; onEdit: (s: number) => void; children?: React.ReactNode; empty: boolean }) {
  return (
    <section aria-label={title} className="rounded-card border border-border bg-card p-5 shadow-card">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold">{title}</h3>
        <Button type="button" variant="ghost" size="xs" onClick={() => onEdit(step)} aria-label={`Edit ${title}`}>
          <Pencil /> Edit
        </Button>
      </div>
      {empty ? <p className="text-sm text-muted-foreground">Nothing added yet.</p> : children}
    </section>
  );
}

function Bullets({ items }: { items: string[] }) {
  const clean = items.map((i) => i.trim()).filter(Boolean);
  return (
    <ul className="list-disc space-y-1 pl-5 text-sm">
      {clean.map((i, n) => (
        <li key={n} className="[overflow-wrap:anywhere]">{i}</li>
      ))}
    </ul>
  );
}
const hasAny = (items: string[]) => items.some((i) => i.trim());

export function PersonaOutput({
  name,
  type,
  projectName,
  content,
  evidence,
  doc,
  issues,
  status,
  busy,
  personaId,
  onChangeOutput,
  onEdit,
  onExport,
  onSetStatus,
}: {
  name: string;
  type: PersonaType;
  projectName: string | null;
  content: PersonaContent;
  evidence: EvidenceRow[];
  doc: PlanDocument;
  issues: PersonaIssue[];
  status: "draft" | "completed";
  busy: boolean;
  personaId: string;
  onChangeOutput: (value: PersonaContent["output"]) => void;
  onEdit: (step: number) => void;
  onExport: (format: PersonaExportFormat) => void;
  onSetStatus: (status: "draft" | "completed") => void;
}) {
  const [view, setView] = React.useState<"profile" | "document">("profile");
  const summary = summariseEvidence(evidence);
  const { profile, behaviour, needs } = content;
  const quotes = evidence.filter((e) => e.kind === "quote");
  const open = evidence.filter((e) => e.kind === "assumption" || e.kind === "hypothesis");
  const jobs = needs.jobs.filter((j) => j.situation.trim() || j.motivation.trim() || j.outcome.trim());

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
          <p className="mt-2 text-xs text-muted-foreground">You can still preview and export. These are only needed to mark the persona complete.</p>
        </div>
      ) : (
        <p className="flex items-center gap-2 rounded-xl border border-border bg-secondary p-4 text-sm">
          <CircleCheck aria-hidden className="size-4 text-success" />
          {status === "completed" ? "This persona is marked as complete." : "All required details are in. You can mark the persona complete."}
        </p>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div role="tablist" aria-label="Persona view" className="inline-flex rounded-lg border border-border p-0.5">
          {([["profile", "Profile", UserRound], ["document", "Document preview", Eye]] as const).map(([id, label, Icon]) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={view === id}
              onClick={() => setView(id)}
              className={cn("inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-semibold outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50", view === id ? "bg-primary-soft text-primary-text" : "text-muted-foreground hover:text-foreground")}
            >
              <Icon aria-hidden className="size-4" /> {label}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline">
            <Link href={`/tools/persona-builder/compare?ids=${personaId}`}><GitCompareArrows /> Compare</Link>
          </Button>
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
            <Button onClick={() => onSetStatus("completed")} disabled={busy}>Mark persona as complete</Button>
          )}
        </div>
      </div>

      {view === "document" ? (
        <div role="tabpanel" aria-label="Document preview"><DocumentView doc={doc} /></div>
      ) : (
        <div role="tabpanel" aria-label="Persona profile" className="space-y-5">
          <header className="flex flex-col gap-4 rounded-card border border-border bg-card p-5 shadow-card sm:flex-row sm:items-start sm:p-6">
            <PersonaAvatar avatarId={profile.avatar} name={name} />
            <div className="min-w-0 flex-1 space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-xl font-bold [overflow-wrap:anywhere]">{name.trim() || "Untitled persona"}</h3>
                <PersonaTypeBadge type={type} />
                {projectName && <Badge variant="outline">{projectName}</Badge>}
              </div>
              {content.output.headline.trim() && <p className="text-[15px] font-medium">{content.output.headline}</p>}
              {content.output.summary.trim() && <p className="text-sm whitespace-pre-line text-muted-foreground [overflow-wrap:anywhere]">{content.output.summary}</p>}
              <p className="text-xs text-muted-foreground">
                {getAvatar(profile.avatar)
                  ? `${AVATAR_LABEL} Change it in step 2.`
                  : "Initials stand in for a photo by default: Yedara doesn’t invent faces or identities. You can choose an illustrative portrait in step 2."}
              </p>
            </div>
          </header>

          <PersonaTypeNotice type={type} summary={summary} />

          <div className="grid gap-4 rounded-card border border-border bg-secondary/50 p-5">
            <p className="text-sm font-semibold">Headline and summary</p>
            <TextField label="Headline" optional placeholder="e.g. Time-poor freelancer who wants predictable income" value={content.output.headline} maxLength={160} onChange={(e) => onChangeOutput({ ...content.output, headline: e.target.value })} />
            <TextareaField label="Summary" optional rows={3} hint="Write this in your own words, based on the evidence below." value={content.output.summary} onChange={(e) => onChangeOutput({ ...content.output, summary: e.target.value })} />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Section title="Profile" step={2} onEdit={onEdit} empty={!profile.background.trim() && !profile.role.trim() && !profile.context_of_use.trim()}>
              <dl className="space-y-2 text-sm">
                {profile.role.trim() && <div><dt className="text-xs text-muted-foreground">Role</dt><dd className="font-medium">{profile.role}</dd></div>}
                {profile.experience_level && <div><dt className="text-xs text-muted-foreground">Experience</dt><dd className="font-medium">{EXPERIENCE_LABELS[profile.experience_level]}</dd></div>}
                {profile.background.trim() && <div><dt className="text-xs text-muted-foreground">Background</dt><dd className="whitespace-pre-line">{profile.background}</dd></div>}
                {profile.context_of_use.trim() && <div><dt className="text-xs text-muted-foreground">Context of use</dt><dd className="whitespace-pre-line">{profile.context_of_use}</dd></div>}
                {profile.demographics.some((d) => d.value.trim()) && profile.demographics_justification.trim() && (
                  <div><dt className="text-xs text-muted-foreground">Demographics</dt><dd>{profile.demographics.filter((d) => d.value.trim()).map((d) => `${d.label.trim() || "Detail"}: ${d.value}`).join(" · ")}<span className="block text-xs text-muted-foreground">Why it matters: {profile.demographics_justification}</span></dd></div>
                )}
              </dl>
            </Section>
            <Section title="Goals and motivations" step={3} onEdit={onEdit} empty={!hasAny(behaviour.goals) && !hasAny(behaviour.motivations)}>
              {hasAny(behaviour.goals) && <><p className="mb-1 text-xs font-semibold text-muted-foreground">Goals</p><Bullets items={behaviour.goals} /></>}
              {hasAny(behaviour.motivations) && <><p className="mt-3 mb-1 text-xs font-semibold text-muted-foreground">Motivations</p><Bullets items={behaviour.motivations} /></>}
            </Section>
            <Section title="Pain points and barriers" step={3} onEdit={onEdit} empty={![behaviour.pain_points, behaviour.frustrations, behaviour.barriers].some(hasAny)}>
              {hasAny(behaviour.pain_points) && <><p className="mb-1 text-xs font-semibold text-muted-foreground">Pain points</p><Bullets items={behaviour.pain_points} /></>}
              {hasAny(behaviour.frustrations) && <><p className="mt-3 mb-1 text-xs font-semibold text-muted-foreground">Frustrations</p><Bullets items={behaviour.frustrations} /></>}
              {hasAny(behaviour.barriers) && <><p className="mt-3 mb-1 text-xs font-semibold text-muted-foreground">Barriers</p><Bullets items={behaviour.barriers} /></>}
            </Section>
            <Section title="Behaviours and preferences" step={3} onEdit={onEdit} empty={!hasAny(behaviour.behaviours) && !hasAny(behaviour.preferences) && !hasAny(behaviour.needs)}>
              {hasAny(behaviour.behaviours) && <><p className="mb-1 text-xs font-semibold text-muted-foreground">Behaviours</p><Bullets items={behaviour.behaviours} /></>}
              {hasAny(behaviour.preferences) && <><p className="mt-3 mb-1 text-xs font-semibold text-muted-foreground">Preferences</p><Bullets items={behaviour.preferences} /></>}
              {hasAny(behaviour.needs) && <><p className="mt-3 mb-1 text-xs font-semibold text-muted-foreground">Needs</p><Bullets items={behaviour.needs} /></>}
            </Section>
            <Section title="Jobs to be done" step={4} onEdit={onEdit} empty={jobs.length === 0}>
              <ul className="space-y-2 text-sm">
                {jobs.map((j, n) => (
                  <li key={n} className="[overflow-wrap:anywhere]">
                    {j.situation.trim() && <>When <strong>{j.situation}</strong>, </>}
                    {j.motivation.trim() && <>I want to <strong>{j.motivation}</strong>, </>}
                    {j.outcome.trim() && <>so I can <strong>{j.outcome}</strong>.</>}
                  </li>
                ))}
              </ul>
            </Section>
            <Section title="Needs, alternatives and workarounds" step={4} onEdit={onEdit} empty={![needs.functional_needs, needs.emotional_needs, needs.desired_outcomes, needs.alternatives, needs.workarounds].some(hasAny)}>
              {([["Functional needs", needs.functional_needs], ["Emotional needs", needs.emotional_needs], ["Desired outcomes", needs.desired_outcomes], ["Current alternatives", needs.alternatives], ["Workarounds", needs.workarounds]] as const).filter(([, items]) => hasAny([...items])).map(([label, items], n) => (
                <div key={label}><p className={cn("mb-1 text-xs font-semibold text-muted-foreground", n > 0 && "mt-3")}>{label}</p><Bullets items={[...items]} /></div>
              ))}
            </Section>
          </div>

          <Section title="Evidence" step={5} onEdit={onEdit} empty={evidence.filter((e) => e.kind !== "assumption" && e.kind !== "hypothesis").length === 0}>
            <p className="mb-3 text-sm text-muted-foreground">
              {summary.sources} sources · {summary.observations} observations · {summary.quotes} quotes
              {content.evidence.overall_confidence && ` · ${CONFIDENCE_LABELS[content.evidence.overall_confidence]} overall`}
            </p>
            {quotes.length > 0 && (
              <ul className="space-y-3">
                {quotes.map((q) => (
                  <li key={q.id} className="border-l-2 border-primary/50 pl-3 text-sm">
                    <p className="[overflow-wrap:anywhere]">&ldquo;{q.content}&rdquo;</p>
                    <p className="text-xs text-muted-foreground">
                      {q.source_label.trim() ? q.source_label : "Source missing"}
                      {q.participant_ref.trim() && ` · ${q.participant_ref}`}
                      {q.confidence && ` · ${CONFIDENCE_LABELS[q.confidence]}`}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </Section>

          {open.length > 0 && (
            <Section title="Assumptions and unvalidated hypotheses" step={5} onEdit={onEdit} empty={false}>
              <ul className="space-y-2 text-sm">
                {open.map((a) => (
                  <li key={a.id} className="flex flex-wrap items-start gap-2">
                    <Badge variant={a.validation_status === "validated" ? "success" : a.validation_status === "invalidated" ? "secondary" : "warning"}>
                      {a.validation_status === "validated" ? "Validated" : a.validation_status === "invalidated" ? "Disproved" : "Unvalidated"}
                    </Badge>
                    {a.origin === "ai" && <Badge variant="warning">AI-generated</Badge>}
                    <span className="min-w-0 flex-1 [overflow-wrap:anywhere]">{a.content}</span>
                  </li>
                ))}
              </ul>
            </Section>
          )}
        </div>
      )}
    </div>
  );
}

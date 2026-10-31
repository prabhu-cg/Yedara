"use client";

import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SelectField, TextareaField, TextField } from "@/components/forms/fields";
import { ListEditor, NumberField, RowsEditor } from "@/components/research-planner/editor-primitives";
import { MethodsEditor } from "@/components/research-planner/methods-editor";
import type { SectionKey } from "@/lib/research-planner/constants";
import { sampleHints } from "@/lib/research-planner/methods";
import {
  SURVEY_QUESTION_TYPES,
  SURVEY_TYPE_LABELS,
  type AnySectionContent,
  type ChecklistContent,
  type ContextContent,
  type GoalsContent,
  type InterviewGuideContent,
  type InterviewQuestionsContent,
  type LogisticsContent,
  type MethodsContent,
  type ParticipantsContent,
  type QuestionListContent,
  type SurveyQuestionsContent,
  type TaskScenariosContent,
  type UsabilityTasksContent,
} from "@/lib/research-planner/schemas";

export type EditorContext = { goals: GoalsContent; methods: MethodsContent };
type Errors = Record<string, string>;
type P<T> = { value: T; onChange: (value: T) => void; errors?: Errors };

const fid = (name: string) => `field-${name}`;

function reorder<T>(items: T[], from: number, to: number) {
  if (to < 0 || to >= items.length) return items;
  const next = [...items];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

function ItemCard({
  title,
  index,
  count,
  onMove,
  onRemove,
  children,
}: {
  title: string;
  index: number;
  count: number;
  onMove: (to: number) => void;
  onRemove: () => void;
  children: React.ReactNode;
}) {
  return (
    <li className="space-y-3 rounded-lg border border-border bg-secondary/50 p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-semibold">{title}</p>
        <div className="flex">
          <Button type="button" variant="ghost" size="icon" className="size-8" disabled={index === 0} onClick={() => onMove(index - 1)} aria-label={`Move ${title} up`}>
            <ArrowUp />
          </Button>
          <Button type="button" variant="ghost" size="icon" className="size-8" disabled={index === count - 1} onClick={() => onMove(index + 1)} aria-label={`Move ${title} down`}>
            <ArrowDown />
          </Button>
          <Button type="button" variant="ghost" size="icon" className="size-8 text-muted-foreground hover:text-destructive" onClick={onRemove} aria-label={`Remove ${title}`}>
            <Trash2 />
          </Button>
        </div>
      </div>
      {children}
    </li>
  );
}

export function ContextEditor({ value, onChange, errors = {} }: P<ContextContent>) {
  const set = <K extends keyof ContextContent>(key: K, v: ContextContent[K]) => onChange({ ...value, [key]: v });
  return (
    <div className="space-y-6">
      <TextareaField
        id={fid("product_description")}
        label="Product or service"
        rows={4}
        placeholder="e.g. A budgeting app that helps freelancers plan for irregular income."
        hint="What is it, and what does it help people do?"
        error={errors.product_description}
        value={value.product_description}
        onChange={(e) => set("product_description", e.target.value)}
      />
      <TextareaField
        label="Business background"
        optional
        rows={3}
        placeholder="e.g. Seed-stage startup with 12,000 monthly users, aiming to improve activation."
        hint="Company stage, goals, constraints or anything stakeholders care about."
        value={value.business_background}
        onChange={(e) => set("business_background", e.target.value)}
      />
      <TextareaField
        label="Target audience"
        optional
        rows={3}
        placeholder="e.g. Freelance designers and developers who invoice clients."
        value={value.target_audience}
        onChange={(e) => set("target_audience", e.target.value)}
      />
      <TextField
        id={fid("industry")}
        label="Industry"
        optional
        placeholder="e.g. Fintech"
        value={value.industry}
        onChange={(e) => set("industry", e.target.value)}
      />
      <TextareaField
        label="Current problem or challenge"
        optional
        rows={3}
        placeholder="e.g. Half of new users leave before connecting a bank account."
        hint="What's going wrong, or what is unknown?"
        value={value.problem}
        onChange={(e) => set("problem", e.target.value)}
      />
    </div>
  );
}

export function GoalsEditor({ value, onChange, errors = {} }: P<GoalsContent>) {
  const set = <K extends keyof GoalsContent>(key: K, v: GoalsContent[K]) => onChange({ ...value, [key]: v });
  return (
    <div className="space-y-7">
      <TextareaField
        id={fid("primary_goal")}
        label="Primary research goal"
        rows={3}
        placeholder="e.g. Understand why freelancers drop off during onboarding."
        hint="The one thing this research must help you decide or understand."
        error={errors.primary_goal}
        value={value.primary_goal}
        onChange={(e) => set("primary_goal", e.target.value)}
      />
      <ListEditor
        id="objectives"
        label="Research objectives"
        hint="Optional. Specific things you want to find out or achieve."
        itemLabel="Objective"
        addLabel="Add objective"
        placeholder="e.g. Identify the main barriers to connecting a bank account"
        items={value.objectives}
        onChange={(v) => set("objectives", v)}
      />
      <div id={fid("research_questions")}>
        <ListEditor
          id="research-questions"
          label="Key research questions"
          hint="At least one is needed. Open questions work best."
          itemLabel="Research question"
          addLabel="Add question"
          placeholder="e.g. Why do users abandon onboarding?"
          items={value.research_questions}
          error={errors.research_questions}
          onChange={(v) => set("research_questions", v)}
        />
      </div>
      <ListEditor
        id="business-questions"
        label="Business questions"
        hint="Optional. Decisions or outcomes the business cares about."
        itemLabel="Business question"
        addLabel="Add business question"
        placeholder="e.g. How can we raise activation?"
        items={value.business_questions}
        onChange={(v) => set("business_questions", v)}
      />
      <ListEditor
        id="user-questions"
        label="User questions"
        hint="Optional. What you want to understand about people's behaviour, needs or attitudes."
        itemLabel="User question"
        addLabel="Add user question"
        placeholder="e.g. How do freelancers currently track their money?"
        items={value.user_questions}
        onChange={(v) => set("user_questions", v)}
      />
      <ListEditor
        id="desired-outcomes"
        label="Desired outcomes"
        hint="Optional. What you hope to have at the end."
        itemLabel="Outcome"
        addLabel="Add outcome"
        placeholder="e.g. A prioritised list of onboarding fixes"
        items={value.desired_outcomes}
        onChange={(v) => set("desired_outcomes", v)}
      />
    </div>
  );
}

export function ParticipantsEditor({
  value,
  onChange,
  errors = {},
  methods,
  needed,
}: P<ParticipantsContent> & { methods: MethodsContent; needed: boolean }) {
  const set = <K extends keyof ParticipantsContent>(key: K, v: ParticipantsContent[K]) => onChange({ ...value, [key]: v });
  const hints = sampleHints(methods.selected);
  return (
    <div className="space-y-6">
      {!needed && (
        <p role="note" className="rounded-lg border border-border bg-secondary px-4 py-3 text-sm text-muted-foreground">
          The methods you chose don&apos;t involve participants directly, so everything on this step is optional.
        </p>
      )}
      <TextareaField
        id={fid("profile")}
        label="Participant profile"
        optional={!needed}
        rows={3}
        placeholder="e.g. Freelancers with irregular income who have used a budgeting tool in the last year."
        hint="Describe what they do or need, not only who they are."
        error={errors.profile}
        value={value.profile}
        onChange={(e) => set("profile", e.target.value)}
      />
      <TextareaField
        label="Target user segment"
        optional
        rows={2}
        placeholder="e.g. New users in their first 30 days"
        value={value.segment}
        onChange={(e) => set("segment", e.target.value)}
      />
      <ListEditor
        id="inclusion"
        label="Inclusion criteria"
        hint="Optional. Everyone must meet these."
        itemLabel="Inclusion criterion"
        addLabel="Add criterion"
        placeholder="e.g. Freelances at least 20 hours a week"
        items={value.inclusion}
        onChange={(v) => set("inclusion", v)}
      />
      <ListEditor
        id="exclusion"
        label="Exclusion criteria"
        hint="Optional. Anyone meeting these is out."
        itemLabel="Exclusion criterion"
        addLabel="Add criterion"
        placeholder="e.g. Works for a competitor"
        items={value.exclusion}
        onChange={(v) => set("exclusion", v)}
      />
      <div className="space-y-2">
        <NumberField
          label="Number of participants"
          optional
          max={100000}
          placeholder="e.g. 8"
          value={value.count}
          onChange={(v) => set("count", v)}
        />
        {hints.length > 0 && (
          <div className="rounded-lg bg-secondary px-4 py-3 text-xs text-muted-foreground">
            <p className="mb-1 font-semibold text-foreground">Commonly cited ranges (rules of thumb, not requirements)</p>
            <ul className="list-disc space-y-1 pl-4">
              {hints.map((h) => (
                <li key={h.method}>
                  <span className="font-semibold">{h.method}:</span> {h.hint}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
      <TextareaField
        label="Recruitment method"
        optional
        rows={2}
        placeholder="e.g. Email invitation to customers, plus a recruitment panel for non-customers"
        value={value.recruitment_method}
        onChange={(e) => set("recruitment_method", e.target.value)}
      />
      <ListEditor
        id="screening"
        label="Screening questions"
        hint="Optional. Used to check people qualify, without hinting at the right answer."
        itemLabel="Screening question"
        addLabel="Add screening question"
        placeholder="e.g. How do you currently get paid for your work?"
        items={value.screening_questions}
        multiline
        onChange={(v) => set("screening_questions", v)}
      />
    </div>
  );
}

export function LogisticsEditor({ value, onChange }: P<LogisticsContent>) {
  const set = <K extends keyof LogisticsContent>(key: K, v: LogisticsContent[K]) => onChange({ ...value, [key]: v });
  return (
    <div className="space-y-7">
      <div className="grid gap-6 sm:grid-cols-2">
        <TextField
          label="Research duration"
          optional
          placeholder="e.g. 4 weeks"
          value={value.duration}
          onChange={(e) => set("duration", e.target.value)}
        />
        <NumberField
          label="Session duration (minutes)"
          optional
          max={1440}
          placeholder="e.g. 45"
          value={value.session_duration_minutes}
          onChange={(v) => set("session_duration_minutes", v)}
        />
      </div>
      <RowsEditor
        id="timeline"
        label="Estimated timeline"
        hint="Optional. Phases and when they happen."
        rowLabel="Timeline phase"
        addLabel="Add phase"
        rows={value.timeline}
        columns={[
          { key: "phase", label: "Phase", placeholder: "e.g. Recruit participants" },
          { key: "timing", label: "Timing", placeholder: "e.g. Week 1" },
        ]}
        createRow={() => ({ phase: "", timing: "" })}
        onChange={(v) => set("timeline", v)}
      />
      <ListEditor
        id="tools"
        label="Tools required"
        hint="Optional. For example video calls, recording, survey or analysis tools."
        itemLabel="Tool"
        addLabel="Add tool"
        placeholder="e.g. Zoom"
        items={value.tools}
        onChange={(v) => set("tools", v)}
      />
      <RowsEditor
        id="team"
        label="Team responsibilities"
        hint="Optional. Who does what."
        rowLabel="Team member"
        addLabel="Add role"
        rows={value.team}
        columns={[
          { key: "role", label: "Role", placeholder: "e.g. Lead researcher" },
          { key: "responsibility", label: "Responsibility", placeholder: "e.g. Moderates sessions", multiline: true },
        ]}
        createRow={() => ({ role: "", responsibility: "" })}
        onChange={(v) => set("team", v)}
      />
      <ListEditor
        id="deliverables"
        label="Deliverables"
        hint="Optional. What you will hand over."
        itemLabel="Deliverable"
        addLabel="Add deliverable"
        placeholder="e.g. Insights report"
        items={value.deliverables}
        onChange={(v) => set("deliverables", v)}
      />
      <RowsEditor
        id="risks"
        label="Risks and constraints"
        hint="Optional. Things that could get in the way, and how you will handle them."
        rowLabel="Risk"
        addLabel="Add risk"
        rows={value.risks}
        columns={[
          { key: "risk", label: "Risk or constraint", placeholder: "e.g. Low recruitment turnout", multiline: true },
          { key: "mitigation", label: "Mitigation", placeholder: "e.g. Over-recruit by 30%", multiline: true },
        ]}
        createRow={() => ({ risk: "", mitigation: "" })}
        onChange={(v) => set("risks", v)}
      />
    </div>
  );
}

export function InterviewGuideEditor({ value, onChange }: P<InterviewGuideContent>) {
  const setBlock = (i: number, patch: Partial<InterviewGuideContent["blocks"][number]>) =>
    onChange({ ...value, blocks: value.blocks.map((b, j) => (j === i ? { ...b, ...patch } : b)) });
  return (
    <div className="space-y-6">
      <TextareaField
        label="Introduction script"
        rows={8}
        value={value.introduction}
        onChange={(e) => onChange({ ...value, introduction: e.target.value })}
      />
      <ul className="space-y-4">
        {value.blocks.map((block, i) => (
          <ItemCard
            key={i}
            title={block.title.trim() || `Section ${i + 1}`}
            index={i}
            count={value.blocks.length}
            onMove={(to) => onChange({ ...value, blocks: reorder(value.blocks, i, to) })}
            onRemove={() => onChange({ ...value, blocks: value.blocks.filter((_, j) => j !== i) })}
          >
            <div className="grid gap-4 sm:grid-cols-[1fr_9rem]">
              <TextField label="Section title" value={block.title} onChange={(e) => setBlock(i, { title: e.target.value })} />
              <NumberField label="Minutes" min={0} max={600} optional value={block.minutes} onChange={(v) => setBlock(i, { minutes: v })} />
            </div>
            <ListEditor
              id={`guide-prompts-${i}`}
              label="Prompts"
              itemLabel={`Prompt in section ${i + 1}`}
              addLabel="Add prompt"
              multiline
              items={block.prompts}
              onChange={(v) => setBlock(i, { prompts: v })}
            />
          </ItemCard>
        ))}
      </ul>
      <Button type="button" variant="outline" size="sm" onClick={() => onChange({ ...value, blocks: [...value.blocks, { title: "", minutes: null, prompts: [""] }] })}>
        <Plus /> Add section
      </Button>
      <TextareaField
        label="Closing notes"
        rows={2}
        value={value.wrap_up}
        onChange={(e) => onChange({ ...value, wrap_up: e.target.value })}
      />
    </div>
  );
}

export function InterviewQuestionsEditor({ value, onChange }: P<InterviewQuestionsContent>) {
  const setQ = (i: number, patch: Partial<InterviewQuestionsContent["questions"][number]>) =>
    onChange({ questions: value.questions.map((q, j) => (j === i ? { ...q, ...patch } : q)) });
  return (
    <div className="space-y-4">
      <ul className="space-y-4">
        {value.questions.map((q, i) => (
          <ItemCard
            key={i}
            title={`Question ${i + 1}`}
            index={i}
            count={value.questions.length}
            onMove={(to) => onChange({ questions: reorder(value.questions, i, to) })}
            onRemove={() => onChange({ questions: value.questions.filter((_, j) => j !== i) })}
          >
            <TextareaField label="Question" rows={2} value={q.text} onChange={(e) => setQ(i, { text: e.target.value })} />
            <ListEditor id={`iq-probes-${i}`} label="Follow-up probes" itemLabel={`Probe for question ${i + 1}`} addLabel="Add probe" items={q.probes} onChange={(v) => setQ(i, { probes: v })} />
          </ItemCard>
        ))}
      </ul>
      <Button type="button" variant="outline" size="sm" onClick={() => onChange({ questions: [...value.questions, { text: "", probes: [] }] })}>
        <Plus /> Add question
      </Button>
    </div>
  );
}

export function SurveyEditor({ value, onChange }: P<SurveyQuestionsContent>) {
  const setQ = (i: number, patch: Partial<SurveyQuestionsContent["questions"][number]>) =>
    onChange({ questions: value.questions.map((q, j) => (j === i ? { ...q, ...patch } : q)) });
  return (
    <div className="space-y-4">
      <ul className="space-y-4">
        {value.questions.map((q, i) => (
          <ItemCard
            key={i}
            title={`Survey question ${i + 1}`}
            index={i}
            count={value.questions.length}
            onMove={(to) => onChange({ questions: reorder(value.questions, i, to) })}
            onRemove={() => onChange({ questions: value.questions.filter((_, j) => j !== i) })}
          >
            <TextareaField label="Question" rows={2} value={q.text} onChange={(e) => setQ(i, { text: e.target.value })} />
            <SelectField label="Answer type" value={q.type} onChange={(e) => setQ(i, { type: e.target.value as typeof q.type })}>
              {SURVEY_QUESTION_TYPES.map((t) => (
                <option key={t} value={t}>
                  {SURVEY_TYPE_LABELS[t]}
                </option>
              ))}
            </SelectField>
            {q.type !== "open" && (
              <ListEditor
                id={`survey-options-${i}`}
                label={q.type === "scale" ? "Scale labels (low to high)" : "Answer options"}
                itemLabel={`Option for survey question ${i + 1}`}
                addLabel="Add option"
                items={q.options}
                onChange={(v) => setQ(i, { options: v })}
              />
            )}
          </ItemCard>
        ))}
      </ul>
      <Button type="button" variant="outline" size="sm" onClick={() => onChange({ questions: [...value.questions, { text: "", type: "open", options: [] }] })}>
        <Plus /> Add question
      </Button>
    </div>
  );
}

export function UsabilityTasksEditor({ value, onChange }: P<UsabilityTasksContent>) {
  return (
    <RowsEditor
      id="usability-tasks"
      label="Tasks"
      hint="Describe what the participant should try to do and how you will judge success."
      rowLabel="Task"
      addLabel="Add task"
      rows={value.tasks}
      columns={[
        { key: "title", label: "Task name", placeholder: "e.g. Connect a bank account" },
        { key: "goal", label: "Participant's goal", multiline: true },
        { key: "success_criteria", label: "Success criteria", multiline: true },
      ]}
      createRow={() => ({ title: `Task ${value.tasks.length + 1}`, goal: "", success_criteria: "" })}
      onChange={(tasks) => onChange({ tasks })}
    />
  );
}

export function ScenariosEditor({ value, onChange }: P<TaskScenariosContent>) {
  return (
    <RowsEditor
      id="task-scenarios"
      label="Scenarios"
      hint="The short story you read to the participant before each task."
      rowLabel="Scenario"
      addLabel="Add scenario"
      rows={value.scenarios}
      columns={[
        { key: "title", label: "Task", placeholder: "e.g. Task 1" },
        { key: "scenario", label: "Scenario", multiline: true },
      ]}
      createRow={() => ({ title: `Task ${value.scenarios.length + 1}`, scenario: "" })}
      onChange={(scenarios) => onChange({ scenarios })}
    />
  );
}

export function QuestionListEditor({ value, onChange, label }: P<QuestionListContent> & { label: string }) {
  return (
    <ListEditor id={`qlist-${label}`} label={label} itemLabel="Question" addLabel="Add question" multiline items={value.questions} onChange={(questions) => onChange({ questions })} />
  );
}

export function ChecklistEditor({ value, onChange }: P<ChecklistContent>) {
  return (
    <ListEditor id="checklist" label="Things to observe" itemLabel="Checklist item" addLabel="Add item" items={value.items} onChange={(items) => onChange({ items })} />
  );
}

/** Edits any single section. Used by the wizard steps and the review step. */
export function SectionEditor({
  sectionKey,
  value,
  onChange,
  errors,
  ctx,
  participantsNeeded = true,
}: {
  sectionKey: SectionKey;
  value: AnySectionContent;
  onChange: (value: AnySectionContent) => void;
  errors?: Errors;
  ctx: EditorContext;
  participantsNeeded?: boolean;
}) {
  const common = { onChange: onChange as (v: unknown) => void, errors };
  switch (sectionKey) {
    case "context":
      return <ContextEditor {...common} value={value as ContextContent} />;
    case "goals":
      return <GoalsEditor {...common} value={value as GoalsContent} />;
    case "methods":
      return <MethodsEditor {...common} value={value as MethodsContent} goals={ctx.goals} />;
    case "participants":
      return <ParticipantsEditor {...common} value={value as ParticipantsContent} methods={ctx.methods} needed={participantsNeeded} />;
    case "logistics":
      return <LogisticsEditor {...common} value={value as LogisticsContent} />;
    case "interview_guide":
      return <InterviewGuideEditor {...common} value={value as InterviewGuideContent} />;
    case "interview_questions":
      return <InterviewQuestionsEditor {...common} value={value as InterviewQuestionsContent} />;
    case "survey_questions":
      return <SurveyEditor {...common} value={value as SurveyQuestionsContent} />;
    case "usability_tasks":
      return <UsabilityTasksEditor {...common} value={value as UsabilityTasksContent} />;
    case "task_scenarios":
      return <ScenariosEditor {...common} value={value as TaskScenariosContent} />;
    case "pre_test_questions":
      return <QuestionListEditor {...common} value={value as QuestionListContent} label="Pre-test questions" />;
    case "post_test_questions":
      return <QuestionListEditor {...common} value={value as QuestionListContent} label="Post-test questions" />;
    case "observation_checklist":
      return <ChecklistEditor {...common} value={value as ChecklistContent} />;
  }
}

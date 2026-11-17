import { AppWindow, ObsChip } from "@/components/marketing/mockups/parts";
import { cn } from "@/lib/utils";

type Note = { text: string; evidence?: string; hot?: boolean };

const QUADRANTS: { label: string; basis: string; notes: Note[]; className: string }[] = [
  { label: "Says", basis: "Observed", notes: [{ text: "“By Wednesday the plan is already wrong.”", evidence: "O3" }], className: "" },
  { label: "Thinks", basis: "Inferred", notes: [{ text: "I should just order in tonight." }], className: "" },
  { label: "Does", basis: "Observed", notes: [{ text: "Scrolled back to compare the total.", evidence: "O7", hot: true }], className: "" },
  { label: "Feels", basis: "Inferred", notes: [], className: "" },
];

function Quadrant({ label, basis, notes }: { label: string; basis: string; notes: Note[] }) {
  // The lower row starts a little lower so the subject medallion on the crosshair clears its heading.
  return (
    <div className={cn("min-w-0 bg-card p-3", (label === "Does" || label === "Feels") && "pt-6")}>
      <div className="flex items-center gap-2">
        <p className="font-display text-base leading-none">{label}</p>
        <span className={cn("rounded-full px-1.5 py-px text-[10px] font-semibold", basis === "Observed" ? "bg-primary-soft text-primary-text" : "border border-border-strong text-muted-foreground")}>{basis}</span>
      </div>
      <ul className="mt-2 space-y-1.5">
        {notes.map((n) => (
          <li key={n.text} className="rounded-md border border-border bg-background px-2 py-1.5 text-[11px] leading-snug">
            {n.text}
            <div className="mt-1 flex items-center gap-1.5">
              {n.evidence ? <ObsChip id={n.evidence} hot={n.hot} /> : <span className="rounded-full border border-dashed border-border-strong px-1.5 text-[10px] font-semibold text-muted-foreground">Assumed</span>}
            </div>
          </li>
        ))}
        {notes.length === 0 && (
          <li className="rounded-md border border-dashed border-border-strong px-2 py-1.5 text-[11px] text-muted-foreground">
            <span className="font-semibold text-foreground">Not yet researched.</span> A gap, not a finding.
          </li>
        )}
      </ul>
    </div>
  );
}

/** The classic cross, with the subject at the crosshair. Sample data, labelled as such by the frame. */
export function EmpathyPreview() {
  return (
    <AppWindow title="Empathy Mapper · Maya on a weeknight">
      <div className="relative p-4">
        <div className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-border bg-border">
          {QUADRANTS.map((q) => (
            <Quadrant key={q.label} label={q.label} basis={q.basis} notes={q.notes} />
          ))}
        </div>
        <span aria-hidden className="absolute top-1/2 left-1/2 flex size-10 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-background text-xs font-semibold">
          <span className="flex size-7 items-center justify-center rounded-full bg-primary text-[11px] text-primary-foreground">MP</span>
        </span>
      </div>
    </AppWindow>
  );
}

import { Quote } from "lucide-react";
import { EmotionIndicator } from "@/components/journeys/emotion";
import { curvePaths, curvePoints } from "@/lib/journeys/curve";
import { EMOTION_LABELS, ITEM_KIND_INFO, NOT_RATED, type Emotion, type ItemKind } from "@/lib/journeys/constants";
import type { ItemRow, StageRow } from "@/lib/journeys/schemas";
import { cn } from "@/lib/utils";

export const COLUMN_PX = 256;
const LABEL_PX = 128;
const CURVE_HEIGHT = 132;

const TONE = {
  default: "border-border bg-secondary",
  danger: "border-destructive/25 bg-destructive-soft",
  success: "border-success/25 bg-success-soft",
  info: "border-info/25 bg-info-soft",
} as const;

export function ItemChip({ item, large }: { item: ItemRow; large?: boolean }) {
  const info = ITEM_KIND_INFO[item.kind];
  const evidence = item.evidence_note?.trim();
  return (
    <li data-item={item.id} data-kind={item.kind} className={cn("rounded-lg border px-2.5 py-1.5 [overflow-wrap:anywhere]", large ? "text-base" : "text-sm", TONE[info.tone])}>
      {item.content}
      {(evidence || item.observation_id) && (
        <span className="mt-1 flex items-start gap-1 text-xs text-muted-foreground"><Quote aria-hidden className="mt-0.5 size-3 shrink-0" /><span><span className="sr-only">Evidence: </span>{evidence || "Linked to research evidence"}</span></span>
      )}
    </li>
  );
}

export const itemsFor = (items: ItemRow[], stageId: string, kind: ItemKind) => items.filter((i) => i.stage_id === stageId && i.kind === kind);

function ItemList({ items, large }: { items: ItemRow[]; large?: boolean }) {
  if (items.length === 0) return <span aria-label="None recorded" className="text-sm text-muted-foreground">—</span>;
  return <ul className="space-y-1.5">{items.map((i) => <ItemChip key={i.id} item={i} large={large} />)}</ul>;
}

/** The emotion curve across the stage columns. Unrated stages break the line instead of reading as neutral. */
export function EmotionCurve({ stages, columnWidth = COLUMN_PX, height = CURVE_HEIGHT }: { stages: StageRow[]; columnWidth?: number; height?: number }) {
  const points = curvePoints(stages, columnWidth, height);
  const width = Math.max(1, stages.length) * columnWidth;
  const summary = stages.map((s) => `${s.name}: ${s.emotion === null ? NOT_RATED : EMOTION_LABELS[s.emotion as Emotion]}`).join("; ");
  return (
    <svg role="img" aria-label={`Emotion curve. ${summary}`} viewBox={`0 0 ${width} ${height}`} width={width} height={height} className="block max-w-none text-primary">
      {[1, 2, 3, 4, 5].map((level) => {
        const y = 16 + ((5 - level) / 4) * (height - 32);
        return <line key={level} x1={0} x2={width} y1={y} y2={y} stroke="var(--border)" strokeDasharray={level === 3 ? "0" : "4 4"} />;
      })}
      {curvePaths(points).map((d, i) => <path key={i} d={d} fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" />)}
      {points.map((p) => (
        <circle key={p.index} cx={p.x} cy={p.y} r={6} fill="var(--background)" stroke="currentColor" strokeWidth={2.5} data-stage-index={p.index} data-emotion={p.emotion} />
      ))}
    </svg>
  );
}

const ROWS_BEFORE: ItemKind[] = ["action", "goal", "thought"];
const ROWS_AFTER: ItemKind[] = ["touchpoint", "channel", "pain_point", "opportunity", "evidence"];

/**
 * Stages run left to right, one column each. The map keeps every column at a readable width and
 * scrolls sideways inside its own frame rather than squeezing, so the page itself never scrolls.
 */
export function JourneyMap({ stages, items, showCurve }: { stages: StageRow[]; items: ItemRow[]; showCurve: boolean }) {
  const labelCell = "sticky left-0 z-10 w-32 min-w-32 border-b border-border bg-background px-3 py-3 text-left align-top text-xs font-semibold text-muted-foreground";
  const cell = "border-b border-border px-1.5 py-2 align-top";
  const itemRow = (kind: ItemKind) => (
    <tr key={kind} data-row={kind}>
      <th scope="row" className={labelCell}>{ITEM_KIND_INFO[kind].plural}</th>
      {stages.map((s) => <td key={s.id} className={cell} style={{ width: COLUMN_PX, minWidth: COLUMN_PX }}><ItemList items={itemsFor(items, s.id, kind)} /></td>)}
    </tr>
  );
  return (
    <div role="region" aria-label="Journey map" tabIndex={0} className="overflow-x-auto rounded-card border border-border bg-background outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50">
      <table className="border-separate border-spacing-0 text-left" style={{ minWidth: LABEL_PX + stages.length * COLUMN_PX }}>
        <caption className="sr-only">Journey map: stages in order, with what happens in each</caption>
        <thead>
          <tr>
            <th scope="col" className="sticky left-0 z-10 w-32 min-w-32 border-b border-border bg-background px-3 py-3 text-left text-xs font-semibold text-muted-foreground">Stage</th>
            {stages.map((s, i) => (
              <th key={s.id} scope="col" className="border-b border-border bg-secondary px-3 py-3 text-left align-top" style={{ width: COLUMN_PX, minWidth: COLUMN_PX }}>
                <span className="block text-xs font-semibold text-primary-text tabular-nums">Stage {i + 1}</span>
                <span className="block text-base font-bold [overflow-wrap:anywhere]">{s.name}</span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {ROWS_BEFORE.map(itemRow)}
          <tr data-row="emotion">
            <th scope="row" className={labelCell}>Emotion</th>
            {stages.map((s) => (
              <td key={s.id} className={cell}>
                <EmotionIndicator emotion={s.emotion} className="text-sm font-medium" />
                {s.emotion_note && <p className="mt-1 text-xs text-muted-foreground [overflow-wrap:anywhere]">{s.emotion_note}</p>}
              </td>
            ))}
          </tr>
          {showCurve && (
            <tr data-row="curve">
              <th scope="row" className={labelCell}>Emotion curve</th>
              <td colSpan={stages.length} className="border-b border-border p-0"><EmotionCurve stages={stages} /></td>
            </tr>
          )}
          {ROWS_AFTER.map(itemRow)}
        </tbody>
      </table>
    </div>
  );
}

const TABLE_KINDS: ItemKind[] = ["action", "goal", "thought", "touchpoint", "channel", "pain_point", "opportunity", "evidence"];

/** The same journey as rows and columns: one row per stage, easy to scan and copy. */
export function JourneyTable({ stages, items }: { stages: StageRow[]; items: ItemRow[] }) {
  return (
    <div role="region" aria-label="Journey table" tabIndex={0} className="overflow-x-auto rounded-card border border-border bg-card shadow-card outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50">
      <table className="w-full min-w-[72rem] border-collapse text-left text-sm">
        <caption className="sr-only">Journey stages and their contents</caption>
        <thead>
          <tr className="border-b border-border text-xs text-muted-foreground">
            <th scope="col" className="sticky left-0 z-10 w-44 min-w-44 bg-card px-3 py-2.5 font-semibold">Stage</th>
            <th scope="col" className="w-36 px-3 py-2.5 font-semibold">Emotion</th>
            {TABLE_KINDS.map((k) => <th key={k} scope="col" className="min-w-44 px-3 py-2.5 font-semibold">{ITEM_KIND_INFO[k].plural}</th>)}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {stages.map((s, i) => (
            <tr key={s.id} data-stage={s.id} className="align-top hover:bg-secondary/40">
              <th scope="row" className="sticky left-0 z-10 bg-card px-3 py-3 font-semibold [overflow-wrap:anywhere]"><span className="block text-xs font-semibold text-primary-text tabular-nums">Stage {i + 1}</span>{s.name}</th>
              <td className="px-3 py-3"><EmotionIndicator emotion={s.emotion} />{s.emotion_note && <p className="mt-1 text-xs text-muted-foreground [overflow-wrap:anywhere]">{s.emotion_note}</p>}</td>
              {TABLE_KINDS.map((k) => <td key={k} className="px-3 py-3"><ItemList items={itemsFor(items, s.id, k)} /></td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

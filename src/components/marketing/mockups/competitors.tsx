import { AppWindow, Tag } from "@/components/marketing/mockups/parts";
import { cn } from "@/lib/utils";

type Cell = { kind: "known" | "unknown" | "private" | "na"; value?: string; source?: string };

const ROWS: { criterion: string; cells: Cell[] }[] = [
  {
    criterion: "Guided first plan",
    cells: [{ kind: "known", value: "Yes", source: "S1" }, { kind: "known", value: "No", source: "S2" }, { kind: "unknown" }],
  },
  {
    criterion: "Offline access",
    cells: [{ kind: "private" }, { kind: "known", value: "Partial", source: "S2" }, { kind: "unknown" }],
  },
  {
    criterion: "Price shown early",
    cells: [{ kind: "known", value: "At checkout", source: "S1" }, { kind: "na" }, { kind: "known", value: "On plan", source: "S3" }],
  },
];

const LABEL = { unknown: "Unknown", private: "Not public", na: "N/A" } as const;

export function CompetitorsPreview() {
  return (
    <AppWindow title="Competitor Analyzer · Comparison matrix">
      <div className="p-4">
        <div className="overflow-hidden rounded-lg border border-border-strong text-xs">
          <div className="grid grid-cols-[1.2fr_repeat(3,1fr)] bg-muted font-bold">
            <div className="p-2">Criterion</div>
            {[
              ["Fennel", "Direct"],
              ["Cartly", "Indirect"],
              ["Notes app", "Substitute"],
            ].map(([n, t]) => (
              <div key={n} className="border-l border-border-strong p-2">
                {n}
                <span className="block text-xs font-semibold text-muted-foreground">{t}</span>
              </div>
            ))}
          </div>
          {ROWS.map((row) => (
            <div key={row.criterion} className="grid grid-cols-[1.2fr_repeat(3,1fr)] border-t border-border-strong">
              <div className="p-2 font-semibold">{row.criterion}</div>
              {row.cells.map((cell, i) => (
                <div
                  key={i}
                  className={cn(
                    "border-l border-border-strong p-2",
                    cell.kind === "unknown" && "bg-warning-soft/70",
                    cell.kind === "private" && "bg-muted",
                  )}
                >
                  {cell.kind === "known" ? (
                    <>
                      {cell.value} <span className="font-bold text-primary-text">{cell.source}</span>
                    </>
                  ) : (
                    <span className="text-muted-foreground italic">{LABEL[cell.kind]}</span>
                  )}
                </div>
              ))}
            </div>
          ))}
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
          <Tag tone="warning">2 gaps to research</Tag>
          <span className="text-muted-foreground">S1 fennel.example, retrieved 14 Oct 2026</span>
        </div>
      </div>
    </AppWindow>
  );
}

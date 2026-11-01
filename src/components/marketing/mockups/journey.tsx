import { AppWindow, ObsChip, Tag } from "@/components/marketing/mockups/parts";

const STAGES = ["Discover", "Sign up", "First plan", "Shop", "Cook"];
// Emotion 1..5 per stage; null breaks the line instead of reading as neutral.
const EMOTION: (number | null)[] = [4, 3, 1, null, 4];

function point(i: number, v: number) {
  return [10 + i * 20, 52 - (v - 1) * 10] as const;
}

export function JourneyPreview() {
  const segments: string[] = [];
  let current = "";
  EMOTION.forEach((v, i) => {
    if (v === null) {
      if (current) segments.push(current);
      current = "";
      return;
    }
    const [x, y] = point(i, v);
    current += `${current ? "L" : "M"} ${x} ${y} `;
  });
  if (current) segments.push(current);

  return (
    <AppWindow title="Journey Mapper · Current state">
      <div className="p-4">
        <div className="grid grid-cols-5 text-center text-xs font-bold">
          {STAGES.map((s) => (
            <span key={s} className="truncate px-0.5">{s}</span>
          ))}
        </div>
        <svg viewBox="0 0 100 62" className="mt-1 h-24 w-full" role="presentation">
          {[0, 1, 2, 3, 4].map((i) => (
            <line key={i} x1={10 + i * 20} x2={10 + i * 20} y1="4" y2="58" stroke="var(--border)" strokeWidth="0.5" />
          ))}
          {segments.map((d) => (
            <path key={d} d={d} fill="none" stroke="var(--primary)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          ))}
          {EMOTION.map((v, i) => {
            if (v === null) return null;
            const [x, y] = point(i, v);
            return <circle key={i} cx={x} cy={y} r="2.2" fill="var(--card)" stroke="var(--primary)" strokeWidth="1.2" />;
          })}
        </svg>
        <p className="text-center text-xs text-muted-foreground">Shop is not rated, so the curve breaks there.</p>
        <div className="mt-3 rounded-lg border border-border-strong p-3">
          <div className="flex flex-wrap items-center gap-1.5">
            <Tag tone="warning">Pain point</Tag>
            <span className="text-xs text-muted-foreground">First plan</span>
          </div>
          <p className="mt-1.5 text-[12px] font-semibold">Blank screen, no sense of where to begin.</p>
          <div className="mt-2 flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
              Evidence <ObsChip id="O7" hot />
            </span>
            <span className="rounded-md border border-border-strong px-2 py-0.5 text-xs font-semibold">Add to opportunities</span>
          </div>
        </div>
      </div>
    </AppWindow>
  );
}

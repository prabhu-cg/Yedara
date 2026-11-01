import type { StageRow } from "@/lib/journeys/schemas";

export type CurvePoint = { index: number; x: number; y: number; emotion: number };

/**
 * Where each rated stage sits on the emotion curve. Unrated stages have no point: the line breaks
 * there instead of pretending the feeling was neutral.
 */
export function curvePoints(stages: Pick<StageRow, "emotion">[], columnWidth: number, height: number, padding = 16): CurvePoint[] {
  const inner = Math.max(1, height - padding * 2);
  const points: CurvePoint[] = [];
  stages.forEach((s, index) => {
    if (s.emotion === null || s.emotion === undefined) return;
    points.push({ index, x: (index + 0.5) * columnWidth, y: padding + ((5 - s.emotion) / 4) * inner, emotion: s.emotion });
  });
  return points;
}

/** SVG path segments: one per run of consecutive rated stages. */
export function curvePaths(points: CurvePoint[]): string[] {
  const paths: string[] = [];
  let run: CurvePoint[] = [];
  const flush = () => {
    if (run.length > 1) {
      // Smooth through the points with a gentle horizontal curve between each pair.
      let d = `M ${run[0].x} ${run[0].y}`;
      for (let i = 1; i < run.length; i++) {
        const a = run[i - 1];
        const b = run[i];
        const mid = (a.x + b.x) / 2;
        d += ` C ${mid} ${a.y}, ${mid} ${b.y}, ${b.x} ${b.y}`;
      }
      paths.push(d);
    }
    run = [];
  };
  for (const p of points) {
    if (run.length && p.index !== run[run.length - 1].index + 1) flush();
    run.push(p);
  }
  flush();
  return paths;
}

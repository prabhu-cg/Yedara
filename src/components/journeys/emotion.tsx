import { Angry, Frown, Laugh, Meh, Smile, CircleSlash } from "lucide-react";
import { EMOTION_LABELS, NOT_RATED, type Emotion } from "@/lib/journeys/constants";
import { cn } from "@/lib/utils";

const ICONS = { 1: Angry, 2: Frown, 3: Meh, 4: Smile, 5: Laugh } as const;
const TONES: Record<Emotion, string> = { 1: "text-destructive", 2: "text-warning", 3: "text-muted-foreground", 4: "text-success", 5: "text-success" };

/** An icon and a word: the feeling is never carried by colour alone. */
export function EmotionIndicator({ emotion, className, showLabel = true }: { emotion: number | null; className?: string; showLabel?: boolean }) {
  if (emotion === null) {
    return <span className={cn("inline-flex items-center gap-1.5 text-muted-foreground", className)}><CircleSlash aria-hidden className="size-4" />{showLabel ? NOT_RATED : <span className="sr-only">{NOT_RATED}</span>}</span>;
  }
  const e = emotion as Emotion;
  const Icon = ICONS[e];
  return <span className={cn("inline-flex items-center gap-1.5", TONES[e], className)}><Icon aria-hidden className="size-4" />{showLabel ? <span className="text-foreground">{EMOTION_LABELS[e]}</span> : <span className="sr-only">{EMOTION_LABELS[e]}</span>}</span>;
}

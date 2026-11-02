"use client";

import * as React from "react";
import { ArrowLeft, ArrowRight, Maximize2, Minimize2 } from "lucide-react";
import { PersonaAvatar } from "@/components/personas/persona-avatar";
import { EmotionIndicator } from "@/components/journeys/emotion";
import { EmotionCurve, ItemChip, itemsFor } from "@/components/journeys/journey-views";
import { Button } from "@/components/ui/button";
import { ITEM_KIND_INFO, JOURNEY_STATE_LABELS, JOURNEY_TYPE_LABELS, type ItemKind, type JourneyState, type JourneyType } from "@/lib/journeys/constants";
import type { ItemRow, StageRow } from "@/lib/journeys/schemas";

const KINDS: ItemKind[] = ["action", "goal", "thought", "touchpoint", "channel", "pain_point", "opportunity", "evidence"];

/** One slide per stage, after an overview. Arrow keys move between slides; full screen is optional. */
export function JourneyPresentation({ name, scenario, type, state, personaName, personaAvatar, stages, items }: { name: string; scenario: string | null; type: JourneyType; state: JourneyState; personaName: string | null; personaAvatar?: string; stages: StageRow[]; items: ItemRow[] }) {
  const [slide, setSlide] = React.useState(0); // 0 = overview, 1..n = stages
  const [full, setFull] = React.useState(false);
  const frame = React.useRef<HTMLDivElement>(null);
  const last = stages.length;
  const go = React.useCallback((to: number) => setSlide(Math.max(0, Math.min(last, to))), [last]);

  React.useEffect(() => {
    const sync = () => setFull(document.fullscreenElement === frame.current);
    document.addEventListener("fullscreenchange", sync);
    return () => document.removeEventListener("fullscreenchange", sync);
  }, []);

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowRight" || e.key === "PageDown") { e.preventDefault(); go(slide + 1); }
    if (e.key === "ArrowLeft" || e.key === "PageUp") { e.preventDefault(); go(slide - 1); }
    if (e.key === "Home") { e.preventDefault(); go(0); }
    if (e.key === "End") { e.preventDefault(); go(last); }
  };

  const toggleFull = async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await frame.current?.requestFullscreen();
    } catch { /* full screen is optional */ }
  };

  const stage = slide > 0 ? stages[slide - 1] : null;

  return (
    <div ref={frame} role="region" aria-roledescription="presentation" aria-label="Journey presentation" tabIndex={0} onKeyDown={onKey} className="flex min-h-[28rem] flex-col rounded-card border border-border bg-background outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50">
      <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-2.5">
        <p className="text-sm text-muted-foreground tabular-nums" aria-live="polite">{slide === 0 ? "Overview" : `Stage ${slide} of ${last}`}</p>
        <Button type="button" variant="ghost" size="sm" onClick={toggleFull} aria-label={full ? "Exit full screen" : "Full screen"}>{full ? <Minimize2 /> : <Maximize2 />}{full ? "Exit" : "Full screen"}</Button>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-6 sm:px-10 sm:py-10">
        {stage === null ? (
          <div className="mx-auto max-w-4xl space-y-6">
            <p className="text-sm font-semibold text-primary-text">{JOURNEY_TYPE_LABELS[type]} · {JOURNEY_STATE_LABELS[state]}</p>
            <h2 className="text-4xl leading-tight font-bold [overflow-wrap:anywhere]">{name}</h2>
            {personaName && (
              <p className="flex items-center gap-3 text-lg text-muted-foreground">
                <PersonaAvatar avatarId={personaAvatar ?? ""} name={personaName} decorative className="size-10 text-sm" />
                Persona: {personaName}
              </p>
            )}
            {scenario && <p className="max-w-prose text-lg leading-relaxed [overflow-wrap:anywhere]">{scenario}</p>}
            {stages.length > 0 ? (
              <>
                <ol className="flex flex-wrap gap-2">
                  {stages.map((s, i) => <li key={s.id}><button type="button" onClick={() => go(i + 1)} className="rounded-full border border-border bg-secondary px-3 py-1 text-sm font-medium hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring">{i + 1}. {s.name}</button></li>)}
                </ol>
                <div className="overflow-x-auto"><EmotionCurve stages={stages} columnWidth={Math.max(96, Math.min(180, 880 / stages.length))} height={140} /></div>
              </>
            ) : <p className="text-muted-foreground">This journey has no stages yet.</p>}
          </div>
        ) : (
          <div className="mx-auto max-w-4xl space-y-6">
            <div className="space-y-1">
              <p className="text-sm font-semibold text-primary-text tabular-nums">Stage {slide}</p>
              <h2 className="text-4xl leading-tight font-bold [overflow-wrap:anywhere]">{stage.name}</h2>
              <div className="pt-2 text-lg"><EmotionIndicator emotion={stage.emotion} />{stage.emotion_note && <span className="ml-3 text-base text-muted-foreground">{stage.emotion_note}</span>}</div>
            </div>
            <div className="grid gap-x-10 gap-y-6 md:grid-cols-2">
              {KINDS.map((k) => {
                const list = itemsFor(items, stage.id, k);
                if (!list.length) return null;
                return (
                  <section key={k} aria-label={ITEM_KIND_INFO[k].plural} className="space-y-2">
                    <h3 className="text-sm font-semibold text-muted-foreground">{ITEM_KIND_INFO[k].plural}</h3>
                    <ul className="space-y-2">{list.map((i) => <ItemChip key={i.id} item={i} large />)}</ul>
                  </section>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between gap-3 border-t border-border px-4 py-3">
        <Button type="button" variant="outline" onClick={() => go(slide - 1)} disabled={slide === 0}><ArrowLeft /> Previous</Button>
        <p className="hidden text-xs text-muted-foreground sm:block">Use the arrow keys to move between stages</p>
        <Button type="button" onClick={() => go(slide + 1)} disabled={slide === last}>Next <ArrowRight /></Button>
      </div>
    </div>
  );
}

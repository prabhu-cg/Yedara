import { Info } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { PERSONA_TYPE_INFO, type PersonaType } from "@/lib/personas/constants";
import { evidenceStatement, type EvidenceSummary } from "@/lib/personas/validation";
import { cn } from "@/lib/utils";

/** The persona's type, always visible so a hypothesis is never mistaken for research. */
export function PersonaTypeBadge({ type, className }: { type: PersonaType; className?: string }) {
  const info = PERSONA_TYPE_INFO[type];
  return (
    <Badge variant={info.badge} className={className} data-persona-type={type}>
      {info.label}
    </Badge>
  );
}

/** The standing notice and an honest one-line statement of what the persona rests on. */
export function PersonaTypeNotice({ type, summary }: { type: PersonaType; summary: EvidenceSummary }) {
  const info = PERSONA_TYPE_INFO[type];
  const tone = { success: "border-success/30 bg-success-soft", warning: "border-warning/30 bg-warning-soft", info: "border-info/30 bg-info-soft" }[info.badge];
  return (
    <div role="note" aria-label={`${info.label} persona`} className={cn("flex gap-3 rounded-xl border p-4 text-sm", tone)}>
      <Info aria-hidden className="mt-0.5 size-4 shrink-0" />
      <div className="space-y-1">
        <p className="font-semibold">{info.label} persona</p>
        <p>{info.notice}</p>
        <p className="text-muted-foreground">{evidenceStatement(type, summary)}</p>
      </div>
    </div>
  );
}

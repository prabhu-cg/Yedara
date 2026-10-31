import { WORK_KINDS, type WorkKind } from "@/config/work-kinds";
import { cn } from "@/lib/utils";

/** Which tool made this: icon plus name, quiet so the status badge stays the one coloured mark. */
export function WorkKindTag({ kind, short, className }: { kind: WorkKind; short?: boolean; className?: string }) {
  const { label, short: shortLabel, icon: Icon } = WORK_KINDS[kind];
  return (
    <span data-kind={kind} className={cn("inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground", className)}>
      <Icon aria-hidden className="size-3.5 shrink-0" />
      {short ? shortLabel : label}
    </span>
  );
}

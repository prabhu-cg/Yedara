import { MousePointer2 } from "lucide-react";

/** A word picked out the way a design tool selects it: an outline, corner handles and a pointer. */
export function PointerHighlight({ children }: { children: React.ReactNode }) {
  return (
    <span className="relative mx-1 inline-block px-2.5 text-primary-text">
      <span aria-hidden className="pointer-events-none absolute inset-0 rounded-md border-2 border-primary/55">
        <span className="absolute -top-1 -left-1 size-2 rounded-[2px] border border-primary bg-card" />
        <span className="absolute -top-1 -right-1 size-2 rounded-[2px] border border-primary bg-card" />
        <span className="absolute -bottom-1 -left-1 size-2 rounded-[2px] border border-primary bg-card" />
        <span className="absolute -right-1 -bottom-1 size-2 rounded-[2px] border border-primary bg-card" />
        <MousePointer2 className="absolute -right-4 -bottom-5 size-5 fill-primary text-primary" />
      </span>
      {children}
    </span>
  );
}

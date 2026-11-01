import { Quote } from "lucide-react";
import { AppWindow, Tag } from "@/components/marketing/mockups/parts";

function List({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <p className="text-xs font-bold tracking-wide text-muted-foreground uppercase">{title}</p>
      <ul className="mt-1.5 space-y-1 text-[12px]">
        {items.map((item) => (
          <li key={item} className="flex gap-1.5">
            <span aria-hidden className="mt-[7px] size-1 shrink-0 rounded-full bg-foreground/50" />
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function PersonaPreview() {
  return (
    <AppWindow title="Persona Builder · Maya">
      <div className="p-4">
        <div className="flex items-start gap-3">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-charcoal text-sm font-bold text-charcoal-foreground">
            MP
          </span>
          <div className="min-w-0">
            <p className="text-[15px] font-extrabold tracking-tight">Maya, the weeknight planner</p>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              <Tag tone="success">Research-backed</Tag>
              <Tag tone="outline">4 evidence items</Tag>
            </div>
          </div>
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <List title="Goals" items={["Decide dinner in under ten minutes", "Waste less of what she buys"]} />
          <List title="Pain points" items={["Plans fall apart midweek", "Can't tell what's already in the fridge"]} />
        </div>
        <blockquote className="mt-4 rounded-lg bg-muted p-3 text-[12px]">
          <Quote className="mb-1 size-3.5 text-primary-text" />
          “By Wednesday the plan is already wrong.”
          <footer className="mt-1.5 text-xs font-semibold text-muted-foreground">Source: P3, interview</footer>
        </blockquote>
        <p className="mt-3 text-xs text-muted-foreground">Demographics hidden: no recorded reason to include them.</p>
      </div>
    </AppWindow>
  );
}

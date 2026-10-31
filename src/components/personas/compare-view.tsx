import Link from "next/link";
import { Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { PersonaTypeBadge } from "@/components/personas/persona-type";
import { buildComparison, type ComparablePersona } from "@/lib/personas/compare";

/** Personas side by side. Rows are attributes, columns are personas; shared items are called out. */
export function CompareView({ personas }: { personas: ComparablePersona[] }) {
  const { rows, common } = buildComparison(personas);
  const commonRows = rows.filter((r) => common[r.key]);

  return (
    <div className="space-y-6">
      {personas.length > 1 && (
        <section aria-label="Common to all" className="rounded-xl border border-border bg-secondary p-4 sm:p-5">
          <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold"><Sparkles aria-hidden className="size-4 text-primary-text" /> Common to all {personas.length} personas</h2>
          {commonRows.length === 0 ? (
            <p className="text-sm text-muted-foreground">No identical goals, pain points or other list items are shared. Items are matched on their exact wording.</p>
          ) : (
            <dl className="space-y-3 text-sm">
              {commonRows.map((r) => (
                <div key={r.key}>
                  <dt className="font-semibold">{r.label}</dt>
                  <dd><ul className="list-disc pl-5 text-muted-foreground">{common[r.key].map((i) => <li key={i}>{i}</li>)}</ul></dd>
                </div>
              ))}
            </dl>
          )}
        </section>
      )}

      <div className="overflow-x-auto rounded-card border border-border bg-card shadow-card" tabIndex={0} role="region" aria-label="Persona comparison table">
        <table className="w-full min-w-[40rem] border-collapse text-left text-sm">
          <caption className="sr-only">Comparison of {personas.map((p) => p.name).join(", ")}</caption>
          <thead>
            <tr className="border-b border-border bg-secondary">
              <th scope="col" className="w-40 px-4 py-3 text-xs font-semibold text-muted-foreground">Attribute</th>
              {personas.map((p) => (
                <th key={p.id} scope="col" className="min-w-52 px-4 py-3 align-top">
                  <Link href={`/tools/persona-builder/${p.id}`} className="font-semibold hover:text-primary-text hover:underline [overflow-wrap:anywhere]">{p.name}</Link>
                  <span className="mt-1.5 flex flex-wrap items-center gap-1.5">
                    <PersonaTypeBadge type={p.type} />
                    {p.projectName && <Badge variant="outline">{p.projectName}</Badge>}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.key} className="border-b border-border align-top last:border-0">
                <th scope="row" className="px-4 py-3 text-xs font-semibold text-muted-foreground">{row.label}</th>
                {row.cells.map((cell, i) => (
                  <td key={personas[i].id} className="px-4 py-3 [overflow-wrap:anywhere]">
                    {row.kind === "text" ? (
                      cell || <span className="text-muted-foreground">Not provided</span>
                    ) : (cell as string[]).length ? (
                      <ul className="list-disc space-y-1 pl-4">
                        {(cell as string[]).map((item, n) => (
                          <li key={n} className={common[row.key]?.some((c) => c.trim().toLowerCase() === item.trim().toLowerCase()) ? "font-medium" : undefined}>{item}</li>
                        ))}
                      </ul>
                    ) : (
                      <span className="text-muted-foreground">Not provided</span>
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-muted-foreground">
        &ldquo;Not provided&rdquo; means nothing was entered. It does not mean the persona lacks it. Compare persona types before comparing content: a hypothesis and a research-backed persona do not carry the same weight.
      </p>
    </div>
  );
}

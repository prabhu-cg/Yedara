import { FRAME } from "@/components/marketing/frame";

export const LEGAL_UPDATED = "1 November 2026";

export type LegalSection = { id: string; title: string; body: (string | string[])[] };

/** Long-form legal text: one readable column with a contents list. Arrays render as bullet lists. */
export function LegalDocument({ title, intro, sections }: { title: string; intro: string; sections: LegalSection[] }) {
  return (
    <div className={`${FRAME} pt-16 pb-24 sm:pt-24`}>
      <header className="max-w-3xl">
        <h1 className="text-[clamp(2.25rem,5.5vw,3.75rem)] leading-[1.02] font-extrabold tracking-[-0.035em]">{title}</h1>
        <p className="mt-4 text-sm font-semibold text-muted-foreground">Last updated {LEGAL_UPDATED}</p>
        <p className="mt-6 text-lg text-muted-foreground">{intro}</p>
      </header>
      <div className="mt-14 grid gap-12 lg:grid-cols-12">
        <nav aria-label="Contents" className="lg:col-span-3">
          <ol className="space-y-2 text-[15px] lg:sticky lg:top-28">
            {sections.map((s) => (
              <li key={s.id}>
                <a href={`#${s.id}`} className="text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">
                  {s.title}
                </a>
              </li>
            ))}
          </ol>
        </nav>
        <div className="max-w-[68ch] space-y-12 lg:col-span-9">
          {sections.map((s) => (
            <section key={s.id} id={s.id} aria-labelledby={`${s.id}-h`} className="scroll-mt-28">
              <h2 id={`${s.id}-h`} className="text-2xl font-extrabold tracking-tight">
                {s.title}
              </h2>
              <div className="mt-4 space-y-4 leading-relaxed">
                {s.body.map((block, i) =>
                  Array.isArray(block) ? (
                    <ul key={i} className="list-disc space-y-2 pl-5 marker:text-primary-text">
                      {block.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  ) : (
                    <p key={i}>{block}</p>
                  ),
                )}
              </div>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}

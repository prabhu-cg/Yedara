export const LEGAL_UPDATED = "17 November 2026";

export type LegalSection = { id: string; title: string; body: (string | string[])[] };

/**
 * About, Privacy and Terms share one layout, the same as Doxa: the desk ground, a `max-w-3xl` column, an
 * optional small soft badge, a Newsreader title, a subtitle or "Last updated" line, then the whole
 * document in one white 20px card with a hairline.
 */
export function LegalPageShell({
  badge,
  title,
  subtitle,
  updated,
  children,
}: {
  badge?: string;
  title: string;
  subtitle?: string;
  updated?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-surface">
      <div className="mx-auto w-full max-w-3xl px-4 py-16 sm:px-6 sm:py-20">
        <header>
          {badge && (
            <span className="mb-3 inline-flex items-center rounded-full bg-primary-soft px-2.5 py-0.5 text-xs font-semibold text-primary-text">
              {badge}
            </span>
          )}
          <h1 className="text-4xl text-foreground sm:text-5xl">{title}</h1>
          {subtitle && <p className="mt-3 text-base text-muted-foreground">{subtitle}</p>}
          {updated && <p className="mt-3 text-sm text-muted-foreground">Last updated {updated}</p>}
        </header>
        <div className="doc-card mt-10 rounded-card border bg-card p-6 text-sm leading-relaxed text-muted-foreground sm:p-8 [&_a]:font-medium [&_a]:text-primary-text [&_a]:underline [&_a]:underline-offset-4 [&_a:hover]:no-underline [&_h2]:mt-8 [&_h2]:mb-3 [&_h2]:text-base [&_h2]:text-foreground [&_h2:first-child]:mt-0 [&_li+li]:mt-1.5 [&_p+p]:mt-3 [&_p+ul]:mt-3 [&_section+section]:mt-8 [&_section>h2]:mt-0 [&_ul]:list-disc [&_ul]:space-y-1.5 [&_ul]:pl-5 [&_ul+p]:mt-3">
          {children}
        </div>
      </div>
    </div>
  );
}

/** A titled section inside the document card, used by About. Its title is DM Sans 16px 600 (`.doc-card h2`). */
export function DocSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2>{title}</h2>
      {children}
    </section>
  );
}

/** Long-form legal text from data, as flat headings, paragraphs and bullet lists like Doxa's. */
export function LegalSections({ sections }: { sections: LegalSection[] }) {
  return (
    <>
      {sections.map((s) => (
        <LegalBlock key={s.id} section={s} />
      ))}
    </>
  );
}

function LegalBlock({ section }: { section: LegalSection }) {
  return (
    <>
      <h2>{section.title}</h2>
      {section.body.map((block, i) =>
        Array.isArray(block) ? (
          <ul key={i}>
            {block.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        ) : (
          <p key={i}>{block}</p>
        ),
      )}
    </>
  );
}

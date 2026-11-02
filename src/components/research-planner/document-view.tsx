import Image from "next/image";
import type { Block, ListItem, PlanDocument } from "@/lib/research-planner/document";
import { cn } from "@/lib/utils";

function ListView({ ordered, items }: { ordered: boolean; items: ListItem[] }) {
  const Tag = ordered ? "ol" : "ul";
  return (
    <Tag className={cn("my-2 space-y-1 pl-6", ordered ? "list-decimal" : "list-disc")}>
      {items.map((item, i) => (
        <li key={i} className="[overflow-wrap:anywhere]">
          {typeof item === "string" ? item : item.text}
          {typeof item !== "string" && item.children.length > 0 && (
            <ul className="mt-1 list-[circle] space-y-0.5 pl-5 text-muted-foreground">
              {item.children.map((c, j) => (
                <li key={j}>{c}</li>
              ))}
            </ul>
          )}
        </li>
      ))}
    </Tag>
  );
}

export function BlocksView({ blocks }: { blocks: Block[] }) {
  return (
    <div className="space-y-2 text-sm leading-relaxed">
      {blocks.map((block, i) => {
        if (block.type === "heading") {
          return (
            <h4 key={i} className="pt-3 text-sm font-semibold text-foreground first:pt-0">
              {block.text}
            </h4>
          );
        }
        if (block.type === "paragraph") {
          return (
            <p key={i} className="whitespace-pre-line [overflow-wrap:anywhere]">
              {block.text}
            </p>
          );
        }
        if (block.type === "list") return <ListView key={i} ordered={block.ordered} items={block.items} />;
        return (
          <div key={i} className="my-2 overflow-x-auto rounded-lg border border-border">
            <table className="w-full min-w-[28rem] border-collapse text-left text-sm">
              <thead className="bg-secondary">
                <tr>
                  {block.headers.map((h) => (
                    <th key={h} scope="col" className="px-3 py-2 font-semibold">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {block.rows.map((row, r) => (
                  <tr key={r} className="border-t border-border align-top">
                    {block.headers.map((_, c) => (
                      <td key={c} className="px-3 py-2 [overflow-wrap:anywhere]">
                        {row[c]}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      })}
    </div>
  );
}

/** On-screen preview of the exported document (same model as the PDF/DOCX/Markdown). */
export function DocumentView({ doc }: { doc: PlanDocument }) {
  return (
    <article aria-label="Document preview" className="mx-auto max-w-3xl rounded-card border border-border bg-background p-6 sm:p-10 shadow-card">
      <header className="mb-8 border-b border-border pb-8">
        {doc.image && (
          <figure className="mb-6 flex items-center gap-4">
            <Image src={doc.image.src} alt={doc.image.alt} width={160} height={160} className="size-20 shrink-0 rounded-full border border-border bg-muted object-cover" />
            <figcaption className="max-w-[44ch] text-xs text-muted-foreground">{doc.image.caption}</figcaption>
          </figure>
        )}
        <p className="text-xs font-semibold text-primary-text">{doc.kicker}</p>
        <h2 className="mt-3 text-[28px] leading-tight font-bold [overflow-wrap:anywhere]">{doc.title}</h2>
        {doc.meta.length > 0 && (
          <dl className="mt-6 grid gap-x-6 gap-y-2 text-sm sm:grid-cols-[8rem_1fr]">
            {doc.meta.map((m) => (
              <div key={m.label} className="contents">
                <dt className="text-muted-foreground">{m.label}</dt>
                <dd className="font-semibold [overflow-wrap:anywhere]">{m.value}</dd>
              </div>
            ))}
          </dl>
        )}
      </header>
      {doc.sections.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nothing to show yet. Fill in some sections and they will appear here.</p>
      ) : (
        <div className="space-y-10">
          {doc.sections.map((section) => (
            <section key={section.key} aria-labelledby={`preview-${section.key}`}>
              <h3 id={`preview-${section.key}`} className="mb-3 border-b border-border pb-2 text-base font-bold text-primary-text">
                {section.title}
              </h3>
              <BlocksView blocks={section.blocks} />
            </section>
          ))}
        </div>
      )}
    </article>
  );
}

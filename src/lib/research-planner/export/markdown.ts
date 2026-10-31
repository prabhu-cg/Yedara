import type { Block, ListItem, PlanDocument } from "@/lib/research-planner/document";

/** Escapes Markdown syntax that would otherwise change meaning at the start of a line. */
function escapeLine(line: string) {
  return line
    .replace(/^(\s*)([#>+*-])(\s)/, "$1\\$2$3")
    .replace(/^(\s*)(\d+)([.)])(\s)/, "$1$2\\$3$4")
    .replace(/^(\s*)(```|~~~)/, "$1\\$2");
}

function paragraph(textValue: string) {
  return textValue
    .trim()
    .split(/\n{2,}/)
    .map((para) => para.split("\n").map((l) => escapeLine(l.trim())).join("  \n"))
    .join("\n\n");
}

const cell = (value: string) => value.replace(/\s*\n\s*/g, " ").replace(/\|/g, "\\|").trim();

function listItem(item: ListItem, marker: string) {
  if (typeof item === "string") return `${marker} ${item.replace(/\s*\n\s*/g, " ").trim()}`;
  const children = item.children.map((c) => `    - ${c.replace(/\s*\n\s*/g, " ").trim()}`);
  return [`${marker} ${item.text.replace(/\s*\n\s*/g, " ").trim()}`, ...children].join("\n");
}

function block(b: Block): string {
  switch (b.type) {
    case "heading":
      return `### ${b.text.replace(/\s+/g, " ").trim()}`;
    case "paragraph":
      return paragraph(b.text);
    case "list":
      return b.items.map((item, i) => listItem(item, b.ordered ? `${i + 1}.` : "-")).join("\n");
    case "table": {
      const head = `| ${b.headers.map(cell).join(" | ")} |`;
      const rule = `| ${b.headers.map(() => "---").join(" | ")} |`;
      const rows = b.rows.map((r) => `| ${r.map(cell).join(" | ")} |`);
      return [head, rule, ...rows].join("\n");
    }
  }
}

/** Clean, portable Markdown: ATX headings, lists and pipe tables only. */
export function renderMarkdown(doc: PlanDocument): string {
  const parts: string[] = [`# ${doc.title.replace(/\s+/g, " ").trim()}`];
  parts.push(`*${doc.kicker}*`);
  if (doc.meta.length) {
    parts.push(doc.meta.map((m) => `- **${m.label}:** ${m.value.replace(/\s*\n\s*/g, " ").trim()}`).join("\n"));
  }
  for (const section of doc.sections) {
    parts.push(`## ${section.title}`);
    for (const b of section.blocks) parts.push(block(b));
  }
  return `${parts.join("\n\n")}\n`;
}

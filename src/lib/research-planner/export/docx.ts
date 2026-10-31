import {
  AlignmentType,
  BorderStyle,
  Document,
  Footer,
  HeadingLevel,
  LevelFormat,
  Packer,
  PageNumber,
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
  type ParagraphChild,
} from "docx";
import type { Block, ListItem, PlanDocument } from "@/lib/research-planner/document";

const FONT = "Calibri";
const PRIMARY = "C74504";
const TEXT = "444444";
const MUTED = "777777";
const BORDER = "D9D9D6";
const HEAD_FILL = "F8F8F7";
/** A4 with 2.54cm margins leaves 9026 twips of content width. */
const CONTENT_WIDTH = 9026;

function runs(value: string, options: { bold?: boolean; size?: number; color?: string } = {}): TextRun[] {
  return value.split("\n").map(
    (line, i) =>
      new TextRun({ text: line, break: i === 0 ? undefined : 1, font: FONT, bold: options.bold, size: options.size, color: options.color }),
  );
}

function weights(headers: string[]) {
  if (headers.length === 2) return [30, 70];
  if (headers.length === 3) return [22, 43, 35];
  if (headers[0] === "#") return [6, 34, 30, 30];
  return headers.map(() => 100 / headers.length);
}

const thin = { style: BorderStyle.SINGLE, size: 4, color: BORDER } as const;
const cellBorders = { top: thin, bottom: thin, left: thin, right: thin };

function tableBlock(headers: string[], rows: string[][]) {
  const w = weights(headers);
  const widths = w.map((p) => Math.round((CONTENT_WIDTH * p) / 100));
  const mk = (value: string, i: number, header: boolean) =>
    new TableCell({
      width: { size: widths[i], type: WidthType.DXA },
      borders: cellBorders,
      shading: header ? { type: ShadingType.CLEAR, fill: HEAD_FILL, color: "auto" } : undefined,
      margins: { top: 80, bottom: 80, left: 110, right: 110 },
      children: [new Paragraph({ children: runs(value, { bold: header, size: 21 }), spacing: { after: 0 } })],
    });
  return new Table({
    width: { size: CONTENT_WIDTH, type: WidthType.DXA },
    columnWidths: widths,
    rows: [
      new TableRow({ tableHeader: true, cantSplit: true, children: headers.map((h, i) => mk(h, i, true)) }),
      ...rows.map((r) => new TableRow({ cantSplit: true, children: headers.map((_, i) => mk(r[i] ?? "", i, false)) })),
    ],
  });
}

function buildBlocks(blocks: Block[], nextNumbering: () => number) {
  const out: (Paragraph | Table)[] = [];
  for (const b of blocks) {
    if (b.type === "heading") {
      out.push(new Paragraph({ heading: HeadingLevel.HEADING_2, keepNext: true, children: runs(b.text) }));
    } else if (b.type === "paragraph") {
      b.text
        .trim()
        .split(/\n{2,}/)
        .forEach((para) => out.push(new Paragraph({ children: runs(para.trim()), spacing: { after: 120 } })));
    } else if (b.type === "list") {
      const instance = b.ordered ? nextNumbering() : 0;
      const ref = b.ordered ? "numbered" : "bullets";
      b.items.forEach((item: ListItem) => {
        const text = typeof item === "string" ? item : item.text;
        out.push(new Paragraph({ numbering: { reference: ref, level: 0, instance }, children: runs(text), spacing: { after: 60 } }));
        if (typeof item !== "string") {
          item.children.forEach((child) =>
            out.push(new Paragraph({ numbering: { reference: "bullets", level: 1 }, children: runs(child, { color: MUTED }), spacing: { after: 40 } })),
          );
        }
      });
      out.push(new Paragraph({ children: [], spacing: { after: 80 } }));
    } else {
      out.push(tableBlock(b.headers, b.rows));
      out.push(new Paragraph({ children: [], spacing: { after: 160 } }));
    }
  }
  return out;
}

export async function renderDocx(doc: PlanDocument): Promise<Buffer> {
  let numbering = 0;
  const nextNumbering = () => ++numbering;

  const coverMeta = doc.meta.length
    ? [
        new Table({
          width: { size: CONTENT_WIDTH, type: WidthType.DXA },
          columnWidths: [2400, CONTENT_WIDTH - 2400],
          borders: {
            top: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
            bottom: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
            left: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
            right: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
            insideHorizontal: { style: BorderStyle.SINGLE, size: 4, color: BORDER },
            insideVertical: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
          },
          rows: doc.meta.map(
            (m) =>
              new TableRow({
                children: [
                  new TableCell({
                    width: { size: 2400, type: WidthType.DXA },
                    margins: { top: 100, bottom: 100, left: 0, right: 100 },
                    children: [new Paragraph({ children: runs(m.label, { color: MUTED, size: 21 }), spacing: { after: 0 } })],
                  }),
                  new TableCell({
                    width: { size: CONTENT_WIDTH - 2400, type: WidthType.DXA },
                    margins: { top: 100, bottom: 100, left: 0, right: 0 },
                    children: [new Paragraph({ children: runs(m.value, { bold: true, size: 21 }), spacing: { after: 0 } })],
                  }),
                ],
              }),
          ),
        }),
      ]
    : [];

  const children: (Paragraph | Table)[] = [
    new Paragraph({ spacing: { before: 2400, after: 160 }, children: runs(doc.kicker.toUpperCase(), { color: PRIMARY, bold: true, size: 22 }) }),
    new Paragraph({ heading: HeadingLevel.TITLE, spacing: { after: 480 }, children: runs(doc.title) }),
    ...coverMeta,
  ];

  doc.sections.forEach((section, index) => {
    children.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_1,
        keepNext: true,
        // Cover page ends after the metadata, and the materials group starts on a fresh page.
        pageBreakBefore: index === 0 || section.key === "materials",
        children: runs(section.title),
      }),
    );
    children.push(...buildBlocks(section.blocks, nextNumbering));
  });

  const bullet = (level: number, text: string, left: number) => ({
    level,
    format: LevelFormat.BULLET,
    text,
    alignment: AlignmentType.LEFT,
    style: { paragraph: { indent: { left, hanging: 260 } } },
  });

  const document = new Document({
    creator: "Yedara",
    title: doc.title,
    description: doc.kicker,
    styles: {
      default: { document: { run: { font: FONT, size: 22, color: TEXT }, paragraph: { spacing: { line: 300 } } } },
      paragraphStyles: [
        { id: "Title", name: "Title", basedOn: "Normal", next: "Normal", quickFormat: true, run: { font: FONT, size: 60, bold: true, color: TEXT } },
        { id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true, run: { font: FONT, size: 34, bold: true, color: PRIMARY }, paragraph: { spacing: { before: 360, after: 160 } } },
        { id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true, run: { font: FONT, size: 25, bold: true, color: TEXT }, paragraph: { spacing: { before: 240, after: 100 } } },
      ],
    },
    numbering: {
      config: [
        { reference: "bullets", levels: [bullet(0, "•", 540), bullet(1, "–", 1000)] },
        {
          reference: "numbered",
          levels: [{ level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 540, hanging: 360 } } } }],
        },
      ],
    },
    sections: [
      {
        properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: 1440, bottom: 1440, left: 1440, right: 1440 } } },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                children: [
                  new TextRun({ text: `${doc.title}  ·  Page `, font: FONT, size: 18, color: MUTED }),
                  new TextRun({ children: [PageNumber.CURRENT], font: FONT, size: 18, color: MUTED }),
                  new TextRun({ text: " of ", font: FONT, size: 18, color: MUTED }),
                  new TextRun({ children: [PageNumber.TOTAL_PAGES], font: FONT, size: 18, color: MUTED }),
                ] as ParagraphChild[],
              }),
            ],
          }),
        },
        children,
      },
    ],
  });

  return Packer.toBuffer(document);
}

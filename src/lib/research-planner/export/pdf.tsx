import { Document, Font, Image, Page, Path, StyleSheet, Svg, Text, View, renderToBuffer } from "@react-pdf/renderer";
import { LOGO_ACCENT_HEX, LOGO_INK_HEX, LOGO_VIEWBOX, LOGO_WING_ACCENT, LOGO_WING_INK } from "@/components/brand/logo-paths";
import type { Block, ListItem, PlanDocument } from "@/lib/research-planner/document";
import { loadDocImage } from "@/lib/export/doc-image";

// Same palette as the app (light theme): accent, warm ink, Stone, parchment hairline, Oat.
const C = { primary: "#C74504", text: "#1C1917", muted: "#6F6963", border: "#E8DDC8", fill: "#F4F2EA" };

// Avoid mid-word hyphenation; it makes technical text harder to read.
Font.registerHyphenationCallback((word) => [word]);

const s = StyleSheet.create({
  page: { paddingTop: 56, paddingBottom: 64, paddingHorizontal: 56, fontFamily: "Helvetica", fontSize: 10.5, color: C.text },
  coverKicker: { fontSize: 12, fontFamily: "Helvetica-Bold", color: C.primary, marginBottom: 12 },
  coverTitle: { fontSize: 30, fontFamily: "Helvetica-Bold", marginBottom: 32 },
  metaRow: { flexDirection: "row", paddingVertical: 8, borderTopWidth: 0.75, borderTopColor: C.border },
  metaLabel: { width: 120, color: C.muted },
  metaValue: { flex: 1, fontFamily: "Helvetica-Bold" },
  h2: { fontSize: 17, fontFamily: "Helvetica-Bold", color: C.primary, marginTop: 22, marginBottom: 4, paddingBottom: 4, borderBottomWidth: 0.75, borderBottomColor: C.border },
  h3: { fontSize: 11.5, fontFamily: "Helvetica-Bold", marginTop: 12, marginBottom: 4 },
  // Do not set lineHeight: on Page it silently drops `render` Text (page numbers), and elsewhere it is not a multiplier.
  p: { marginBottom: 6 },
  li: { flex: 1 },
  listRow: { flexDirection: "row", marginBottom: 3 },
  marker: { width: 18, color: C.muted },
  childRow: { flexDirection: "row", marginLeft: 18, marginBottom: 2, color: C.muted },
  table: { marginTop: 4, marginBottom: 10, borderWidth: 0.75, borderColor: C.border },
  tr: { flexDirection: "row", borderTopWidth: 0.75, borderTopColor: C.border },
  th: { padding: 6, fontFamily: "Helvetica-Bold", backgroundColor: C.fill },
  td: { padding: 6 },
  footerLeft: { position: "absolute", bottom: 28, left: 56, fontSize: 8.5, color: C.muted },
  footerRight: { position: "absolute", bottom: 28, left: 56, right: 56, textAlign: "right", fontSize: 8.5, color: C.muted },
});

const EXTRA_OK = new Set("‘’“”–—…•€™".split(""));
/**
 * Standard PDF fonts only cover Latin text. Replace anything outside that
 * range with "?" so the output is never garbled.
 */
export function pdfSafe(value: string) {
  return Array.from(value.normalize("NFC").replace(/\r/g, "").replace(/\t/g, " "))
    .map((ch) => {
      const code = ch.codePointAt(0)!;
      if (ch === "\n" || (code >= 0x20 && code <= 0xff && code !== 0x7f) || EXTRA_OK.has(ch)) return ch;
      return code < 0x20 || code === 0x7f ? "" : "?";
    })
    .join("");
}

function columnWeights(headers: string[], explicit?: number[]) {
  if (explicit && explicit.length === headers.length) return explicit;
  if (headers.length === 2) return [3, 7];
  if (headers.length === 3) return [2.2, 4.3, 3.5];
  if (headers[0] === "#") return [0.6, 3.4, 3, 3];
  return headers.map(() => 1);
}

/** Small blocks can safely be kept together on one page. */
function isCompact(block: Block | undefined) {
  if (!block) return true;
  if (block.type === "table") return block.rows.length <= 8;
  if (block.type === "list") return block.items.length <= 8;
  return true;
}

function BlockView({ block }: { block: Block }) {
  if (block.type === "heading") return <Text style={s.h3} minPresenceAhead={48}>{pdfSafe(block.text)}</Text>;
  if (block.type === "paragraph") {
    return (
      <>
        {block.text.trim().split(/\n{2,}/).map((para, i) => (
          <Text key={i} style={s.p}>{pdfSafe(para.trim())}</Text>
        ))}
      </>
    );
  }
  if (block.type === "list") {
    return (
      <View style={{ marginBottom: 6 }}>
        {block.items.map((item: ListItem, i) => {
          const text = typeof item === "string" ? item : item.text;
          return (
            <View key={i}>
              <View style={s.listRow} wrap={false}>
                <Text style={s.marker}>{block.ordered ? `${i + 1}.` : "•"}</Text>
                <Text style={s.li}>{pdfSafe(text)}</Text>
              </View>
              {typeof item !== "string" &&
                item.children.map((child, j) => (
                  <View key={j} style={s.childRow} wrap={false}>
                    <Text style={s.marker}>–</Text>
                    <Text style={s.li}>{pdfSafe(child)}</Text>
                  </View>
                ))}
            </View>
          );
        })}
      </View>
    );
  }
  const w = columnWeights(block.headers, block.widths);
  return (
    <View style={s.table}>
      <View style={[s.tr, { borderTopWidth: 0 }]} wrap={false}>
        {block.headers.map((h, i) => (
          <Text key={i} style={[s.th, { flex: w[i] }]}>{pdfSafe(h)}</Text>
        ))}
      </View>
      {block.rows.map((row, r) => (
        <View key={r} style={s.tr} wrap={false}>
          {block.headers.map((_, i) => (
            <Text key={i} style={[s.td, { flex: w[i] }]}>{pdfSafe(row[i] ?? "")}</Text>
          ))}
        </View>
      ))}
    </View>
  );
}

export function PlanPdf({ doc, image }: { doc: PlanDocument; image?: Buffer | null }) {
  return (
    <Document title={doc.title} author="Yedara" subject={doc.kicker}>
      <Page size="A4" style={s.page}>
        <View style={{ marginTop: 130 }}>
          <Svg viewBox={LOGO_VIEWBOX} style={{ width: 52, height: 52, marginBottom: 28 }}>
            <Path d={LOGO_WING_INK} fill={LOGO_INK_HEX} />
            <Path d={LOGO_WING_ACCENT} fill={LOGO_ACCENT_HEX} />
          </Svg>
          {image && doc.image && (
            <View style={{ marginBottom: 22 }}>
              {/* eslint-disable-next-line jsx-a11y/alt-text -- react-pdf Image, not an HTML img */}
              <Image src={{ data: image, format: "jpg" }} style={{ width: 84, height: 84, borderRadius: 42 }} />
              <Text style={{ fontSize: 8.5, color: C.muted, marginTop: 6, maxWidth: 300 }}>{pdfSafe(doc.image.caption)}</Text>
            </View>
          )}
          <Text style={s.coverKicker}>{pdfSafe(doc.kicker)}</Text>
          <Text style={s.coverTitle}>{pdfSafe(doc.title)}</Text>
          {doc.meta.map((m) => (
            <View key={m.label} style={s.metaRow}>
              <Text style={s.metaLabel}>{pdfSafe(m.label)}</Text>
              <Text style={s.metaValue}>{pdfSafe(m.value)}</Text>
            </View>
          ))}
        </View>
      </Page>
      <Page size="A4" style={s.page}>
        {/* Separate fixed Texts: a `render` Text nested in a fixed View is dropped by react-pdf. */}
        <Text style={s.footerLeft} fixed>{pdfSafe(doc.title)}</Text>
        <Text style={s.footerRight} fixed render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} />
        {doc.sections.map((section) => {
          const [first, ...rest] = section.blocks;
          return (
            <View key={section.key}>
              {/* Keep the heading with its first block so it is never stranded at a page bottom. */}
              <View wrap={!isCompact(first)}>
                <Text style={s.h2}>{pdfSafe(section.title)}</Text>
                {first && <BlockView block={first} />}
              </View>
              {first?.type === "heading" && rest[0] && (
                <BlockView block={rest[0]} />
              )}
              {(first?.type === "heading" ? rest.slice(1) : rest).map((block, i) => (
                <BlockView key={i} block={block} />
              ))}
            </View>
          );
        })}
      </Page>
    </Document>
  );
}

export async function renderPdf(doc: PlanDocument): Promise<Buffer> {
  return renderToBuffer(<PlanPdf doc={doc} image={await loadDocImage(doc.image)} />);
}

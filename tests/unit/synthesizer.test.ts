import { describe, expect, it } from "vitest";
import { addCard, addTheme, applyEverywhere, canRedo, canUndo, columnCards, commit, createHistory, moveCard, moveTheme, redo, removeCard, removeTheme, renameTheme, toLayout, undo, type BoardState } from "@/lib/synthesizer/board-state";
import { cleanText, delimiterFor, parseDelimited, safeFileName, splitStatements, statementsFromColumn, validateImportFile } from "@/lib/synthesizer/import-parse";
import { buildSynthesisDocument, observationRefs } from "@/lib/synthesizer/document";
import { importInputSchema, insightInputSchema, layoutSchema, normalizeReport, normalizeTags, observationInputSchema } from "@/lib/synthesizer/schemas";
import { groupRecent } from "@/lib/recent-groups";
import type { InsightRow, ObservationRow, SourceRow, ThemeRow, CardRow } from "@/lib/synthesizer/schemas";

describe("validateImportFile", () => {
  it("accepts supported text files within the size limit", () => {
    for (const name of ["notes.txt", "Interview.MD", "survey.csv", "survey.tsv"]) {
      expect(validateImportFile({ name, size: 1200, type: "" }).ok).toBe(true);
    }
    expect(validateImportFile({ name: "notes.txt", size: 1_000_000, type: "text/plain" }).ok).toBe(true);
  });

  it("rejects unsupported types with a clear message", () => {
    for (const name of ["report.pdf", "notes.docx", "photo.png", "script.js", "noextension", "archive.zip"]) {
      const r = validateImportFile({ name, size: 100 });
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.error).toMatch(/supported type/);
    }
  });

  it("rejects an empty file and one over the limit, saying the size", () => {
    const empty = validateImportFile({ name: "a.txt", size: 0 });
    expect(empty).toEqual({ ok: false, error: "a.txt is empty." });
    const big = validateImportFile({ name: "big.txt", size: 1_400_000 });
    expect(big.ok).toBe(false);
    if (!big.ok) expect(big.error).toMatch(/1\.4 MB.*1\.0 MB/);
  });

  it("rejects a text-looking name with a binary media type", () => {
    expect(validateImportFile({ name: "x.txt", size: 10, type: "application/pdf" }).ok).toBe(false);
    expect(validateImportFile({ name: "x.csv", size: 10, type: "image/png" }).ok).toBe(false);
  });

  it("keeps only a bare file name", () => {
    expect(safeFileName("C:\\Users\\me\\notes.txt")).toBe("notes.txt");
    expect(safeFileName("../../etc/passwd.txt")).toBe("passwd.txt");
    expect(safeFileName('a<b>"c".txt')).toBe("abc.txt");
  });
});

describe("cleanText", () => {
  it("strips a BOM and normalises line endings", () => {
    expect(cleanText("\uFEFFa\r\nb\rc")).toBe("a\nb\nc");
  });
  it("refuses binary content", () => {
    expect(cleanText("abc\u0000def")).toBeNull();
  });
});

describe("splitStatements", () => {
  const notes = "Could not find pricing.\nIt was on another page.\n\n- Liked the quick setup\n\n\n3. Gave up at the bank step";

  it("splits on blank lines and joins wrapped lines, dropping list markers", () => {
    expect(splitStatements(notes, "paragraphs").statements).toEqual(["Could not find pricing. It was on another page.", "Liked the quick setup", "Gave up at the bank step"]);
  });

  it("splits one statement per line", () => {
    expect(splitStatements(notes, "lines").statements).toEqual(["Could not find pricing.", "It was on another page.", "Liked the quick setup", "Gave up at the bank step"]);
  });

  it("ignores blank input", () => {
    expect(splitStatements("  \n\n \n", "paragraphs").statements).toEqual([]);
  });

  it("reports statements that are too long instead of cutting them", () => {
    const r = splitStatements(`short\n\n${"x".repeat(2001)}`, "paragraphs");
    expect(r.statements).toEqual(["short"]);
    expect(r.tooLong).toBe(1);
  });

  it("caps one import at 500 statements and says how many were left out", () => {
    const text = Array.from({ length: 520 }, (_, i) => `line ${i}`).join("\n");
    const r = splitStatements(text, "lines");
    expect(r.statements).toHaveLength(500);
    expect(r.overLimit).toBe(20);
  });
});

describe("delimited files", () => {
  it("reads quoted fields with commas, quotes and newlines", () => {
    const rows = parseDelimited('id,answer\n1,"Hello, world"\n2,"She said ""no"""\n3,"two\nlines"\n', ",");
    expect(rows).toEqual([["id", "answer"], ["1", "Hello, world"], ["2", 'She said "no"'], ["3", "two\nlines"]]);
  });

  it("reads tab separated text and skips blank rows", () => {
    expect(parseDelimited("a\tb\n\n1\t2\n", "\t")).toEqual([["a", "b"], ["1", "2"]]);
    expect(delimiterFor("x.tsv")).toBe("\t");
    expect(delimiterFor("x.CSV")).toBe(",");
  });

  it("takes one statement per row from the chosen column, skipping the header when asked", () => {
    const rows = [["id", "answer"], ["1", "Too slow"], ["2", ""], ["3", "Loved it"]];
    expect(statementsFromColumn(rows, 1, true).statements).toEqual(["Too slow", "Loved it"]);
    expect(statementsFromColumn(rows, 1, false).statements).toEqual(["answer", "Too slow", "Loved it"]);
    expect(statementsFromColumn(rows, 5, true).statements).toEqual([]);
  });
});

describe("schemas", () => {
  it("normalises tags: trims, drops #, de-duplicates ignoring case, caps count and length", () => {
    expect(normalizeTags(" #Pricing, pricing ,Setup,, ")).toEqual(["Pricing", "Setup"]);
    expect(normalizeTags(Array.from({ length: 30 }, (_, i) => `t${i}`))).toHaveLength(20);
    expect(normalizeTags(["x".repeat(80)])[0]).toHaveLength(40);
  });

  it("requires observation text and limits its length", () => {
    expect(observationInputSchema.safeParse({ content: "   " }).success).toBe(false);
    expect(observationInputSchema.safeParse({ content: "x".repeat(2001) }).success).toBe(false);
    const ok = observationInputSchema.parse({ content: " Gave up ", tags: ["a", "A"] });
    expect(ok).toMatchObject({ content: "Gave up", kind: "observation", tags: ["a"], sourceId: "" });
  });

  it("limits an import to 500 non-empty statements", () => {
    const source = { name: "Interview P1" };
    expect(importInputSchema.safeParse({ source, statements: [] }).success).toBe(false);
    expect(importInputSchema.safeParse({ source, statements: Array(501).fill("x") }).success).toBe(false);
    expect(importInputSchema.safeParse({ source, statements: ["x".repeat(2001)] }).success).toBe(false);
    expect(importInputSchema.safeParse({ source, statements: ["ok"] }).success).toBe(true);
  });

  it("requires at least one piece of evidence for every insight", () => {
    const base = { statement: "People give up at the bank step" };
    const none = insightInputSchema.safeParse({ ...base, evidenceIds: [] });
    expect(none.success).toBe(false);
    if (!none.success) expect(none.error.issues[0].message).toMatch(/at least one observation/);
    expect(insightInputSchema.safeParse({ ...base, evidenceIds: ["not-a-uuid"] }).success).toBe(false);
    expect(insightInputSchema.safeParse({ statement: " ", evidenceIds: ["11111111-1111-4111-8111-111111111111"] }).success).toBe(false);
    const ok = insightInputSchema.parse({ ...base, evidenceIds: ["11111111-1111-4111-8111-111111111111"] });
    expect(ok).toMatchObject({ kind: "interpretation", confidence: "medium", themeId: "", problemKind: "" });
  });

  it("rejects insight kinds and confidence values outside the known sets", () => {
    const ids = ["11111111-1111-4111-8111-111111111111"];
    expect(insightInputSchema.safeParse({ statement: "x", evidenceIds: ids, kind: "fact" }).success).toBe(false);
    expect(insightInputSchema.safeParse({ statement: "x", evidenceIds: ids, confidence: "certain" }).success).toBe(false);
  });

  it("requires every theme to have a title in a saved layout", () => {
    const t = "11111111-1111-4111-8111-111111111111";
    expect(layoutSchema.safeParse({ themes: [{ id: t, title: "  " }], cards: [] }).success).toBe(false);
    expect(layoutSchema.safeParse({ themes: [{ id: t, title: "Pricing" }], cards: [{ id: t, themeId: null, position: 0 }] }).success).toBe(true);
  });

  it("falls back to an empty report for stored data that doesn't fit", () => {
    expect(normalizeReport(null).overview).toBe("");
    expect(normalizeReport({ overview: 5 }).overview).toBe("");
    expect(normalizeReport({ overview: "Why we did it" }).overview).toBe("Why we did it");
  });
});

const base = (): BoardState => ({ themes: [], cards: { a: { themeId: null, position: 0 }, b: { themeId: null, position: 1 }, c: { themeId: null, position: 2 } } });

describe("board state", () => {
  it("adds, renames and reorders themes", () => {
    let s = addTheme(base(), "t1", "  Pricing ");
    s = addTheme(s, "t2", "Setup");
    expect(s.themes.map((t) => t.title)).toEqual(["Pricing", "Setup"]);
    expect(renameTheme(s, "t1", "Cost").themes[0].title).toBe("Cost");
    expect(renameTheme(s, "t1", "   ")).toBe(s);
    expect(moveTheme(s, "t1", 1).themes.map((t) => t.id)).toEqual(["t2", "t1"]);
    expect(moveTheme(s, "t1", -1)).toBe(s);
  });

  it("moves a card into a theme and keeps every column numbered 0..n-1", () => {
    let s = addTheme(base(), "t1", "Pricing");
    s = moveCard(s, "b", "t1");
    expect(columnCards(s, "t1")).toEqual(["b"]);
    expect(columnCards(s, null)).toEqual(["a", "c"]);
    expect(s.cards.c).toEqual({ themeId: null, position: 1 });
  });

  it("reorders within a column, placing at an index", () => {
    const s = moveCard(base(), "c", null, 0);
    expect(columnCards(s, null)).toEqual(["c", "a", "b"]);
    expect(columnCards(moveCard(s, "c", null, 99), null)).toEqual(["a", "b", "c"]);
  });

  it("ignores moves to a theme that does not exist or a card that does not exist", () => {
    const s = base();
    expect(moveCard(s, "a", "ghost")).toBe(s);
    expect(moveCard(s, "zzz", null)).toBe(s);
  });

  it("returns a theme's cards to 'not grouped' when the theme is removed, never deleting them", () => {
    let s = addTheme(base(), "t1", "Pricing");
    s = moveCard(moveCard(s, "a", "t1"), "b", "t1");
    s = removeTheme(s, "t1");
    expect(s.themes).toEqual([]);
    expect(Object.keys(s.cards).sort()).toEqual(["a", "b", "c"]);
    expect(columnCards(s, null)).toEqual(["c", "a", "b"]);
  });

  it("adds and removes cards", () => {
    const added = addCard(base(), "d");
    expect(columnCards(added, null)).toEqual(["a", "b", "c", "d"]);
    expect(addCard(added, "d")).toBe(added);
    expect(Object.keys(removeCard(added, "a").cards)).toEqual(["b", "c", "d"]);
  });

  it("produces a layout whose positions follow order", () => {
    let s = addTheme(base(), "t1", "Pricing");
    s = moveCard(s, "c", "t1");
    const layout = toLayout(s);
    expect(layout.themes).toEqual([{ id: "t1", title: "Pricing", notes: "" }]);
    expect(layout.cards.find((c) => c.id === "c")).toEqual({ id: "c", themeId: "t1", position: 0 });
    expect(layoutSchema.safeParse({ ...layout, themes: layout.themes.map((t) => ({ ...t, id: "11111111-1111-4111-8111-111111111111" })), cards: [] }).success).toBe(true);
  });
});

describe("undo and redo", () => {
  it("steps back and forward through board changes", () => {
    let h = createHistory(base());
    h = commit(h, addTheme(h.present, "t1", "Pricing"));
    h = commit(h, moveCard(h.present, "a", "t1"));
    expect(canUndo(h)).toBe(true);
    expect(canRedo(h)).toBe(false);

    h = undo(h);
    expect(columnCards(h.present, "t1")).toEqual([]);
    expect(h.present.themes).toHaveLength(1);
    h = undo(h);
    expect(h.present.themes).toHaveLength(0);
    expect(canUndo(h)).toBe(false);

    h = redo(redo(h));
    expect(columnCards(h.present, "t1")).toEqual(["a"]);
    expect(canRedo(h)).toBe(false);
  });

  it("clears the redo trail when a new change is made after undoing", () => {
    let h = createHistory(base());
    h = commit(h, addTheme(h.present, "t1", "One"));
    h = undo(h);
    h = commit(h, addTheme(h.present, "t2", "Two"));
    expect(canRedo(h)).toBe(false);
    expect(h.present.themes.map((t) => t.id)).toEqual(["t2"]);
  });

  it("does not record a change that changes nothing", () => {
    const h = createHistory(base());
    expect(commit(h, base())).toBe(h);
    expect(undo(h)).toBe(h);
    expect(redo(h)).toBe(h);
  });

  it("keeps at most 50 steps", () => {
    let h = createHistory(base());
    for (let i = 0; i < 60; i++) h = commit(h, addTheme(h.present, `t${i}`, `T${i}`));
    expect(h.past).toHaveLength(50);
  });

  it("applies a card added or deleted elsewhere to every snapshot so undo can't resurrect it", () => {
    let h = createHistory(base());
    h = commit(h, addTheme(h.present, "t1", "Pricing"));
    h = applyEverywhere(h, (s) => removeCard(s, "a"));
    h = undo(h);
    expect(Object.keys(h.present.cards)).not.toContain("a");
    h = applyEverywhere(h, (s) => addCard(s, "z"));
    h = redo(h);
    expect(Object.keys(h.present.cards)).toContain("z");
  });
});

const obs = (id: string, over: Partial<ObservationRow> = {}): ObservationRow => ({
  id, synthesis_id: "s", source_id: null, participant_ref: null, kind: "observation", content: `Text ${id}`, tags: [], position: 0, created_at: `2026-01-01T00:00:0${id.length}Z`, updated_at: "", ...over,
});
const insight = (id: string, over: Partial<InsightRow> = {}): InsightRow => ({
  id, synthesis_id: "s", theme_id: null, kind: "interpretation", observation: null, pattern: null, user_need: null, problem_kind: null, problem_text: null, statement: `Statement ${id}`, confidence: "medium", recommended_action: null, position: 0, created_at: "", updated_at: "", evidence_ids: [], ...over,
});
const theme = (id: string, title: string, over: Partial<ThemeRow> = {}): ThemeRow => ({ id, synthesis_id: "s", title, notes: null, position: 0, created_at: "", updated_at: "", ...over });
const card = (id: string, observation_id: string, theme_id: string | null, position = 0): CardRow => ({ id, synthesis_id: "s", board_id: "b", observation_id, theme_id, position, created_at: "", updated_at: "" });
const source = (id: string, name: string): SourceRow => ({ id, synthesis_id: "s", name, source_type: "interview", participant_ref: "P1", conducted_on: "2026-03-01", notes: null, file_name: null, file_size: null, import_method: "paste", created_at: "", updated_at: "" });

describe("buildSynthesisDocument", () => {
  const observations = [obs("o1", { participant_ref: "P1", content: "Could not find pricing", source_id: "src", tags: ["pricing"], position: 0 }), obs("o2", { participant_ref: "P2", content: "Liked the setup", position: 1 }), obs("o3", { content: "Gave up at the bank step", position: 2 })];
  const build = (over: Partial<Parameters<typeof buildSynthesisDocument>[0]> = {}) =>
    buildSynthesisDocument({
      synthesis: { title: "Onboarding research", status: "draft", updatedAt: "2026-03-02T00:00:00Z" },
      project: { name: "Budgeto", client: "Globex" },
      report: normalizeReport({ overview: "Why we ran this", methodology: "Six interviews", limitations: "Small sample" }),
      sources: [source("src", "Interview P1")],
      observations,
      themes: [theme("t1", "Pricing", { notes: "Hard to find" })],
      cards: [card("c1", "o1", "t1"), card("c2", "o2", null), card("c3", "o3", null, 1)],
      insights: [insight("i1", { statement: "Pricing is buried", evidence_ids: ["o1"], user_need: "See the cost early", problem_kind: "problem", problem_text: "Cost is hidden", recommended_action: "Add a pricing link", theme_id: "t1", confidence: "high" })],
      ...over,
    });
  const section = (doc: ReturnType<typeof build>, key: string) => doc.sections.find((s) => s.key === key)!;
  const text = (doc: ReturnType<typeof build>) => JSON.stringify(doc);

  it("has every section the brief asks for, in order", () => {
    expect(build().sections.map((s) => s.title)).toEqual(["Research overview", "Methodology", "Participants", "Key themes", "Supporting observations", "Insights", "User needs", "Pain points", "Recommendations", "Limitations"]);
  });

  it("numbers observations in collection order and cites them from insights", () => {
    const refs = observationRefs(observations);
    expect([...refs.values()]).toEqual(["O1", "O2", "O3"]);
    expect(text(build())).toContain("Evidence");
    const insights = JSON.stringify(section(build(), "insights"));
    expect(insights).toContain("O1");
    expect(insights).toContain("Pricing is buried");
  });

  it("lists only the observations cited as evidence under Supporting observations", () => {
    const evidence = JSON.stringify(section(build(), "evidence"));
    expect(evidence).toContain("Could not find pricing");
    expect(evidence).not.toContain("Liked the setup");
  });

  it("puts observations under their theme and counts those not grouped", () => {
    const themes = JSON.stringify(section(build(), "themes"));
    expect(themes).toContain("Pricing (1 observation)");
    expect(themes).toContain("Hard to find");
    expect(themes).toContain("Not grouped yet: 2 observations");
  });

  it("labels the insight kind and confidence, and says insights are interpretation", () => {
    const insights = JSON.stringify(section(build(), "insights"));
    expect(insights).toContain("Research interpretation");
    expect(insights).toContain("High confidence");
    expect(insights).toMatch(/researcher's interpretation/);
  });

  it("derives user needs, pain points and recommendations from the insights", () => {
    expect(JSON.stringify(section(build(), "needs"))).toContain("See the cost early");
    expect(JSON.stringify(section(build(), "pain-points"))).toContain("Cost is hidden");
    expect(JSON.stringify(section(build(), "recommendations"))).toContain("Add a pricing link");
  });

  it("flags an insight with no evidence, and says so under Limitations", () => {
    const doc = build({ insights: [insight("i1", { statement: "Unsupported claim", evidence_ids: [] })] });
    expect(JSON.stringify(section(doc, "insights"))).toContain("No evidence linked yet");
    expect(JSON.stringify(section(doc, "limitations"))).toContain("1 insight has no linked evidence");
  });

  it("states honest placeholders instead of inventing content when sections are empty", () => {
    const doc = build({ report: normalizeReport({}), sources: [], observations: [], themes: [], cards: [], insights: [] });
    expect(text(doc)).toContain("Not added yet.");
    expect(JSON.stringify(section(doc, "themes"))).toContain("No themes have been created yet.");
    expect(JSON.stringify(section(doc, "insights"))).toContain("No insights have been written yet.");
    expect(JSON.stringify(section(doc, "participants"))).toContain("No participant references were recorded.");
  });

  it("describes participants as the sample, not a wider population", () => {
    expect(JSON.stringify(section(build(), "limitations"))).toContain("not a wider population");
  });

  it("reports the real counts in the overview", () => {
    expect(JSON.stringify(section(build(), "overview"))).toContain("3 observations from 1 source and 2 participants");
  });
});

describe("groupRecent", () => {
  const item = (id: string, updatedAt: string) => ({ kind: "persona" as const, id, title: id, href: `/x/${id}`, project: null, updatedAt });
  it("buckets by the reader's days, in a file-manager way", () => {
    const now = "2026-10-31T12:00:00Z";
    const groups = groupRecent([item("a", "2026-10-31T09:00:00Z"), item("b", "2026-10-30T20:00:00Z"), item("c", "2026-10-27T08:00:00Z")], now, "UTC");
    expect(groups.map((g) => g.label)).toEqual(["Today", "Yesterday", "Previous 7 days"]);
  });
});

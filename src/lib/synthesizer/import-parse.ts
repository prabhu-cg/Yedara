import { LIMITS } from "@/lib/synthesizer/constants";

export type FileCheck = { ok: true; name: string } | { ok: false; error: string };

const BLOCKED_TYPES = /^(image|audio|video)\/|pdf|zip|msword|officedocument|octet-stream|json/i;

const formatBytes = (n: number) => (n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1000))} KB`);

/** A bare file name with no path, so nothing odd is ever stored or shown from it. */
export function safeFileName(name: string) {
  return name.replace(/^.*[\\/]/, "").replace(/[\u0000-\u001f<>:"|?*]/g, "").trim().slice(0, 255);
}

/** Checks a file before it is read. Nothing about the file leaves the browser. */
export function validateImportFile(file: { name: string; size: number; type?: string }): FileCheck {
  const name = safeFileName(file.name);
  const ext = name.includes(".") ? name.slice(name.lastIndexOf(".")).toLowerCase() : "";
  if (!(LIMITS.fileExtensions as readonly string[]).includes(ext)) {
    return { ok: false, error: `${name || "That file"} isn't a supported type. Use ${LIMITS.fileExtensions.join(", ")}.` };
  }
  if (file.type && BLOCKED_TYPES.test(file.type)) return { ok: false, error: `${name} doesn't look like a plain text file.` };
  if (file.size === 0) return { ok: false, error: `${name} is empty.` };
  if (file.size > LIMITS.fileBytes) {
    return { ok: false, error: `${name} is ${formatBytes(file.size)}. The limit is ${formatBytes(LIMITS.fileBytes)}. Split it into smaller files.` };
  }
  return { ok: true, name };
}

/** Normalises what the browser read: BOM, line endings. Null when it isn't text. */
export function cleanText(raw: string): string | null {
  if (raw.includes("\u0000")) return null;
  return raw.replace(/^﻿/, "").replace(/\r\n?/g, "\n");
}

export type SplitMode = "paragraphs" | "lines";
export type ParseResult = { statements: string[]; tooLong: number; overLimit: number };

const BULLET = /^\s*(?:[-*•–]|\d+[.)])\s+/;

function finish(items: string[]): ParseResult {
  const cleaned = items.map((s) => s.replace(/[ \t]+/g, " ").trim()).filter(Boolean);
  const fits = cleaned.filter((s) => s.length <= LIMITS.statementChars);
  const tooLong = cleaned.length - fits.length;
  const statements = fits.slice(0, LIMITS.importStatements);
  return { statements, tooLong, overLimit: fits.length - statements.length };
}

/** Splits pasted notes into statements: one per blank-line-separated paragraph, or one per line. */
export function splitStatements(text: string, mode: SplitMode): ParseResult {
  const normalised = text.replace(/\r\n?/g, "\n");
  if (mode === "lines") return finish(normalised.split("\n").map((l) => l.replace(BULLET, "")));
  return finish(normalised.split(/\n\s*\n/).map((p) => p.split("\n").map((l) => l.replace(BULLET, "")).join(" ")));
}

/** A small RFC 4180 reader: quoted fields, doubled quotes, embedded delimiters and newlines. */
export function parseDelimited(text: string, delimiter: "," | "\t"): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (ch === '"') quoted = false;
      else field += ch;
    } else if (ch === '"' && field === "") quoted = true;
    else if (ch === delimiter) { row.push(field); field = ""; }
    else if (ch === "\n") { row.push(field); rows.push(row); row = []; field = ""; }
    else field += ch;
  }
  if (field !== "" || row.length) { row.push(field); rows.push(row); }
  return rows.filter((r) => r.some((c) => c.trim() !== ""));
}

export const delimiterFor = (fileName: string): "," | "\t" => (fileName.toLowerCase().endsWith(".tsv") ? "\t" : ",");
export const isDelimited = (fileName: string) => /\.(csv|tsv)$/i.test(fileName);

/** One statement per row from the chosen column (survey exports: pick the question column). */
export function statementsFromColumn(rows: string[][], column: number, hasHeader: boolean): ParseResult {
  return finish(rows.slice(hasHeader ? 1 : 0).map((r) => r[column] ?? ""));
}

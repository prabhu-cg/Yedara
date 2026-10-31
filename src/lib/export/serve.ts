import "server-only";
import { NextResponse } from "next/server";
import type { PlanDocument } from "@/lib/research-planner/document";
import { renderDocx } from "@/lib/research-planner/export/docx";
import { renderMarkdown } from "@/lib/research-planner/export/markdown";
import { renderPdf } from "@/lib/research-planner/export/pdf";

export const EXPORT_FORMATS = {
  md: { type: "text/markdown; charset=utf-8", ext: "md" },
  pdf: { type: "application/pdf", ext: "pdf" },
  docx: { type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", ext: "docx" },
} as const;

export type ExportFormat = keyof typeof EXPORT_FORMATS;

export function isExportFormat(value: string): value is ExportFormat {
  return value in EXPORT_FORMATS;
}

/** A safe ASCII file name such as "onboarding-research-persona.pdf". */
export function exportFileName(title: string, suffix: string, ext: string) {
  const slug = title
    .normalize("NFKD")
    .replace(/[^\x20-\x7e]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  return `${slug || "untitled"}-${suffix}.${ext}`;
}

export const jsonError = (body: object, status: number, headers: Record<string, string> = {}) =>
  NextResponse.json(body, { status, headers: { "Cache-Control": "no-store", ...headers } });

/** Renders a document in the requested format as a download response. */
export async function documentResponse(doc: PlanDocument, format: ExportFormat, title: string, suffix: string) {
  try {
    const { type, ext } = EXPORT_FORMATS[format];
    const body: Uint8Array =
      format === "md"
        ? new TextEncoder().encode(renderMarkdown(doc))
        : format === "pdf"
          ? new Uint8Array(await renderPdf(doc))
          : new Uint8Array(await renderDocx(doc));

    return new NextResponse(body as BodyInit, {
      headers: {
        "Content-Type": type,
        "Content-Disposition": `attachment; filename="${exportFileName(title, suffix, ext)}"`,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    console.error("[export] failed:", error instanceof Error ? error.message : "unknown");
    return jsonError({ error: "We couldn't generate that file. Please try again." }, 500);
  }
}

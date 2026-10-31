import { NextResponse, type NextRequest } from "next/server";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { createClient } from "@/lib/supabase/server";
import { buildPlanDocument } from "@/lib/research-planner/document";
import { renderDocx } from "@/lib/research-planner/export/docx";
import { renderMarkdown } from "@/lib/research-planner/export/markdown";
import { renderPdf } from "@/lib/research-planner/export/pdf";
import { loadPlanBundle } from "@/lib/research-planner/queries";

const FORMATS = {
  md: { type: "text/markdown; charset=utf-8", ext: "md" },
  pdf: { type: "application/pdf", ext: "pdf" },
  docx: { type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", ext: "docx" },
} as const;

function fileName(title: string, ext: string) {
  const slug = title
    .normalize("NFKD")
    .replace(/[^\x20-\x7e]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  return `${slug || "research-plan"}-research-plan.${ext}`;
}

const json = (body: object, status: number) =>
  NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });

export async function GET(request: NextRequest, ctx: RouteContext<"/api/research-plans/[planId]/export">) {
  const { planId } = await ctx.params;
  const format = request.nextUrl.searchParams.get("format") ?? "";
  if (!(format in FORMATS)) return json({ error: "Unsupported format." }, 400);

  // Validate the session with Supabase Auth (not just the cookie).
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return json({ error: "Please sign in." }, 401);

  const limit = await checkRateLimit(`export:${auth.user.id}`, RATE_LIMITS.export);
  if (!limit.allowed) {
    return NextResponse.json(
      { error: "Too many exports. Please wait a moment." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds), "Cache-Control": "no-store" } },
    );
  }

  // RLS means another user's plan is indistinguishable from a missing one.
  const bundle = await loadPlanBundle(planId);
  if (!bundle) return json({ error: "Research plan not found." }, 404);

  const doc = buildPlanDocument({
    title: bundle.plan.title,
    status: bundle.plan.status,
    updatedAt: bundle.plan.updated_at,
    project: bundle.project,
    preparedBy: bundle.preparedBy,
    sections: Object.fromEntries(
      Object.entries(bundle.sections).map(([key, s]) => [key, { content: s.content, position: s.position }]),
    ),
  });

  try {
    const { type, ext } = FORMATS[format as keyof typeof FORMATS];
    const body: Uint8Array =
      format === "md"
        ? new TextEncoder().encode(renderMarkdown(doc))
        : format === "pdf"
          ? new Uint8Array(await renderPdf(doc))
          : new Uint8Array(await renderDocx(doc));

    return new NextResponse(body as BodyInit, {
      headers: {
        "Content-Type": type,
        "Content-Disposition": `attachment; filename="${fileName(bundle.plan.title, ext)}"`,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    console.error("[planner] export failed:", error instanceof Error ? error.message : "unknown");
    return json({ error: "We couldn't generate that file. Please try again." }, 500);
  }
}

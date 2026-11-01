import { NextResponse, type NextRequest } from "next/server";
import { documentResponse, isExportFormat, jsonError } from "@/lib/export/serve";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { createClient } from "@/lib/supabase/server";
import { buildSynthesisDocument } from "@/lib/synthesizer/document";
import { loadSynthesisBundle } from "@/lib/synthesizer/queries";

export async function GET(request: NextRequest, ctx: RouteContext<"/api/syntheses/[synthesisId]/export">) {
  const { synthesisId } = await ctx.params;
  const format = request.nextUrl.searchParams.get("format") ?? "";
  if (!isExportFormat(format)) return jsonError({ error: "Unsupported format." }, 400);

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return jsonError({ error: "Please sign in." }, 401);

  const limit = await checkRateLimit(`export:${auth.user.id}`, RATE_LIMITS.export);
  if (!limit.allowed) {
    return NextResponse.json({ error: "Too many exports. Please wait a moment." }, { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds), "Cache-Control": "no-store" } });
  }

  const bundle = await loadSynthesisBundle(synthesisId);
  if (!bundle) return jsonError({ error: "Synthesis not found." }, 404);

  const doc = buildSynthesisDocument({
    synthesis: { title: bundle.synthesis.title, status: bundle.synthesis.status, updatedAt: bundle.synthesis.updated_at },
    project: bundle.project ? { name: bundle.project.name, client: bundle.project.client } : null,
    preparedBy: bundle.preparedBy,
    report: bundle.report,
    sources: bundle.sources,
    observations: bundle.observations,
    themes: bundle.themes,
    cards: bundle.cards,
    insights: bundle.insights,
  });
  return documentResponse(doc, format, bundle.synthesis.title, "synthesis");
}

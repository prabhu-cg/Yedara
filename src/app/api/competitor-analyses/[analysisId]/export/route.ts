import { NextResponse, type NextRequest } from "next/server";
import { documentResponse, isExportFormat, jsonError } from "@/lib/export/serve";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { createClient } from "@/lib/supabase/server";
import { buildAnalysisDocument } from "@/lib/competitors/document";
import { loadAnalysisBundle } from "@/lib/competitors/queries";

export async function GET(request: NextRequest, ctx: RouteContext<"/api/competitor-analyses/[analysisId]/export">) {
  const { analysisId } = await ctx.params;
  const format = request.nextUrl.searchParams.get("format") ?? "";
  if (!isExportFormat(format)) return jsonError({ error: "Unsupported format." }, 400);

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return jsonError({ error: "Please sign in." }, 401);

  const limit = await checkRateLimit(`export:${auth.user.id}`, RATE_LIMITS.export);
  if (!limit.allowed) {
    return NextResponse.json({ error: "Too many exports. Please wait a moment." }, { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds), "Cache-Control": "no-store" } });
  }

  const bundle = await loadAnalysisBundle(analysisId);
  if (!bundle) return jsonError({ error: "Analysis not found." }, 404);

  const doc = buildAnalysisDocument({
    analysis: { title: bundle.analysis.title, status: bundle.analysis.status, updatedAt: bundle.analysis.updated_at },
    project: bundle.project ? { name: bundle.project.name, client: bundle.project.client, brief: bundle.project.brief } : null,
    preparedBy: bundle.preparedBy,
    market: bundle.market,
    content: bundle.content,
    competitors: bundle.competitors,
    criteria: bundle.criteria,
    cells: bundle.cells,
    sources: bundle.sources,
  });
  return documentResponse(doc, format, bundle.analysis.title, "competitor-analysis");
}

import { NextResponse, type NextRequest } from "next/server";
import { documentResponse, isExportFormat, jsonError } from "@/lib/export/serve";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { createClient } from "@/lib/supabase/server";
import { buildPlanDocument } from "@/lib/research-planner/document";
import { loadPlanBundle } from "@/lib/research-planner/queries";

export async function GET(request: NextRequest, ctx: RouteContext<"/api/research-plans/[planId]/export">) {
  const { planId } = await ctx.params;
  const format = request.nextUrl.searchParams.get("format") ?? "";
  if (!isExportFormat(format)) return jsonError({ error: "Unsupported format." }, 400);

  // Validate the session with Supabase Auth (not just the cookie).
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return jsonError({ error: "Please sign in." }, 401);

  const limit = await checkRateLimit(`export:${auth.user.id}`, RATE_LIMITS.export);
  if (!limit.allowed) {
    return NextResponse.json(
      { error: "Too many exports. Please wait a moment." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds), "Cache-Control": "no-store" } },
    );
  }

  // RLS means another user's plan is indistinguishable from a missing one.
  const bundle = await loadPlanBundle(planId);
  if (!bundle) return jsonError({ error: "Research plan not found." }, 404);

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
  return documentResponse(doc, format, bundle.plan.title, "research-plan");
}

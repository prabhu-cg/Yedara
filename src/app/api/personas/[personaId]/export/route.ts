import { NextResponse, type NextRequest } from "next/server";
import { documentResponse, isExportFormat, jsonError } from "@/lib/export/serve";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { createClient } from "@/lib/supabase/server";
import { buildPersonaDocument } from "@/lib/personas/document";
import { loadPersonaBundle } from "@/lib/personas/queries";

export async function GET(request: NextRequest, ctx: RouteContext<"/api/personas/[personaId]/export">) {
  const { personaId } = await ctx.params;
  const format = request.nextUrl.searchParams.get("format") ?? "";
  if (!isExportFormat(format)) return jsonError({ error: "Unsupported format." }, 400);

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return jsonError({ error: "Please sign in." }, 401);

  const limit = await checkRateLimit(`export:${auth.user.id}`, RATE_LIMITS.export);
  if (!limit.allowed) {
    return NextResponse.json({ error: "Too many exports. Please wait a moment." }, { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds), "Cache-Control": "no-store" } });
  }

  const bundle = await loadPersonaBundle(personaId);
  if (!bundle) return jsonError({ error: "Persona not found." }, 404);

  const doc = buildPersonaDocument({
    persona: { name: bundle.persona.name, type: bundle.persona.persona_type, status: bundle.persona.status, updatedAt: bundle.persona.updated_at },
    project: bundle.project ? { name: bundle.project.name, client: bundle.project.client, brief: bundle.project.brief } : null,
    preparedBy: bundle.preparedBy,
    content: bundle.content,
    evidence: bundle.evidence,
  });
  return documentResponse(doc, format, bundle.persona.name, "persona");
}

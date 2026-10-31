import type { Metadata } from "next";
import Link from "next/link";
import { Clock } from "lucide-react";
import { EmptyState } from "@/components/layout/empty-state";
import { PageHeader } from "@/components/layout/page-header";
import { RecentList } from "@/components/recent/recent-list";
import { Button } from "@/components/ui/button";
import { SegmentLink, Segmented } from "@/components/ui/segmented";
import { WORK_KINDS, type WorkKind } from "@/config/work-kinds";
import { getRecentItems } from "@/lib/recent";

export const metadata: Metadata = { title: "Recent" };

const FILTERS = ["all", "project", "plan", "persona", "analysis"] as const;
type Filter = (typeof FILTERS)[number];
const LABELS: Record<Filter, string> = { all: "All", project: "Projects", plan: "Plans", persona: "Personas", analysis: "Analyses" };

export default async function RecentPage({ searchParams }: PageProps<"/recent">) {
  const raw = (await searchParams).type;
  const type: Filter = FILTERS.find((f) => f === raw) ?? "all";
  const all = await getRecentItems();
  const items = type === "all" ? all : all.filter((i) => i.kind === type);
  const count = (f: Filter) => (f === "all" ? all.length : all.filter((i) => i.kind === (f as WorkKind)).length);

  return (
    <>
      <PageHeader title="Recent" description="Everything you've worked on lately, newest first. Filter by type to jump straight back in." />
      {all.length === 0 ? (
        <EmptyState
          icon={Clock}
          title="Nothing here yet"
          description="Projects, plans, personas and analyses show up here as you create and edit them."
          action={
            <Button asChild variant="outline">
              <Link href="/projects/new">Create a project</Link>
            </Button>
          }
        />
      ) : (
        <>
          <div className="mb-4">
            <Segmented label="Filter by type">
              {FILTERS.map((f) => (
                <SegmentLink key={f} href={f === "all" ? "/recent" : `/recent?type=${f}`} current={type === f}>
                  {LABELS[f]}
                  <span className="text-xs text-muted-foreground tabular-nums">{count(f)}</span>
                </SegmentLink>
              ))}
            </Segmented>
          </div>
          {items.length === 0 ? (
            <p className="rounded-card border border-dashed border-input bg-secondary px-5 py-6 text-sm text-muted-foreground">
              No {LABELS[type].toLowerCase()} yet.{" "}
              {type !== "all" && WORK_KINDS[type].newPath && (
                <Link href={WORK_KINDS[type].newPath} className="font-semibold text-primary-text hover:underline">
                  Create one
                </Link>
              )}
            </p>
          ) : (
            <RecentList items={items} now={new Date().toISOString()} />
          )}
        </>
      )}
    </>
  );
}

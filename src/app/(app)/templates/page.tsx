import type { Metadata } from "next";
import Link from "next/link";
import { LayoutTemplate } from "lucide-react";
import { EmptyState } from "@/components/layout/empty-state";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Templates" };

export default function TemplatesPage() {
  return (
    <>
      <PageHeader
        title="Templates"
        description="Ready-made starting points for research plans, personas, journeys and more."
      />
      <EmptyState
        icon={LayoutTemplate}
        title="Templates are coming soon"
        description="They'll arrive alongside the research tools, so each tool can offer proven structures to start from."
        action={
          <Button asChild variant="outline">
            <Link href="/tools">Explore research tools</Link>
          </Button>
        }
      />
    </>
  );
}

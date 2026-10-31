import type { Metadata } from "next";
import { PageHeader } from "@/components/layout/page-header";
import { ToolCard } from "@/components/tools/tool-card";
import { researchTools } from "@/config/tools";

export const metadata: Metadata = { title: "Research tools" };

export default function ToolsPage() {
  return (
    <>
      <PageHeader
        title="Research tools"
        description="Six tools that take you from planning to prioritised opportunities. They are being released one at a time."
      />
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {researchTools.map((tool) => (
          <li key={tool.slug} className="[&>a]:h-full">
            <ToolCard tool={tool} />
          </li>
        ))}
      </ul>
    </>
  );
}

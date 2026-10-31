import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { ToolComingSoon } from "@/components/tools/coming-soon";
import { getTool, researchTools } from "@/config/tools";

export function generateStaticParams() {
  return researchTools.map((tool) => ({ slug: tool.slug }));
}

export async function generateMetadata({ params }: PageProps<"/tools/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  return { title: getTool(slug)?.name ?? "Research tool" };
}

export default async function ToolPage({ params }: PageProps<"/tools/[slug]">) {
  const { slug } = await params;
  const tool = getTool(slug);
  if (!tool) notFound();

  return (
    <>
      <PageHeader backHref="/tools" backLabel="Research tools" title={tool.name} />
      <ToolComingSoon tool={tool} />
    </>
  );
}

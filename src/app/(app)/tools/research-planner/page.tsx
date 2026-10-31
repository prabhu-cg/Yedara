import type { Metadata } from "next";
import Link from "next/link";
import { ClipboardList, Plus } from "lucide-react";
import { EmptyState } from "@/components/layout/empty-state";
import { PageHeader } from "@/components/layout/page-header";
import { PlanCard } from "@/components/research-planner/plan-card";
import { Button } from "@/components/ui/button";
import { listPlans } from "@/lib/research-planner/queries";

export const metadata: Metadata = { title: "Research Planner" };

export default async function ResearchPlannerPage() {
  const plans = await listPlans();

  return (
    <>
      <PageHeader
        title="Research Planner"
        description="Turn a project brief into a professional research plan, step by step. Your work saves automatically."
        actions={
          <Button asChild>
            <Link href="/tools/research-planner/new">
              <Plus /> New plan
            </Link>
          </Button>
        }
      />
      {plans.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title="No research plans yet"
          description="A plan covers your goals, methods, participants, materials and logistics, and exports to PDF, Word or Markdown. You don't need research experience to start."
          action={
            <Button asChild variant="outline">
              <Link href="/tools/research-planner/new">
                <Plus /> Create your first plan
              </Link>
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {plans.map((plan) => (
            <PlanCard key={plan.id} plan={plan} />
          ))}
        </div>
      )}
    </>
  );
}

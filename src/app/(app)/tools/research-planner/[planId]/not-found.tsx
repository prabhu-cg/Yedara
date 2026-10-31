import Link from "next/link";
import { ClipboardList } from "lucide-react";
import { EmptyState } from "@/components/layout/empty-state";
import { Button } from "@/components/ui/button";

export default function PlanNotFound() {
  return (
    <EmptyState
      icon={ClipboardList}
      title="Research plan not found"
      description="This plan doesn't exist, or you don't have access to it."
      action={
        <Button asChild>
          <Link href="/tools/research-planner">Back to research plans</Link>
        </Button>
      }
    />
  );
}

import Link from "next/link";
import { Swords } from "lucide-react";
import { EmptyState } from "@/components/layout/empty-state";
import { Button } from "@/components/ui/button";

export default function AnalysisNotFound() {
  return (
    <EmptyState icon={Swords} title="Analysis not found" description="This analysis doesn't exist, or you don't have access to it." action={<Button asChild variant="outline"><Link href="/tools/competitor-analyzer">Back to analyses</Link></Button>} />
  );
}

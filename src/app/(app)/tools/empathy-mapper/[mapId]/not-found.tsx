import Link from "next/link";
import { HeartHandshake } from "lucide-react";
import { EmptyState } from "@/components/layout/empty-state";
import { Button } from "@/components/ui/button";

export default function EmpathyMapNotFound() {
  return (
    <EmptyState icon={HeartHandshake} title="Empathy map not found" description="This empathy map doesn't exist, or you don't have access to it." action={<Button asChild variant="outline"><Link href="/tools/empathy-mapper">Back to empathy maps</Link></Button>} />
  );
}

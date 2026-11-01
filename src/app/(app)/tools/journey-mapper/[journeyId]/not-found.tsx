import Link from "next/link";
import { Route } from "lucide-react";
import { EmptyState } from "@/components/layout/empty-state";
import { Button } from "@/components/ui/button";

export default function JourneyNotFound() {
  return (
    <EmptyState icon={Route} title="Journey not found" description="This journey doesn't exist, or you don't have access to it." action={<Button asChild variant="outline"><Link href="/tools/journey-mapper">Back to journeys</Link></Button>} />
  );
}

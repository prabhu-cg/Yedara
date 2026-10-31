import Link from "next/link";
import { UsersRound } from "lucide-react";
import { EmptyState } from "@/components/layout/empty-state";
import { Button } from "@/components/ui/button";

export default function PersonaNotFound() {
  return (
    <EmptyState icon={UsersRound} title="Persona not found" description="This persona doesn't exist, or you don't have access to it." action={<Button asChild variant="outline"><Link href="/tools/persona-builder">Back to personas</Link></Button>} />
  );
}

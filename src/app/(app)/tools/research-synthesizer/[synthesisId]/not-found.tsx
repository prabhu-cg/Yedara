import Link from "next/link";
import { Layers } from "lucide-react";
import { EmptyState } from "@/components/layout/empty-state";
import { Button } from "@/components/ui/button";

export default function SynthesisNotFound() {
  return (
    <EmptyState icon={Layers} title="Synthesis not found" description="This synthesis doesn't exist, or you don't have access to it." action={<Button asChild variant="outline"><Link href="/tools/research-synthesizer">Back to syntheses</Link></Button>} />
  );
}

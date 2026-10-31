import Link from "next/link";
import { FolderSearch } from "lucide-react";
import { EmptyState } from "@/components/layout/empty-state";
import { Button } from "@/components/ui/button";

export default function ProjectNotFound() {
  return (
    <EmptyState
      icon={FolderSearch}
      title="Project not found"
      description="This project doesn't exist, or you don't have access to it."
      action={
        <Button asChild>
          <Link href="/projects">Back to projects</Link>
        </Button>
      }
    />
  );
}

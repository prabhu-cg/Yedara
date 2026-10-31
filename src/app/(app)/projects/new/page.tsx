import type { Metadata } from "next";
import { PageHeader } from "@/components/layout/page-header";
import { ProjectForm } from "@/components/projects/project-form";
import { Card, CardContent } from "@/components/ui/card";

export const metadata: Metadata = { title: "New project" };

export default function NewProjectPage() {
  return (
    <>
      <PageHeader
        backHref="/projects"
        backLabel="My Projects"
        title="Create a project"
        description="Tell us a little about the work. You can change any of this later."
      />
      <Card className="max-w-2xl">
        <CardContent className="pt-5 sm:pt-6">
          <ProjectForm mode="create" />
        </CardContent>
      </Card>
    </>
  );
}

import Link from "next/link";
import { Check, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ResearchTool } from "@/config/tools";

export function ToolComingSoon({ tool }: { tool: ResearchTool }) {
  const Icon = tool.icon;
  return (
    <Card className="max-w-2xl">
      <CardHeader className="gap-4">
        <div className="flex items-center justify-between">
          <span className="flex size-12 items-center justify-center rounded-lg bg-primary-soft text-primary">
            <Icon aria-hidden className="size-6" />
          </span>
          <Badge variant="default">
            <Clock aria-hidden className="size-3" /> Coming soon
          </Badge>
        </div>
        <div className="space-y-1.5">
          <CardTitle className="text-xl">{tool.name} is on its way</CardTitle>
          <p className="text-muted-foreground">{tool.summary}</p>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <h2 className="mb-3 text-sm font-semibold">What it will help you do</h2>
          <ul className="space-y-2">
            {tool.plannedCapabilities.map((item) => (
              <li key={item} className="flex items-start gap-2.5 text-sm text-muted-foreground">
                <Check aria-hidden className="mt-0.5 size-4 shrink-0 text-primary" />
                {item}
              </li>
            ))}
          </ul>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild>
            <Link href="/projects/new">Start a project</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/tools">See all tools</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

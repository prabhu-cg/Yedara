import Link from "next/link";
import { Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { ResearchTool } from "@/config/tools";
import { cn } from "@/lib/utils";

export function ToolCard({ tool, compact = false }: { tool: ResearchTool; compact?: boolean }) {
  const Icon = tool.icon;
  return (
    <Link
      href={`/tools/${tool.slug}`}
      className={cn(
        "group flex flex-col gap-3 rounded-xl border border-border bg-card p-5 shadow-card transition-[border-color,box-shadow] hover:border-primary hover:shadow-raised outline-none focus-visible:border-primary focus-visible:ring-[3px] focus-visible:ring-ring/50",
        compact && "p-4",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <span className="flex size-10 items-center justify-center rounded-lg bg-primary-soft text-primary-text">
          <Icon aria-hidden className="size-5" />
        </span>
        {tool.status === "coming-soon" && (
          <Badge variant="secondary">
            <Clock aria-hidden className="size-3" /> Coming soon
          </Badge>
        )}
      </div>
      <div className="space-y-1">
        <h3 className="font-semibold group-hover:text-primary-text">{tool.name}</h3>
        {!compact && <p className="text-sm text-muted-foreground">{tool.summary}</p>}
      </div>
    </Link>
  );
}

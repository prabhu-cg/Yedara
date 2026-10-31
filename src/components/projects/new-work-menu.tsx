"use client";

import Link from "next/link";
import { ChevronDown, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { WORK_KINDS } from "@/config/work-kinds";

const KINDS = ["plan", "persona", "analysis"] as const;

/** One entry point for starting research in this project; each choice opens its drawer. */
export function NewWorkMenu({ projectId }: { projectId: string }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size="sm">
          <Plus /> New <ChevronDown aria-hidden className="size-3.5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {KINDS.map((kind) => {
          const { label, icon: Icon, newPath } = WORK_KINDS[kind];
          return (
            <DropdownMenuItem key={kind} asChild>
              <Link href={`${newPath}?project=${projectId}`}>
                <Icon aria-hidden /> {label}
              </Link>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

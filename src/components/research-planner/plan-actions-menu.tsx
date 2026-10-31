"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Copy, Download, EllipsisVertical, FolderOpen, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { deletePlanAction, duplicatePlanAction } from "@/lib/research-planner/actions";

export function PlanActionsMenu({ planId, title }: { planId: string; title: string }) {
  const router = useRouter();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  const duplicate = () =>
    startTransition(async () => {
      const result = await duplicatePlanAction(planId);
      if (!result.ok) return void toast.error(result.error);
      toast.success("Plan duplicated as a new draft");
      router.push(`/tools/research-planner/${result.data.id}`);
    });

  const remove = () =>
    startTransition(async () => {
      const result = await deletePlanAction(planId);
      setConfirmOpen(false);
      if (!result.ok) return void toast.error(result.error);
      toast.success("Plan deleted");
      router.refresh();
    });

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" aria-label={`Actions for ${title}`} disabled={pending}>
            <EllipsisVertical />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem asChild>
            <Link href={`/tools/research-planner/${planId}`}>
              <FolderOpen /> Open
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={duplicate}>
            <Copy /> Duplicate
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuLabel className="text-xs font-semibold text-muted-foreground">Export</DropdownMenuLabel>
          {(
            [
              ["pdf", "PDF"],
              ["docx", "Word (.docx)"],
              ["md", "Markdown"],
            ] as const
          ).map(([format, label]) => (
            <DropdownMenuItem key={format} asChild>
              <a href={`/api/research-plans/${planId}/export?format=${format}`} download>
                <Download /> {label}
              </a>
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem destructive onSelect={() => setConfirmOpen(true)}>
            <Trash2 /> Delete plan
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this research plan?</AlertDialogTitle>
            <AlertDialogDescription>
              <strong className="text-foreground">{title}</strong> and all of its sections will be permanently deleted. This can&apos;t be undone. Duplicate it first if you want to keep a copy.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
            <Button variant="destructive" onClick={remove} disabled={pending} aria-busy={pending}>
              {pending ? "Deleting…" : "Delete plan"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

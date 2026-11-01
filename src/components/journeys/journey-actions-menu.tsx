"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Copy, EllipsisVertical, FolderOpen, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { deleteJourneyAction, duplicateJourneyAction } from "@/lib/journeys/actions";

export function JourneyActionsMenu({ journeyId, title }: { journeyId: string; title: string }) {
  const router = useRouter();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  const copy = (state?: "future") =>
    startTransition(async () => {
      const result = await duplicateJourneyAction(journeyId, state);
      if (!result.ok) return void toast.error(result.error);
      toast.success(state ? "Copied as a future-state journey" : "Journey duplicated");
      router.push(`/tools/journey-mapper/${result.data.id}`);
    });

  const remove = () =>
    startTransition(async () => {
      const result = await deleteJourneyAction(journeyId);
      setConfirmOpen(false);
      if (!result.ok) return void toast.error(result.error);
      toast.success("Journey deleted");
      router.refresh();
    });

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" aria-label={`Actions for ${title}`} disabled={pending}><EllipsisVertical /></Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem asChild><Link href={`/tools/journey-mapper/${journeyId}`}><FolderOpen /> Open</Link></DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => copy()}><Copy /> Duplicate</DropdownMenuItem>
          <DropdownMenuItem onSelect={() => copy("future")}><Copy /> Copy as future state</DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem destructive onSelect={() => setConfirmOpen(true)}><Trash2 /> Delete journey</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this journey?</AlertDialogTitle>
            <AlertDialogDescription>
              <strong className="text-foreground">{title}</strong>, with its stages and items, will be permanently deleted. This can&apos;t be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
            <Button variant="destructive" onClick={remove} disabled={pending} aria-busy={pending}>{pending ? "Deleting…" : "Delete journey"}</Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

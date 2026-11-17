"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Copy, EllipsisVertical, FolderOpen, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { deleteEmpathyMapAction, duplicateEmpathyMapAction } from "@/lib/empathy/actions";

export function EmpathyActionsMenu({ mapId, title }: { mapId: string; title: string }) {
  const router = useRouter();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  const copy = () =>
    startTransition(async () => {
      const result = await duplicateEmpathyMapAction(mapId);
      if (!result.ok) return void toast.error(result.error);
      toast.success("Empathy map duplicated");
      router.push(`/tools/empathy-mapper/${result.data.id}`);
    });

  const remove = () =>
    startTransition(async () => {
      const result = await deleteEmpathyMapAction(mapId);
      setConfirmOpen(false);
      if (!result.ok) return void toast.error(result.error);
      toast.success("Empathy map deleted");
      router.refresh();
    });

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" aria-label={`Actions for ${title}`} disabled={pending}><EllipsisVertical /></Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem asChild><Link href={`/tools/empathy-mapper/${mapId}`}><FolderOpen /> Open</Link></DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={copy}><Copy /> Duplicate</DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem destructive onSelect={() => setConfirmOpen(true)}><Trash2 /> Delete empathy map</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this empathy map?</AlertDialogTitle>
            <AlertDialogDescription>
              <strong className="text-foreground">{title}</strong>, with all of its notes, will be permanently deleted. This can&apos;t be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
            <Button variant="destructive" onClick={remove} disabled={pending} aria-busy={pending}>{pending ? "Deleting…" : "Delete empathy map"}</Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

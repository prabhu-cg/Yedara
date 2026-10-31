"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Archive, ArchiveRestore, Ellipsis, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  archiveProjectAction,
  deleteProjectAction,
  restoreProjectAction,
} from "@/lib/projects/actions";
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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function ProjectActionsMenu({
  projectId,
  projectName,
  archived,
  redirectAfterDelete,
  includeEdit = true,
}: {
  projectId: string;
  projectName: string;
  archived: boolean;
  /** Where to go after deleting (used on the detail page). Defaults to refreshing in place. */
  redirectAfterDelete?: string;
  includeEdit?: boolean;
}) {
  const router = useRouter();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  function run(action: () => Promise<{ ok: boolean; error?: string }>, success: string) {
    startTransition(async () => {
      const result = await action();
      if (!result.ok) {
        toast.error(result.error ?? "Something went wrong. Please try again.");
        return;
      }
      toast.success(success);
      router.refresh();
    });
  }

  function confirmDelete() {
    startTransition(async () => {
      const result = await deleteProjectAction(projectId);
      if (!result.ok) {
        toast.error(result.error);
        setConfirmOpen(false);
        return;
      }
      toast.success("Project deleted");
      setConfirmOpen(false);
      if (redirectAfterDelete) router.push(redirectAfterDelete);
      router.refresh();
    });
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" aria-label={`Actions for ${projectName}`} disabled={pending}>
            <Ellipsis />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {includeEdit && (
            <DropdownMenuItem asChild>
              <Link href={`/projects/${projectId}/edit`}>
                <Pencil /> Edit details
              </Link>
            </DropdownMenuItem>
          )}
          {archived ? (
            <DropdownMenuItem
              onSelect={() => run(() => restoreProjectAction(projectId), "Project restored")}
            >
              <ArchiveRestore /> Restore project
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem
              onSelect={() => run(() => archiveProjectAction(projectId), "Project archived")}
            >
              <Archive /> Archive project
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem destructive onSelect={() => setConfirmOpen(true)}>
            <Trash2 /> Delete project
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this project?</AlertDialogTitle>
            <AlertDialogDescription>
              <strong className="text-foreground">{projectName}</strong> and everything in it will be
              permanently deleted. This can&apos;t be undone. If you might need it later, archive it
              instead.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
            <Button variant="destructive" onClick={confirmDelete} disabled={pending} aria-busy={pending}>
              {pending ? "Deleting…" : "Delete project"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

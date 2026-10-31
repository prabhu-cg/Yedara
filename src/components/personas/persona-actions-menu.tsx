"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Copy, Download, Ellipsis, FolderOpen, GitCompareArrows, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { deletePersonaAction, duplicatePersonaAction } from "@/lib/personas/actions";

export function PersonaActionsMenu({ personaId, name }: { personaId: string; name: string }) {
  const router = useRouter();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  const duplicate = () =>
    startTransition(async () => {
      const result = await duplicatePersonaAction(personaId);
      if (!result.ok) return void toast.error(result.error);
      toast.success("Persona duplicated as a new draft");
      router.push(`/tools/persona-builder/${result.data.id}`);
    });
  const remove = () =>
    startTransition(async () => {
      const result = await deletePersonaAction(personaId);
      setConfirmOpen(false);
      if (!result.ok) return void toast.error(result.error);
      toast.success("Persona deleted");
      router.refresh();
    });

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" aria-label={`Actions for ${name}`} disabled={pending}><Ellipsis /></Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem asChild><Link href={`/tools/persona-builder/${personaId}`}><FolderOpen /> Open</Link></DropdownMenuItem>
          <DropdownMenuItem onSelect={duplicate}><Copy /> Duplicate</DropdownMenuItem>
          <DropdownMenuItem asChild><Link href={`/tools/persona-builder/compare?ids=${personaId}`}><GitCompareArrows /> Compare</Link></DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuLabel className="text-xs font-semibold text-muted-foreground">Export</DropdownMenuLabel>
          {([["pdf", "PDF"], ["docx", "Word (.docx)"], ["md", "Markdown"]] as const).map(([format, label]) => (
            <DropdownMenuItem key={format} asChild>
              <a href={`/api/personas/${personaId}/export?format=${format}`} download><Download /> {label}</a>
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem destructive onSelect={() => setConfirmOpen(true)}><Trash2 /> Delete persona</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this persona?</AlertDialogTitle>
            <AlertDialogDescription>
              <strong className="text-foreground">{name}</strong> and all of its evidence will be permanently deleted. This can&apos;t be undone. Duplicate it first if you want to keep a copy.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
            <Button variant="destructive" onClick={remove} disabled={pending} aria-busy={pending}>{pending ? "Deleting…" : "Delete persona"}</Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Download, EllipsisVertical, FolderOpen, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { deleteSynthesisAction } from "@/lib/synthesizer/actions";

export function SynthesisActionsMenu({ synthesisId, title }: { synthesisId: string; title: string }) {
  const router = useRouter();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  const remove = () =>
    startTransition(async () => {
      const result = await deleteSynthesisAction(synthesisId);
      setConfirmOpen(false);
      if (!result.ok) return void toast.error(result.error);
      toast.success("Synthesis deleted");
      router.refresh();
    });

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" aria-label={`Actions for ${title}`} disabled={pending}><EllipsisVertical /></Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem asChild><Link href={`/tools/research-synthesizer/${synthesisId}`}><FolderOpen /> Open</Link></DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuLabel className="text-xs font-semibold text-muted-foreground">Export</DropdownMenuLabel>
          {([["pdf", "PDF"], ["docx", "Word (.docx)"], ["md", "Markdown"]] as const).map(([format, label]) => (
            <DropdownMenuItem key={format} asChild>
              <a href={`/api/syntheses/${synthesisId}/export?format=${format}`} download><Download /> {label}</a>
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem destructive onSelect={() => setConfirmOpen(true)}><Trash2 /> Delete synthesis</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this synthesis?</AlertDialogTitle>
            <AlertDialogDescription>
              <strong className="text-foreground">{title}</strong>, with its research material, board and insights, will be permanently deleted. This can&apos;t be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
            <Button variant="destructive" onClick={remove} disabled={pending} aria-busy={pending}>{pending ? "Deleting…" : "Delete synthesis"}</Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

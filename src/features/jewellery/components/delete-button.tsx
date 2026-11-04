"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { deleteJewellery } from "@/features/jewellery/service";
import { Button } from "@/components/ui/button";

export function DeleteButton({ id, name }: { id: string; name: string }) {
  const ref = useRef<HTMLDialogElement>(null);
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  const confirm = async () => {
    setBusy(true);
    const res = await deleteJewellery(id);
    setBusy(false);
    if (!res.ok) return void toast.error(res.error ?? "Could not delete");
    ref.current?.close();
    toast.success("Jewellery deleted");
    router.push("/collection");
  };

  return (
    <>
      <Button variant="outline" onClick={() => ref.current?.showModal()} className="text-destructive"><Trash2 className="h-4 w-4" />Delete</Button>
      <dialog ref={ref} className="w-[90vw] max-w-sm rounded-lg border border-border bg-card p-5 text-card-foreground backdrop:bg-black/50">
        <h2 className="font-serif text-lg font-semibold">Delete this jewellery?</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          &ldquo;{name}&rdquo;, its photos and bill will be permanently removed. This cannot be undone. If you sold or gave it away, keep the record instead.
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="outline" onClick={() => ref.current?.close()} disabled={busy}>Cancel</Button>
          <Button variant="destructive" onClick={confirm} disabled={busy}>{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Delete"}</Button>
        </div>
      </dialog>
    </>
  );
}

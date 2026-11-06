"use client";

import { FileText } from "lucide-react";
import type { ItemFiles } from "@/features/items/use-item-files";

/** Upload, replace or remove the purchase bill (PDF or photo). */
export function BillPicker({ files, disabled }: { files: ItemFiles; disabled?: boolean }) {
  return (
    <div className="space-y-2">
      <label className="inline-flex h-11 cursor-pointer items-center gap-2 rounded-md glass-control px-4 text-sm font-medium hover:bg-foreground/5">
        <FileText className="h-5 w-5" />{files.bill || files.hasSavedBill ? "Replace bill" : "Upload purchase bill (optional)"}
        <input type="file" accept="application/pdf,image/jpeg,image/png,image/webp" className="sr-only" disabled={disabled}
          onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) files.pickBill(f); }} />
      </label>
      {files.bill && <p className="text-sm">{files.bill.name} <button type="button" className="ml-2 text-destructive underline" onClick={files.clearBill}>remove</button></p>}
      {!files.bill && files.hasSavedBill && (
        <p className="text-sm">Bill attached <button type="button" className="ml-2 text-destructive underline" onClick={files.removeSavedBill}>remove</button></p>
      )}
    </div>
  );
}

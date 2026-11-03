"use client";

import { useActionState, useEffect } from "react";
import { toast } from "sonner";
import { saveRate, type RateState } from "@/app/actions/rates";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { formatDate } from "@/lib/utils";
import type { Purity } from "@/lib/gold";

export function RateRow({ purity, current, updatedAt }: { purity: Purity; current?: number; updatedAt?: string }) {
  const [state, action, pending] = useActionState<RateState, FormData>(saveRate, undefined);
  useEffect(() => {
    if (state?.message) toast.success(state.message);
    if (state?.error) toast.error(state.error);
  }, [state]);
  return (
    <form action={action} className="flex items-end gap-2">
      <input type="hidden" name="purity" value={purity} />
      <Field label={`${purity} — ₹ per gram`} hint={updatedAt ? `Updated ${formatDate(updatedAt)} · manual` : "Not set"} className="flex-1">
        <Input name="rate_per_gram" type="number" inputMode="decimal" step="any" min="0" defaultValue={current} required />
      </Field>
      <Button type="submit" disabled={pending} className="mb-[1.375rem]">{pending ? "Saving…" : "Save"}</Button>
    </form>
  );
}

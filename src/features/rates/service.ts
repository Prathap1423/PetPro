"use client";

import { ratesSchema } from "@/domain/schemas";
import { notifyChanged } from "@/storage/changes";
import { currentUserId, supabase } from "@/storage/supabase";

export type RateState = { error?: string; message?: string } | undefined;

export async function saveRate(_: RateState, formData: FormData): Promise<RateState> {
  const parsed = ratesSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { purity, rate_per_gram } = parsed.data;
  try {
    const user_id = await currentUserId();
    const { error } = await supabase.from("gold_rates")
      .upsert({ user_id, purity, rate_per_gram, source: "manual" }, { onConflict: "user_id,purity" });
    if (error) return { error: error.message };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Could not save the rate" };
  }
  notifyChanged();
  return { message: `${purity} rate saved` };
}

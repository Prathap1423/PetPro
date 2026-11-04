"use client";

import { updateVault } from "@/lib/store";
import { ratesSchema } from "@/lib/validation";

export type RateState = { error?: string; message?: string } | undefined;

export async function saveRate(_: RateState, formData: FormData): Promise<RateState> {
  const parsed = ratesSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { purity, rate_per_gram } = parsed.data;
  await updateVault((v) => {
    const updated_at = new Date().toISOString();
    const existing = v.rates.find((r) => r.purity === purity);
    if (existing) Object.assign(existing, { rate_per_gram, source: "manual", updated_at });
    else v.rates.push({ id: crypto.randomUUID(), purity, rate_per_gram, source: "manual", updated_at });
  });
  return { message: `${purity} rate saved` };
}

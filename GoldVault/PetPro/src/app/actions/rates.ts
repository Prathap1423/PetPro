"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { ratesSchema } from "@/lib/validation";

export type RateState = { error?: string; message?: string } | undefined;

export async function saveRate(_: RateState, formData: FormData): Promise<RateState> {
  const parsed = ratesSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in" };
  const { error } = await supabase
    .from("gold_rates")
    .upsert({ user_id: user.id, ...parsed.data, source: "manual" }, { onConflict: "user_id,purity" });
  if (error) return { error: error.message };
  revalidatePath("/", "layout");
  return { message: `${parsed.data.purity} rate saved` };
}

"use client";

import { rowsOf, supabase } from "@/storage/supabase";
import type { Purity, RateMap } from "@/domain/gold";
import type { GoldRate } from "@/domain/types";

export async function getRates(): Promise<{ rates: RateMap; rows: GoldRate[] }> {
  const rows = (await supabase.from("gold_rates").select("id, purity, rate_per_gram, source, updated_at").then(rowsOf))
    .map((r) => ({ ...r, rate_per_gram: Number(r.rate_per_gram) })) as GoldRate[];
  const rates: RateMap = {};
  rows.forEach((r) => { rates[r.purity as Purity] = r.rate_per_gram; });
  return { rates, rows };
}

"use client";

import { readVault } from "@/storage/vault";
import type { Purity, RateMap } from "@/domain/gold";
import type { GoldRate } from "@/domain/types";

export async function getRates(): Promise<{ rates: RateMap; rows: GoldRate[] }> {
  const rows = (await readVault()).rates;
  const rates: RateMap = {};
  rows.forEach((r) => { rates[r.purity as Purity] = Number(r.rate_per_gram); });
  return { rates, rows };
}

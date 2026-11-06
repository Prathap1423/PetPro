"use client";

import { getItem, listItems, withNumbers } from "@/features/items/queries";
import { JEWELLERY } from "@/features/items/tables";
import type { Jewellery } from "@/domain/types";

export interface JewelleryWithCover extends Jewellery {
  cover_url: string | null;
}

const NUMERIC = [
  "gross_weight", "non_gold_weight", "net_gold_weight", "gold_rate_at_purchase",
  "making_charges", "wastage_charges", "tax", "other_charges", "purchase_price",
] as const;

const toJewellery = (row: Record<string, unknown>) => withNumbers<Jewellery>(row, NUMERIC);

export const getJewellery = (): Promise<JewelleryWithCover[]> => listItems(JEWELLERY, toJewellery);
export const getJewelleryById = (id: string) => getItem(JEWELLERY, id, toJewellery);

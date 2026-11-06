"use client";

import { getItem, listItems, withNumbers } from "@/features/items/queries";
import { DIAMONDS } from "@/features/items/tables";
import type { Diamond } from "@/domain/types";

export interface DiamondWithCover extends Diamond {
  cover_url: string | null;
}

const toDiamond = (row: Record<string, unknown>) => withNumbers<Diamond>(row, ["carat", "stone_count", "purchase_price", "current_value"]);

export const getDiamonds = (): Promise<DiamondWithCover[]> => listItems(DIAMONDS, toDiamond);
export const getDiamondById = (id: string) => getItem(DIAMONDS, id, toDiamond);

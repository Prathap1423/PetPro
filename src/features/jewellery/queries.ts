"use client";

import { fileUrl, fileUrls } from "@/storage/files";
import { must, rowsOf, supabase } from "@/storage/supabase";
import type { Jewellery, JewelleryImage } from "@/domain/types";

export interface JewelleryWithCover extends Jewellery {
  cover_url: string | null;
}

const NUMERIC = [
  "gross_weight", "non_gold_weight", "net_gold_weight", "gold_rate_at_purchase",
  "making_charges", "wastage_charges", "tax", "other_charges", "purchase_price",
] as const;

/** Postgres numeric columns may arrive as strings; the app works with numbers. */
export function toJewellery(row: Record<string, unknown>): Jewellery {
  const j = { ...row } as Record<string, unknown>;
  for (const k of NUMERIC) if (j[k] !== null && j[k] !== undefined) j[k] = Number(j[k]);
  return j as unknown as Jewellery;
}

export async function getJewellery(): Promise<JewelleryWithCover[]> {
  const [rows, covers] = await Promise.all([
    supabase.from("jewellery").select("*").order("purchase_date", { ascending: false }).then(rowsOf),
    supabase.from("jewellery_images").select("jewellery_id, storage_path").eq("is_cover", true).then(rowsOf),
  ]);
  const coverByItem = new Map(covers.map((c) => [c.jewellery_id as string, c.storage_path as string]));
  const urls = await fileUrls("jewellery-images", [...coverByItem.values()]);
  return rows.map((r) => {
    const item = toJewellery(r);
    const cover = coverByItem.get(item.id);
    return { ...item, cover_url: cover ? urls.get(cover) ?? null : null };
  });
}

export async function getJewelleryById(id: string) {
  const row = await supabase.from("jewellery").select("*").eq("id", id).maybeSingle().then(must);
  if (!row) return null;
  const item = toJewellery(row);
  const imgs = (await supabase.from("jewellery_images").select("id, jewellery_id, storage_path, is_cover")
    .eq("jewellery_id", id).order("created_at").then(rowsOf)) as JewelleryImage[];
  const urls = await fileUrls("jewellery-images", imgs.map((i) => i.storage_path));
  return {
    item,
    images: imgs.map((i) => ({ ...i, url: urls.get(i.storage_path) ?? null })),
    billUrl: item.bill_path ? await fileUrl("jewellery-bills", item.bill_path) : null,
  };
}

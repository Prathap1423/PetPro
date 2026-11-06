"use client";

import { fileUrl, fileUrls } from "@/storage/files";
import { must, rowsOf, supabase } from "@/storage/supabase";
import type { ItemTables } from "@/features/items/tables";

export interface ItemImage {
  id: string;
  storage_path: string;
  is_cover: boolean;
  url: string | null;
}

/** Postgres numeric columns may arrive as strings; the app works with numbers. */
export function withNumbers<T>(row: Record<string, unknown>, numeric: readonly string[]): T {
  const r = { ...row };
  for (const k of numeric) if (r[k] !== null && r[k] !== undefined) r[k] = Number(r[k]);
  return r as T;
}

/** All items of one kind, newest purchase first, each with its cover photo URL. */
export async function listItems<T extends { id: string }>(t: ItemTables, toItem: (row: Record<string, unknown>) => T) {
  const [rows, covers] = await Promise.all([
    supabase.from(t.items).select("*").order("purchase_date", { ascending: false }).then(rowsOf),
    supabase.from(t.images).select(`${t.fk}, storage_path`).eq("is_cover", true).then(rowsOf),
  ]);
  const coverByItem = new Map((covers as unknown as Record<string, string>[]).map((c) => [c[t.fk], c.storage_path]));
  const urls = await fileUrls("jewellery-images", [...coverByItem.values()]);
  return rows.map((r) => {
    const item = toItem(r);
    const cover = coverByItem.get(item.id);
    return { ...item, cover_url: cover ? urls.get(cover) ?? null : null };
  });
}

/** One item with all its photos (oldest first) and its bill URL; null when it doesn't exist. */
export async function getItem<T extends { bill_path: string | null }>(t: ItemTables, id: string, toItem: (row: Record<string, unknown>) => T) {
  const row = await supabase.from(t.items).select("*").eq("id", id).maybeSingle().then(must);
  if (!row) return null;
  const item = toItem(row);
  const imgs = await supabase.from(t.images).select("id, storage_path, is_cover").eq(t.fk, id).order("created_at").then(rowsOf);
  const urls = await fileUrls("jewellery-images", imgs.map((i) => i.storage_path));
  return {
    item,
    images: imgs.map((i): ItemImage => ({ ...i, url: urls.get(i.storage_path) ?? null })),
    billUrl: item.bill_path ? await fileUrl("jewellery-bills", item.bill_path) : null,
  };
}

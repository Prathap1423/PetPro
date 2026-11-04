"use client";

import { useEffect, useState } from "react";
import { fileUrl, readVault, subscribe } from "@/lib/store";
import type { RateMap, Purity } from "@/lib/gold";
import type { GoldRate, Jewellery, JewelleryImage } from "@/types/db";

export interface JewelleryWithCover extends Jewellery {
  cover_url: string | null;
}

export async function getJewellery(): Promise<JewelleryWithCover[]> {
  const { jewellery, images } = await readVault();
  const coverByItem = new Map(images.filter((i) => i.is_cover).map((i) => [i.jewellery_id, i.storage_path]));
  const sorted = [...jewellery].sort((a, b) => b.purchase_date.localeCompare(a.purchase_date));
  return Promise.all(sorted.map(async (i) => {
    const cover = coverByItem.get(i.id);
    return { ...i, cover_url: cover ? await fileUrl("jewellery-images", cover) : null };
  }));
}

export async function getJewelleryById(id: string) {
  const vault = await readVault();
  const item = vault.jewellery.find((j) => j.id === id);
  if (!item) return null;
  const imgs: JewelleryImage[] = vault.images
    .filter((i) => i.jewellery_id === id)
    .sort((a, b) => a.created_at.localeCompare(b.created_at))
    .map(({ id, jewellery_id, storage_path, is_cover }) => ({ id, jewellery_id, storage_path, is_cover }));
  return {
    item,
    images: await Promise.all(imgs.map(async (i) => ({ ...i, url: await fileUrl("jewellery-images", i.storage_path) }))),
    billUrl: item.bill_path ? await fileUrl("jewellery-bills", item.bill_path) : null,
  };
}

export async function getRates(): Promise<{ rates: RateMap; rows: GoldRate[] }> {
  const rows = (await readVault()).rates;
  const rates: RateMap = {};
  rows.forEach((r) => { rates[r.purity as Purity] = Number(r.rate_per_gram); });
  return { rates, rows };
}

/** Loads data from the vault and reloads it whenever the vault changes. Undefined while loading. */
export function useVaultData<T>(load: () => Promise<T>, deps: unknown[] = []): T | undefined {
  const [data, setData] = useState<T>();
  useEffect(() => {
    let live = true;
    const run = () => { load().then((d) => { if (live) setData(d); }); };
    run();
    const unsubscribe = subscribe(run);
    return () => { live = false; unsubscribe(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return data;
}

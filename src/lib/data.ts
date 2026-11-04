import "server-only";
import { fileUrl, readVault } from "@/lib/store";
import type { RateMap, Purity } from "@/lib/gold";
import type { GoldRate, Jewellery, JewelleryImage } from "@/types/db";

export interface JewelleryWithCover extends Jewellery {
  cover_url: string | null;
}

export async function getJewellery(): Promise<JewelleryWithCover[]> {
  const { jewellery, images } = await readVault();
  const coverByItem = new Map(images.filter((i) => i.is_cover).map((i) => [i.jewellery_id, i.storage_path]));
  return [...jewellery]
    .sort((a, b) => b.purchase_date.localeCompare(a.purchase_date))
    .map((i) => {
      const cover = coverByItem.get(i.id);
      return { ...i, cover_url: cover ? fileUrl("jewellery-images", cover) : null };
    });
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
    images: imgs.map((i) => ({ ...i, url: fileUrl("jewellery-images", i.storage_path) })),
    billUrl: item.bill_path ? fileUrl("jewellery-bills", item.bill_path) : null,
  };
}

export async function getRates(): Promise<{ rates: RateMap; rows: GoldRate[] }> {
  const rows = (await readVault()).rates;
  const rates: RateMap = {};
  rows.forEach((r) => { rates[r.purity as Purity] = Number(r.rate_per_gram); });
  return { rates, rows };
}

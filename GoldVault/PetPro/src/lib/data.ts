import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { RateMap, Purity } from "@/lib/gold";
import type { GoldRate, Jewellery, JewelleryImage } from "@/types/db";

export interface JewelleryWithCover extends Jewellery {
  cover_url: string | null;
}

const SIGNED_URL_TTL = 60 * 60; // 1 hour — images are never public.

export async function getJewellery(): Promise<JewelleryWithCover[]> {
  const supabase = await createClient();
  const { data: items, error } = await supabase.from("jewellery").select("*").order("purchase_date", { ascending: false });
  if (error) throw new Error(error.message);
  if (!items?.length) return [];
  const { data: covers } = await supabase.from("jewellery_images").select("jewellery_id, storage_path").eq("is_cover", true);
  const paths = (covers ?? []).map((c) => c.storage_path);
  const urlByPath = new Map<string, string>();
  if (paths.length) {
    const { data: signed } = await supabase.storage.from("jewellery-images").createSignedUrls(paths, SIGNED_URL_TTL);
    signed?.forEach((s) => { if (s.path && s.signedUrl) urlByPath.set(s.path, s.signedUrl); });
  }
  const pathByItem = new Map((covers ?? []).map((c) => [c.jewellery_id, c.storage_path]));
  return (items as Jewellery[]).map((i) => ({ ...i, cover_url: urlByPath.get(pathByItem.get(i.id) ?? "") ?? null }));
}

export async function getJewelleryById(id: string) {
  const supabase = await createClient();
  const { data: item } = await supabase.from("jewellery").select("*").eq("id", id).maybeSingle();
  if (!item) return null;
  const { data: images } = await supabase.from("jewellery_images").select("id, jewellery_id, storage_path, is_cover").eq("jewellery_id", id).order("created_at");
  const imgs = (images ?? []) as JewelleryImage[];
  const urls = new Map<string, string>();
  if (imgs.length) {
    const { data: signed } = await supabase.storage.from("jewellery-images").createSignedUrls(imgs.map((i) => i.storage_path), SIGNED_URL_TTL);
    signed?.forEach((s) => { if (s.path && s.signedUrl) urls.set(s.path, s.signedUrl); });
  }
  let billUrl: string | null = null;
  if (item.bill_path) {
    const { data } = await supabase.storage.from("jewellery-bills").createSignedUrl(item.bill_path, SIGNED_URL_TTL);
    billUrl = data?.signedUrl ?? null;
  }
  return {
    item: item as Jewellery,
    images: imgs.map((i) => ({ ...i, url: urls.get(i.storage_path) ?? null })),
    billUrl,
  };
}

export async function getRates(): Promise<{ rates: RateMap; rows: GoldRate[] }> {
  const supabase = await createClient();
  const { data } = await supabase.from("gold_rates").select("id, purity, rate_per_gram, source, updated_at");
  const rows = (data ?? []) as GoldRate[];
  const rates: RateMap = {};
  rows.forEach((r) => { rates[r.purity as Purity] = Number(r.rate_per_gram); });
  return { rates, rows };
}

"use client";

import { supabase } from "@/storage/supabase";

export type Bucket = "jewellery-images" | "jewellery-bills";

const UUID = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";
/** Paths are "<user id>/<jewellery id>/<uuid>.jpg" or "<user id>/<jewellery id>/bill-<uuid>.(jpg|pdf)". */
const FILE_PATH = new RegExp(`^${UUID}/${UUID}/(?:${UUID}\\.jpg|bill-${UUID}\\.(?:jpg|pdf))$`, "i");
export const isFilePath = (p: string) => FILE_PATH.test(p);

export async function putFile(bucket: Bucket, path: string, file: Blob) {
  if (!isFilePath(path)) throw new Error("Invalid file path");
  const { error } = await supabase.storage.from(bucket).upload(path, file, { contentType: file.type, upsert: false });
  if (error) throw new Error(error.message);
}

export async function removeFiles(bucket: Bucket, paths: string[]) {
  if (!paths.length) return;
  paths.forEach((p) => urls.delete(`${bucket}/${p}`));
  const { error } = await supabase.storage.from(bucket).remove(paths);
  if (error) throw new Error(error.message);
}

// Buckets are private, so files open through signed URLs. They are cached until shortly before expiry.
const URL_SECONDS = 60 * 60;
const urls = new Map<string, { url: string; expires: number }>();

/** Signed URLs for many files in one request; missing files map to null. */
export async function fileUrls(bucket: Bucket, paths: string[]): Promise<Map<string, string | null>> {
  const out = new Map<string, string | null>();
  const now = Date.now();
  const missing = paths.filter((p) => {
    const hit = urls.get(`${bucket}/${p}`);
    if (hit && hit.expires > now) out.set(p, hit.url);
    return !out.has(p);
  });
  if (missing.length) {
    const { data, error } = await supabase.storage.from(bucket).createSignedUrls(missing, URL_SECONDS);
    if (error) throw new Error(error.message);
    data.forEach((d, i) => {
      const p = d.path ?? missing[i];
      out.set(p, d.signedUrl || null);
      if (d.signedUrl) urls.set(`${bucket}/${p}`, { url: d.signedUrl, expires: now + (URL_SECONDS - 300) * 1000 });
    });
  }
  return out;
}

export async function fileUrl(bucket: Bucket, path: string) {
  return (await fileUrls(bucket, [path])).get(path) ?? null;
}

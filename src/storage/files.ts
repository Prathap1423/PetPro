"use client";

import { request } from "@/storage/db";

export type Bucket = "jewellery-images" | "jewellery-bills";

const UUID = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";
/** Paths are always "<jewellery id>/<uuid>.jpg" or "<jewellery id>/bill-<uuid>.(jpg|pdf)". */
const FILE_PATH = new RegExp(`^${UUID}/(?:${UUID}\\.jpg|bill-${UUID}\\.(?:jpg|pdf))$`, "i");
export const isFilePath = (p: string) => FILE_PATH.test(p);

const fileKey = (bucket: Bucket, p: string) => `${bucket}/${p}`;

export async function putFile(bucket: Bucket, p: string, file: Blob) {
  if (!isFilePath(p)) throw new Error("Invalid file path");
  await request("files", "readwrite", (s) => s.add(file, fileKey(bucket, p)));
}

export async function removeFiles(bucket: Bucket, paths: string[]) {
  await Promise.all(paths.map((p) => {
    revokeUrl(fileKey(bucket, p));
    return request("files", "readwrite", (s) => s.delete(fileKey(bucket, p)));
  }));
}

// Object URLs are cached so re-renders reuse them; they are revoked when the file is removed.
const urls = new Map<string, string>();

function revokeUrl(key: string) {
  const url = urls.get(key);
  if (url) URL.revokeObjectURL(url);
  urls.delete(key);
}

export async function fileUrl(bucket: Bucket, p: string): Promise<string | null> {
  const key = fileKey(bucket, p);
  const cached = urls.get(key);
  if (cached) return cached;
  const blob = await request<Blob | undefined>("files", "readonly", (s) => s.get(key));
  if (!blob) return null;
  const url = URL.createObjectURL(blob);
  urls.set(key, url);
  return url;
}

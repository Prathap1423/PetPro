"use client";

import type { GoldRate, Jewellery, JewelleryImage } from "@/types/db";

/**
 * Everything lives in this browser's IndexedDB: one "vault" record holding all the
 * jewellery/rates data, plus a "files" store holding photos and bills as blobs.
 */
const DB_NAME = "gold-vault";
const VAULT_KEY = "main";

export interface StoredImage extends JewelleryImage {
  created_at: string;
}

export interface Transaction {
  id: string;
  jewellery_id: string;
  transaction_type: "purchase" | "sale" | "gift" | "exchange";
  transaction_date: string;
  amount: number;
  created_at: string;
}

export interface Vault {
  jewellery: Jewellery[];
  images: StoredImage[];
  rates: GoldRate[];
  transactions: Transaction[];
}

const empty = (): Vault => ({ jewellery: [], images: [], rates: [], transactions: [] });

let dbPromise: Promise<IDBDatabase> | null = null;

function db(): Promise<IDBDatabase> {
  dbPromise ??= new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      req.result.createObjectStore("vault");
      req.result.createObjectStore("files");
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

function request<T>(store: "vault" | "files", mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest): Promise<T> {
  return db().then((d) => new Promise<T>((resolve, reject) => {
    const tx = d.transaction(store, mode);
    const req = fn(tx.objectStore(store));
    tx.oncomplete = () => resolve(req.result as T);
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  }));
}

const load = async (): Promise<Vault> => ({ ...empty(), ...(await request<Vault | undefined>("vault", "readonly", (s) => s.get(VAULT_KEY))) });

// ---------- change notifications (this tab and other open tabs) ----------

const listeners = new Set<() => void>();
const channel = typeof BroadcastChannel !== "undefined" ? new BroadcastChannel(DB_NAME) : null;
channel?.addEventListener("message", () => listeners.forEach((l) => l()));

export function subscribe(fn: () => void) {
  listeners.add(fn);
  return () => { listeners.delete(fn); };
}

function changed() {
  listeners.forEach((l) => l());
  channel?.postMessage("changed");
}

// Writes are serialised so two saves can't interleave a read-modify-write.
let queue: Promise<unknown> = Promise.resolve();

export function readVault(): Promise<Vault> {
  return queue.then(load);
}

/** Runs fn on a fresh copy of the vault and saves it, unless fn throws. */
export function updateVault<T>(fn: (v: Vault) => T | Promise<T>): Promise<T> {
  const run = queue.then(async () => {
    const vault = await load();
    const result = await fn(vault);
    await request("vault", "readwrite", (s) => s.put(vault, VAULT_KEY));
    changed();
    // Ask the browser not to evict the vault when it is low on space.
    navigator.storage?.persist?.().catch(() => {});
    return result;
  });
  queue = run.catch(() => {});
  return run;
}

// ---------- files ----------

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

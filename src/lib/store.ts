import "server-only";
import { promises as fs } from "node:fs";
import path from "node:path";
import type { GoldRate, Jewellery, JewelleryImage } from "@/types/db";

/** Everything lives on disk under ./data: one JSON file for records, plus an uploads folder for files. */
const DATA_DIR = path.join(process.cwd(), "data");
const DB_FILE = path.join(DATA_DIR, "vault.json");
const UPLOAD_DIR = path.join(DATA_DIR, "uploads");

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

async function load(): Promise<Vault> {
  try {
    return { ...empty(), ...JSON.parse(await fs.readFile(DB_FILE, "utf8")) };
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return empty();
    throw err;
  }
}

// Writes are serialised so two requests can't interleave a read-modify-write.
let queue: Promise<unknown> = Promise.resolve();

export function readVault(): Promise<Vault> {
  return queue.then(load);
}

/** Runs fn on a fresh copy of the vault and saves it, unless fn throws. */
export function updateVault<T>(fn: (v: Vault) => T | Promise<T>): Promise<T> {
  const run = queue.then(async () => {
    const vault = await load();
    const result = await fn(vault);
    await fs.mkdir(DATA_DIR, { recursive: true });
    const tmp = `${DB_FILE}.${process.pid}.tmp`;
    await fs.writeFile(tmp, JSON.stringify(vault, null, 2));
    await fs.rename(tmp, DB_FILE);
    return result;
  });
  queue = run.catch(() => {});
  return run;
}

// ---------- files ----------

export const BUCKETS = ["jewellery-images", "jewellery-bills"] as const;
export type Bucket = (typeof BUCKETS)[number];

const UUID = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";
/** Paths are always "<jewellery id>/<uuid>.jpg" or "<jewellery id>/bill-<uuid>.(jpg|pdf)". */
const FILE_PATH = new RegExp(`^${UUID}/(?:${UUID}\\.jpg|bill-${UUID}\\.(?:jpg|pdf))$`, "i");

export const isBucket = (b: string): b is Bucket => (BUCKETS as readonly string[]).includes(b);
export const isFilePath = (p: string) => FILE_PATH.test(p);

/** Absolute location of a stored file; callers must validate bucket and path first. */
export const diskPath = (bucket: Bucket, p: string) => path.join(UPLOAD_DIR, bucket, p);

export const fileUrl = (bucket: Bucket, p: string) => `/api/files/${bucket}/${p}`;

export async function removeFiles(bucket: Bucket, paths: string[]) {
  await Promise.all(paths.filter(isFilePath).map((p) => fs.rm(diskPath(bucket, p), { force: true })));
}

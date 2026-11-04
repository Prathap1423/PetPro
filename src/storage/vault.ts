"use client";

import { DB_NAME, request } from "@/storage/db";
import type { GoldRate, Jewellery, StoredImage, Transaction } from "@/domain/types";

const VAULT_KEY = "main";

export interface Vault {
  jewellery: Jewellery[];
  images: StoredImage[];
  rates: GoldRate[];
  transactions: Transaction[];
}

const empty = (): Vault => ({ jewellery: [], images: [], rates: [], transactions: [] });

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

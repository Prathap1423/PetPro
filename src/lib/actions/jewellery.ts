"use client";

import { isFilePath, removeFiles, updateVault, type Vault } from "@/lib/store";
import { jewellerySchema, withNetWeight, type JewelleryInput } from "@/lib/validation";
import type { Jewellery } from "@/types/db";

export type ActionResult =
  | { ok: true; id: string }
  | { ok: false; error: string; fieldErrors?: Record<string, string> };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_IMAGES = 10;

/** Thrown inside a vault update to abort it without saving. */
class Rejected extends Error {}

/** Files must live under "<jewellery>/" so an item can never point at another item's files. */
function pathsOk(paths: string[], jewelleryId: string) {
  return paths.every((p) => p.startsWith(`${jewelleryId}/`) && isFilePath(p));
}

const norm = (s: string | null) => (s ?? "").trim().toLowerCase();

/** Same invoice number, or same name + date + gross weight, cannot be entered twice. */
function duplicateOf(v: Vault, data: JewelleryInput, selfId: string) {
  return v.jewellery.some((j) => j.id !== selfId && (
    (norm(data.invoice_number) !== "" && norm(j.invoice_number) === norm(data.invoice_number)) ||
    (norm(j.name) === norm(data.name) && j.purchase_date === data.purchase_date && j.gross_weight === data.gross_weight)
  ));
}
const DUPLICATE = "This jewellery looks like a duplicate (same invoice number, or same name, date and weight).";

export interface SaveInput {
  id: string;
  values: unknown;
  /** Newly uploaded images (already in the files store). */
  newImages: { path: string }[];
  /** Cover: an existing image id, or the storage path of a new one. */
  cover?: { imageId?: string; path?: string } | null;
  removedImageIds?: string[];
  billPath?: string | null;
  removeBill?: boolean;
}

function validate(values: unknown) {
  const parsed = jewellerySchema.safeParse(values);
  if (parsed.success) return { ok: true as const, data: withNetWeight(parsed.data) };
  const fieldErrors: Record<string, string> = {};
  for (const i of parsed.error.issues) fieldErrors[String(i.path[0] ?? "form")] ??= i.message;
  return { ok: false as const, error: "Please fix the highlighted fields.", fieldErrors };
}

async function run(fn: () => Promise<void>, id: string): Promise<ActionResult> {
  try {
    await fn();
  } catch (err) {
    if (err instanceof Rejected) return { ok: false, error: err.message };
    throw err;
  }
  return { ok: true, id };
}

export async function createJewellery(input: SaveInput): Promise<ActionResult> {
  if (!UUID.test(input.id)) return { ok: false, error: "Invalid id" };
  const v = validate(input.values);
  if (!v.ok) return v;
  const imagePaths = input.newImages.map((i) => i.path);
  if (!pathsOk([...imagePaths, ...(input.billPath ? [input.billPath] : [])], input.id))
    return { ok: false, error: "Invalid file path" };
  if (imagePaths.length > MAX_IMAGES) return { ok: false, error: `At most ${MAX_IMAGES} photos per item` };

  return run(() => updateVault((vault) => {
    if (vault.jewellery.some((j) => j.id === input.id)) throw new Rejected("This item already exists");
    if (duplicateOf(vault, v.data, input.id)) throw new Rejected(DUPLICATE);
    const now = new Date().toISOString();
    vault.jewellery.push({
      id: input.id, ...v.data, status: "owned", bill_path: input.billPath ?? null, created_at: now, updated_at: now,
    } satisfies Jewellery);
    const coverPath = input.cover?.path ?? imagePaths[0];
    imagePaths.forEach((p) => vault.images.push({
      id: crypto.randomUUID(), jewellery_id: input.id, storage_path: p, is_cover: p === coverPath, created_at: now,
    }));
    vault.transactions.push({
      id: crypto.randomUUID(), jewellery_id: input.id, transaction_type: "purchase",
      transaction_date: v.data.purchase_date, amount: v.data.purchase_price, created_at: now,
    });
  }), input.id);
}

export async function updateJewellery(input: SaveInput): Promise<ActionResult> {
  if (!UUID.test(input.id)) return { ok: false, error: "Invalid id" };
  const v = validate(input.values);
  if (!v.ok) return v;
  const newPaths = input.newImages.map((i) => i.path);
  if (!pathsOk([...newPaths, ...(input.billPath ? [input.billPath] : [])], input.id))
    return { ok: false, error: "Invalid file path" };

  const orphans: { images: string[]; bill: string | null } = { images: [], bill: null };
  const result = await run(() => updateVault((vault) => {
    const item = vault.jewellery.find((j) => j.id === input.id);
    if (!item) throw new Rejected("Jewellery not found");
    if (duplicateOf(vault, v.data, input.id)) throw new Rejected(DUPLICATE);

    const removed = new Set(input.removedImageIds ?? []);
    const kept = vault.images.filter((i) => i.jewellery_id === input.id && !removed.has(i.id));
    if (kept.length + newPaths.length > MAX_IMAGES) throw new Rejected(`At most ${MAX_IMAGES} photos per item`);

    const oldBill = item.bill_path;
    Object.assign(item, v.data, { updated_at: new Date().toISOString() });
    if (input.billPath) item.bill_path = input.billPath;
    else if (input.removeBill) item.bill_path = null;
    if (oldBill && oldBill !== item.bill_path) orphans.bill = oldBill;

    orphans.images = vault.images.filter((i) => i.jewellery_id === input.id && removed.has(i.id)).map((i) => i.storage_path);
    vault.images = vault.images.filter((i) => !(i.jewellery_id === input.id && removed.has(i.id)));
    const now = new Date().toISOString();
    newPaths.forEach((p) => vault.images.push({ id: crypto.randomUUID(), jewellery_id: input.id, storage_path: p, is_cover: false, created_at: now }));

    // Exactly one cover whenever the item has images.
    const mine = vault.images.filter((i) => i.jewellery_id === input.id);
    const wanted = input.cover?.imageId ? mine.find((i) => i.id === input.cover!.imageId)
      : input.cover?.path ? mine.find((i) => i.storage_path === input.cover!.path) : undefined;
    const cover = wanted ?? mine.find((i) => i.is_cover) ?? mine[0];
    mine.forEach((i) => { i.is_cover = i === cover; });
  }), input.id);

  // Delete files only once the record no longer points at them.
  if (result.ok) {
    await removeFiles("jewellery-images", orphans.images);
    if (orphans.bill) await removeFiles("jewellery-bills", [orphans.bill]);
  }
  return result;
}

export async function deleteJewellery(id: string): Promise<{ ok: boolean; error?: string }> {
  if (!UUID.test(id)) return { ok: false, error: "Invalid id" };
  const files = await updateVault((vault) => {
    const item = vault.jewellery.find((j) => j.id === id);
    const images = vault.images.filter((i) => i.jewellery_id === id).map((i) => i.storage_path);
    vault.jewellery = vault.jewellery.filter((j) => j.id !== id);
    vault.images = vault.images.filter((i) => i.jewellery_id !== id);
    vault.transactions = vault.transactions.filter((t) => t.jewellery_id !== id);
    return { found: !!item, images, bill: item?.bill_path ?? null };
  });
  if (!files.found) return { ok: false, error: "Jewellery not found" };
  await removeFiles("jewellery-images", files.images);
  if (files.bill) await removeFiles("jewellery-bills", [files.bill]);
  return { ok: true };
}

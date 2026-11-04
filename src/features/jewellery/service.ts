"use client";

import { DUPLICATE_MESSAGE, MAX_PHOTOS, isDuplicate } from "@/domain/jewellery";
import { jewellerySchema, withNetWeight } from "@/domain/schemas";
import type { Jewellery } from "@/domain/types";
import { putFile, removeFiles, type Bucket } from "@/storage/files";
import { updateVault } from "@/storage/vault";

export type ActionResult =
  | { ok: true; id: string }
  | { ok: false; error: string; fieldErrors?: Record<string, string> };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Thrown inside a vault update to abort it without saving. */
class Rejected extends Error {}

export interface SaveInput {
  id: string;
  values: unknown;
  /** New photos, already compressed to JPEG. */
  newPhotos: File[];
  /** Cover: an existing image id, or the index of one of newPhotos. */
  cover?: { imageId: string } | { newPhotoIndex: number } | null;
  removedImageIds?: string[];
  /** A new bill (PDF, or an already-compressed JPEG) replacing any existing one. */
  bill?: File | null;
  removeBill?: boolean;
}

function validate(values: unknown) {
  const parsed = jewellerySchema.safeParse(values);
  if (parsed.success) return { ok: true as const, data: withNetWeight(parsed.data) };
  const fieldErrors: Record<string, string> = {};
  for (const i of parsed.error.issues) fieldErrors[String(i.path[0] ?? "form")] ??= i.message;
  return { ok: false as const, error: "Please fix the highlighted fields.", fieldErrors };
}

/** Files are stored under "<jewellery id>/" so an item can never point at another item's files. */
async function storeFiles(input: SaveInput) {
  const stored: { bucket: Bucket; path: string }[] = [];
  const put = async (bucket: Bucket, path: string, file: Blob, what: string) => {
    await putFile(bucket, path, file).catch((e) => { throw new Error(`${what} upload failed: ${e.message}`); });
    stored.push({ bucket, path });
    return path;
  };
  const rollback = async () => {
    for (const s of stored) await removeFiles(s.bucket, [s.path]).catch(() => {});
  };
  try {
    const photoPaths: string[] = [];
    for (const f of input.newPhotos) photoPaths.push(await put("jewellery-images", `${input.id}/${crypto.randomUUID()}.jpg`, f, "Photo"));
    const billPath = input.bill
      ? await put("jewellery-bills", `${input.id}/bill-${crypto.randomUUID()}.${input.bill.type === "application/pdf" ? "pdf" : "jpg"}`, input.bill, "Bill")
      : null;
    return { photoPaths, billPath, rollback };
  } catch (err) {
    await rollback();
    throw err;
  }
}

/** Stores the files, runs the vault update, and removes the stored files again if it fails. */
async function save(input: SaveInput, apply: (paths: { photoPaths: string[]; billPath: string | null }) => Promise<void>): Promise<ActionResult> {
  let files: Awaited<ReturnType<typeof storeFiles>>;
  try {
    files = await storeFiles(input);
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Could not save files" };
  }
  try {
    await apply(files);
  } catch (err) {
    await files.rollback();
    if (err instanceof Rejected) return { ok: false, error: err.message };
    throw err;
  }
  return { ok: true, id: input.id };
}

export async function createJewellery(input: SaveInput): Promise<ActionResult> {
  if (!UUID.test(input.id)) return { ok: false, error: "Invalid id" };
  const v = validate(input.values);
  if (!v.ok) return v;
  if (input.newPhotos.length > MAX_PHOTOS) return { ok: false, error: `At most ${MAX_PHOTOS} photos per item` };

  return save(input, ({ photoPaths, billPath }) => updateVault((vault) => {
    if (vault.jewellery.some((j) => j.id === input.id)) throw new Rejected("This item already exists");
    if (isDuplicate(vault.jewellery, v.data, input.id)) throw new Rejected(DUPLICATE_MESSAGE);
    const now = new Date().toISOString();
    vault.jewellery.push({
      id: input.id, ...v.data, status: "owned", bill_path: billPath, created_at: now, updated_at: now,
    } satisfies Jewellery);
    const coverIndex = input.cover && "newPhotoIndex" in input.cover ? input.cover.newPhotoIndex : 0;
    photoPaths.forEach((p, i) => vault.images.push({
      id: crypto.randomUUID(), jewellery_id: input.id, storage_path: p, is_cover: i === coverIndex, created_at: now,
    }));
    vault.transactions.push({
      id: crypto.randomUUID(), jewellery_id: input.id, transaction_type: "purchase",
      transaction_date: v.data.purchase_date, amount: v.data.purchase_price, created_at: now,
    });
  }));
}

export async function updateJewellery(input: SaveInput): Promise<ActionResult> {
  if (!UUID.test(input.id)) return { ok: false, error: "Invalid id" };
  const v = validate(input.values);
  if (!v.ok) return v;

  const orphans: { images: string[]; bill: string | null } = { images: [], bill: null };
  const result = await save(input, ({ photoPaths, billPath }) => updateVault((vault) => {
    const item = vault.jewellery.find((j) => j.id === input.id);
    if (!item) throw new Rejected("Jewellery not found");
    if (isDuplicate(vault.jewellery, v.data, input.id)) throw new Rejected(DUPLICATE_MESSAGE);

    const removed = new Set(input.removedImageIds ?? []);
    const kept = vault.images.filter((i) => i.jewellery_id === input.id && !removed.has(i.id));
    if (kept.length + photoPaths.length > MAX_PHOTOS) throw new Rejected(`At most ${MAX_PHOTOS} photos per item`);

    const oldBill = item.bill_path;
    Object.assign(item, v.data, { updated_at: new Date().toISOString() });
    if (billPath) item.bill_path = billPath;
    else if (input.removeBill) item.bill_path = null;
    if (oldBill && oldBill !== item.bill_path) orphans.bill = oldBill;

    orphans.images = vault.images.filter((i) => i.jewellery_id === input.id && removed.has(i.id)).map((i) => i.storage_path);
    vault.images = vault.images.filter((i) => !(i.jewellery_id === input.id && removed.has(i.id)));
    const now = new Date().toISOString();
    photoPaths.forEach((p) => vault.images.push({ id: crypto.randomUUID(), jewellery_id: input.id, storage_path: p, is_cover: false, created_at: now }));

    // Exactly one cover whenever the item has images.
    const mine = vault.images.filter((i) => i.jewellery_id === input.id);
    const c = input.cover;
    const wanted = !c ? undefined
      : "imageId" in c ? mine.find((i) => i.id === c.imageId)
      : mine.find((i) => i.storage_path === photoPaths[c.newPhotoIndex]);
    const cover = wanted ?? mine.find((i) => i.is_cover) ?? mine[0];
    mine.forEach((i) => { i.is_cover = i === cover; });
  }));

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

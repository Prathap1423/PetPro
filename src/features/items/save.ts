"use client";

import { MAX_PHOTOS } from "@/domain/items";
import { notifyChanged } from "@/storage/changes";
import { putFile, removeFiles, type Bucket } from "@/storage/files";
import { currentUserId, must, rowsOf, supabase } from "@/storage/supabase";
import type { ItemTables } from "@/features/items/tables";

/**
 * Saving any vault item (gold jewellery or a diamond): upload its photos and bill, write the
 * row and its image rows, and undo everything stored so far if a step fails.
 */

export type ActionResult =
  | { ok: true; id: string }
  | { ok: false; error: string; fieldErrors?: Record<string, string> };

export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Thrown during a save to abort it with a message for the user. */
export class Rejected extends Error {}

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

export interface SaveOptions {
  /** Shown when a unique index in the database rejects the row. */
  duplicateMessage: string;
  /** Runs before anything is uploaded; throw Rejected to stop the save. */
  check?: () => Promise<void>;
  /** Extra rows written after the item is created (for example a purchase transaction). */
  afterCreate?: (userId: string) => Promise<void>;
}

/** Validation errors from a zod schema, keyed by field, for the form. */
export function fieldErrorsOf(issues: { path: PropertyKey[]; message: string }[]) {
  const fieldErrors: Record<string, string> = {};
  for (const i of issues) fieldErrors[String(i.path[0] ?? "form")] ??= i.message;
  return { ok: false as const, error: "Please fix the highlighted fields.", fieldErrors };
}

/** Supabase call that throws on error, turning a unique-index violation into the duplicate message. */
export function runner(duplicateMessage: string) {
  return async <T>(res: PromiseLike<{ data: T; error: { message: string; code?: string } | null }>): Promise<T> => {
    const { data, error } = await res;
    if (error?.code === "23505") throw new Rejected(duplicateMessage);
    if (error) throw new Error(error.message);
    return data;
  };
}

/** Files are stored under "<user id>/<item id>/" so an item can never point at another item's files. */
async function storeFiles(userId: string, input: SaveInput) {
  const stored: { bucket: Bucket; path: string }[] = [];
  const put = async (bucket: Bucket, path: string, file: Blob, what: string) => {
    await putFile(bucket, path, file).catch((e) => { throw new Rejected(`${what} upload failed: ${e.message}`); });
    stored.push({ bucket, path });
    return path;
  };
  const rollback = async () => {
    for (const s of stored) await removeFiles(s.bucket, [s.path]).catch(() => {});
  };
  const dir = `${userId}/${input.id}`;
  try {
    const photoPaths: string[] = [];
    for (const f of input.newPhotos) photoPaths.push(await put("jewellery-images", `${dir}/${crypto.randomUUID()}.jpg`, f, "Photo"));
    const billPath = input.bill
      ? await put("jewellery-bills", `${dir}/bill-${crypto.randomUUID()}.${input.bill.type === "application/pdf" ? "pdf" : "jpg"}`, input.bill, "Bill")
      : null;
    return { photoPaths, billPath, rollback };
  } catch (err) {
    await rollback();
    throw err;
  }
}

/** Turns a thrown error into a result for the form. */
async function result(id: string, fn: () => Promise<void>): Promise<ActionResult> {
  try {
    await fn();
  } catch (err) {
    if (err instanceof Rejected) return { ok: false, error: err.message };
    return { ok: false, error: err instanceof Error ? err.message : "Something went wrong" };
  }
  notifyChanged();
  return { ok: true, id };
}

/** Inserts a new item with its photos and bill. `row` holds the validated column values. */
export async function createItem(t: ItemTables, input: SaveInput, row: Record<string, unknown>, opts: SaveOptions): Promise<ActionResult> {
  if (!UUID.test(input.id)) return { ok: false, error: "Invalid id" };
  if (input.newPhotos.length > MAX_PHOTOS) return { ok: false, error: `At most ${MAX_PHOTOS} photos per item` };
  const run = runner(opts.duplicateMessage);

  return result(input.id, async () => {
    const userId = await currentUserId();
    await opts.check?.();
    const files = await storeFiles(userId, input);
    try {
      await run(supabase.from(t.items).insert({ id: input.id, user_id: userId, ...row, bill_path: files.billPath }));
      const coverIndex = input.cover && "newPhotoIndex" in input.cover ? input.cover.newPhotoIndex : 0;
      if (files.photoPaths.length) {
        await run(supabase.from(t.images).insert(files.photoPaths.map((p, i) => ({
          user_id: userId, [t.fk]: input.id, storage_path: p, is_cover: i === coverIndex,
        }))));
      }
      await opts.afterCreate?.(userId);
    } catch (err) {
      // Undo the partial save: deleting the item cascades to its images (and transactions).
      await supabase.from(t.items).delete().eq("id", input.id);
      await files.rollback();
      throw err;
    }
  });
}

/** Updates an item: new/removed photos, cover choice, bill replacement. Old files are deleted only after success. */
export async function updateItem(t: ItemTables, input: SaveInput, row: Record<string, unknown>, opts: SaveOptions): Promise<ActionResult> {
  if (!UUID.test(input.id)) return { ok: false, error: "Invalid id" };
  const run = runner(opts.duplicateMessage);

  const orphans: { images: string[]; bill: string | null } = { images: [], bill: null };
  const res = await result(input.id, async () => {
    const userId = await currentUserId();
    const item = await supabase.from(t.items).select("bill_path").eq("id", input.id).maybeSingle().then(must);
    if (!item) throw new Rejected(`${t.noun} not found`);
    await opts.check?.();

    const images = await supabase.from(t.images).select("id, storage_path, is_cover").eq(t.fk, input.id).then(rowsOf);
    const removed = new Set(input.removedImageIds ?? []);
    const kept = images.filter((i) => !removed.has(i.id));
    if (kept.length + input.newPhotos.length > MAX_PHOTOS) throw new Rejected(`At most ${MAX_PHOTOS} photos per item`);

    const files = await storeFiles(userId, input);
    try {
      const billPath = files.billPath ?? (input.removeBill ? null : item.bill_path);
      await run(supabase.from(t.items).update({ ...row, bill_path: billPath }).eq("id", input.id));
      if (item.bill_path && item.bill_path !== billPath) orphans.bill = item.bill_path;

      const gone = images.filter((i) => removed.has(i.id));
      if (gone.length) await run(supabase.from(t.images).delete().in("id", gone.map((i) => i.id)));
      orphans.images = gone.map((i) => i.storage_path);
      const added = files.photoPaths.length
        ? await run(supabase.from(t.images).insert(files.photoPaths.map((p) => ({
          user_id: userId, [t.fk]: input.id, storage_path: p, is_cover: false,
        }))).select("id, storage_path, is_cover")) ?? []
        : [];

      // Exactly one cover whenever the item has images.
      const mine = [...kept, ...added];
      const c = input.cover;
      const wanted = !c ? undefined
        : "imageId" in c ? mine.find((i) => i.id === c.imageId)
        : mine.find((i) => i.storage_path === files.photoPaths[c.newPhotoIndex]);
      const cover = wanted ?? mine.find((i) => i.is_cover) ?? mine[0];
      if (cover && !cover.is_cover) {
        // Clear the old cover first: the database allows only one cover per item.
        await run(supabase.from(t.images).update({ is_cover: false }).eq(t.fk, input.id).eq("is_cover", true));
        await run(supabase.from(t.images).update({ is_cover: true }).eq("id", cover.id));
      }
    } catch (err) {
      await files.rollback();
      throw err;
    }
  });

  if (res.ok) {
    await removeFiles("jewellery-images", orphans.images).catch(() => {});
    if (orphans.bill) await removeFiles("jewellery-bills", [orphans.bill]).catch(() => {});
  }
  return res;
}

export async function deleteItem(t: ItemTables, id: string): Promise<{ ok: boolean; error?: string }> {
  if (!UUID.test(id)) return { ok: false, error: "Invalid id" };
  try {
    const item = await supabase.from(t.items).select("bill_path").eq("id", id).maybeSingle().then(must);
    if (!item) return { ok: false, error: `${t.noun} not found` };
    const images = await supabase.from(t.images).select("storage_path").eq(t.fk, id).then(rowsOf);
    // Deleting the item cascades to its images (and transactions).
    await supabase.from(t.items).delete().eq("id", id).then(must);
    await removeFiles("jewellery-images", images.map((i) => i.storage_path)).catch(() => {});
    if (item.bill_path) await removeFiles("jewellery-bills", [item.bill_path]).catch(() => {});
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Could not delete" };
  }
  notifyChanged();
  return { ok: true };
}

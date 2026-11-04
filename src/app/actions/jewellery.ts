"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { jewellerySchema, withNetWeight } from "@/lib/validation";

export type ActionResult =
  | { ok: true; id: string }
  | { ok: false; error: string; fieldErrors?: Record<string, string> };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function friendlyDbError(code: string | undefined, message: string): string {
  if (code === "23505") return "This jewellery looks like a duplicate (same invoice number, or same name, date and weight).";
  if (code === "23514") return "One of the values is out of range. Please check weights, prices and dates.";
  return message;
}

async function requireUser() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in");
  return { supabase, user };
}

/** Storage paths must live under "<user>/<jewellery>/" so one user can never attach another's files. */
function pathsOk(paths: string[], userId: string, jewelleryId: string) {
  const prefix = `${userId}/${jewelleryId}/`;
  return paths.every((p) => p.startsWith(prefix) && !p.includes("..") && p.length < 300);
}

export interface SaveInput {
  id: string;
  values: unknown;
  /** Newly uploaded images (already in storage). */
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

export async function createJewellery(input: SaveInput): Promise<ActionResult> {
  const { supabase, user } = await requireUser();
  if (!UUID.test(input.id)) return { ok: false, error: "Invalid id" };
  const v = validate(input.values);
  if (!v.ok) return v;
  const imagePaths = input.newImages.map((i) => i.path);
  if (!pathsOk([...imagePaths, ...(input.billPath ? [input.billPath] : [])], user.id, input.id))
    return { ok: false, error: "Invalid file path" };
  if (imagePaths.length > 10) return { ok: false, error: "At most 10 photos per item" };

  const { error } = await supabase
    .from("jewellery")
    .insert({ id: input.id, user_id: user.id, ...v.data, bill_path: input.billPath ?? null });
  if (error) return { ok: false, error: friendlyDbError(error.code, error.message) };

  if (imagePaths.length) {
    const coverPath = input.cover?.path ?? imagePaths[0];
    const { error: imgErr } = await supabase.from("jewellery_images").insert(
      imagePaths.map((p) => ({ user_id: user.id, jewellery_id: input.id, storage_path: p, is_cover: p === coverPath })),
    );
    if (imgErr) {
      await supabase.from("jewellery").delete().eq("id", input.id);
      return { ok: false, error: friendlyDbError(imgErr.code, imgErr.message) };
    }
  }
  await supabase.from("transactions").insert({
    user_id: user.id, jewellery_id: input.id, transaction_type: "purchase",
    transaction_date: v.data.purchase_date, amount: v.data.purchase_price,
  });
  revalidatePath("/", "layout");
  return { ok: true, id: input.id };
}

export async function updateJewellery(input: SaveInput): Promise<ActionResult> {
  const { supabase, user } = await requireUser();
  if (!UUID.test(input.id)) return { ok: false, error: "Invalid id" };
  const v = validate(input.values);
  if (!v.ok) return v;
  const newPaths = input.newImages.map((i) => i.path);
  if (!pathsOk([...newPaths, ...(input.billPath ? [input.billPath] : [])], user.id, input.id))
    return { ok: false, error: "Invalid file path" };

  const { data: existing } = await supabase.from("jewellery").select("id, bill_path").eq("id", input.id).single();
  if (!existing) return { ok: false, error: "Jewellery not found" };

  const patch: Record<string, unknown> = { ...v.data };
  if (input.billPath) patch.bill_path = input.billPath;
  else if (input.removeBill) patch.bill_path = null;
  const { error } = await supabase.from("jewellery").update(patch).eq("id", input.id);
  if (error) return { ok: false, error: friendlyDbError(error.code, error.message) };

  // Remove images (rows first, then objects).
  const removed = (input.removedImageIds ?? []).filter((i) => UUID.test(i));
  if (removed.length) {
    const { data: rows } = await supabase.from("jewellery_images").select("storage_path").in("id", removed).eq("jewellery_id", input.id);
    await supabase.from("jewellery_images").delete().in("id", removed).eq("jewellery_id", input.id);
    if (rows?.length) await supabase.storage.from("jewellery-images").remove(rows.map((r) => r.storage_path));
  }
  if (newPaths.length) {
    const { error: e } = await supabase.from("jewellery_images").insert(
      newPaths.map((p) => ({ user_id: user.id, jewellery_id: input.id, storage_path: p, is_cover: false })),
    );
    if (e) return { ok: false, error: friendlyDbError(e.code, e.message) };
  }
  // Cover: clear first because only one cover per item is allowed.
  if (input.cover) {
    await supabase.from("jewellery_images").update({ is_cover: false }).eq("jewellery_id", input.id);
    const q = supabase.from("jewellery_images").update({ is_cover: true }).eq("jewellery_id", input.id);
    if (input.cover.imageId && UUID.test(input.cover.imageId)) await q.eq("id", input.cover.imageId);
    else if (input.cover.path) await q.eq("storage_path", input.cover.path);
  }
  // Guarantee a cover exists whenever images exist.
  const { data: imgs } = await supabase.from("jewellery_images").select("id, is_cover").eq("jewellery_id", input.id).order("created_at");
  if (imgs?.length && !imgs.some((i) => i.is_cover))
    await supabase.from("jewellery_images").update({ is_cover: true }).eq("id", imgs[0].id);

  if (input.removeBill && existing.bill_path) await supabase.storage.from("jewellery-bills").remove([existing.bill_path]);
  revalidatePath("/", "layout");
  return { ok: true, id: input.id };
}

export async function deleteJewellery(id: string): Promise<{ ok: boolean; error?: string }> {
  const { supabase } = await requireUser();
  if (!UUID.test(id)) return { ok: false, error: "Invalid id" };
  const { data: item } = await supabase.from("jewellery").select("bill_path").eq("id", id).single();
  const { data: imgs } = await supabase.from("jewellery_images").select("storage_path").eq("jewellery_id", id);
  const { error } = await supabase.from("jewellery").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  if (imgs?.length) await supabase.storage.from("jewellery-images").remove(imgs.map((i) => i.storage_path));
  if (item?.bill_path) await supabase.storage.from("jewellery-bills").remove([item.bill_path]);
  revalidatePath("/", "layout");
  return { ok: true };
}

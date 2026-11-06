"use client";

import { DUPLICATE_DIAMOND_MESSAGE, isDuplicateDiamond } from "@/domain/diamond";
import { diamondSchema, type DiamondInput } from "@/domain/schemas";
import { Rejected, createItem, deleteItem, fieldErrorsOf, updateItem, type ActionResult, type SaveInput } from "@/features/items/save";
import { DIAMONDS } from "@/features/items/tables";
import { must, rowsOf, supabase } from "@/storage/supabase";

function validate(values: unknown) {
  const parsed = diamondSchema.safeParse(values);
  return parsed.success ? { ok: true as const, data: parsed.data } : fieldErrorsOf(parsed.error.issues);
}

/** Checked before uploading anything; the database's unique indexes are the final guard. */
async function assertNotDuplicate(data: DiamondInput, selfId: string) {
  const rows = await supabase.from("diamonds").select("id, invoice_number, certificate_lab, certificate_number").then(rowsOf);
  if (isDuplicateDiamond(rows, data, selfId)) throw new Rejected(DUPLICATE_DIAMOND_MESSAGE);
}

const options = (data: DiamondInput, id: string) => ({
  duplicateMessage: DUPLICATE_DIAMOND_MESSAGE,
  check: () => assertNotDuplicate(data, id),
});

export async function createDiamond(input: SaveInput): Promise<ActionResult> {
  const v = validate(input.values);
  if (!v.ok) return v;
  const row = { ...v.data, value_updated_at: v.data.current_value === null ? null : new Date().toISOString() };
  return createItem(DIAMONDS, input, row, options(v.data, input.id));
}

export async function updateDiamond(input: SaveInput): Promise<ActionResult> {
  const v = validate(input.values);
  if (!v.ok) return v;
  // Only move the "value updated" date when the value itself changed.
  const before = await supabase.from("diamonds").select("current_value").eq("id", input.id).maybeSingle().then(must);
  const changed = before && (before.current_value === null ? null : Number(before.current_value)) !== v.data.current_value;
  const row = changed ? { ...v.data, value_updated_at: v.data.current_value === null ? null : new Date().toISOString() } : v.data;
  return updateItem(DIAMONDS, input, row, options(v.data, input.id));
}

export const deleteDiamond = (id: string) => deleteItem(DIAMONDS, id);

"use client";

import { DUPLICATE_MESSAGE, isDuplicate } from "@/domain/jewellery";
import { jewellerySchema, withNetWeight } from "@/domain/schemas";
import { Rejected, createItem, deleteItem, fieldErrorsOf, runner, updateItem, type ActionResult, type SaveInput } from "@/features/items/save";
import { JEWELLERY } from "@/features/items/tables";
import { rowsOf, supabase } from "@/storage/supabase";

export type { ActionResult, SaveInput };

type Values = ReturnType<typeof withNetWeight>;

function validate(values: unknown) {
  const parsed = jewellerySchema.safeParse(values);
  return parsed.success ? { ok: true as const, data: withNetWeight(parsed.data) } : fieldErrorsOf(parsed.error.issues);
}

/** Checked before uploading anything; the database's unique indexes are the final guard. */
async function assertNotDuplicate(data: Values, selfId: string) {
  const rows = await supabase.from("jewellery").select("id, name, purchase_date, gross_weight, invoice_number").then(rowsOf);
  const existing = rows.map((r) => ({ ...r, gross_weight: Number(r.gross_weight) }));
  if (isDuplicate(existing, data, selfId)) throw new Rejected(DUPLICATE_MESSAGE);
}

export async function createJewellery(input: SaveInput): Promise<ActionResult> {
  const v = validate(input.values);
  if (!v.ok) return v;
  const run = runner(DUPLICATE_MESSAGE);
  return createItem(JEWELLERY, input, v.data, {
    duplicateMessage: DUPLICATE_MESSAGE,
    check: () => assertNotDuplicate(v.data, input.id),
    afterCreate: async (userId) => {
      await run(supabase.from("transactions").insert({
        user_id: userId, jewellery_id: input.id, transaction_type: "purchase",
        transaction_date: v.data.purchase_date, amount: v.data.purchase_price,
      }));
    },
  });
}

export async function updateJewellery(input: SaveInput): Promise<ActionResult> {
  const v = validate(input.values);
  if (!v.ok) return v;
  return updateItem(JEWELLERY, input, v.data, {
    duplicateMessage: DUPLICATE_MESSAGE,
    check: () => assertNotDuplicate(v.data, input.id),
  });
}

export const deleteJewellery = (id: string) => deleteItem(JEWELLERY, id);

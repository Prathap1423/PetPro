/** Business rules for jewellery records. Pure — no storage, no React. */
import type { Jewellery } from "@/domain/types";

export const MAX_PHOTOS = 10;

type DuplicateKey = Pick<Jewellery, "name" | "purchase_date" | "gross_weight" | "invoice_number">;

const norm = (s: string | null) => (s ?? "").trim().toLowerCase();

/** Same invoice number, or same name + date + gross weight, cannot be entered twice. */
export function isDuplicate(existing: (DuplicateKey & { id: string })[], candidate: DuplicateKey, selfId: string) {
  return existing.some((j) => j.id !== selfId && (
    (norm(candidate.invoice_number) !== "" && norm(j.invoice_number) === norm(candidate.invoice_number)) ||
    (norm(j.name) === norm(candidate.name) && j.purchase_date === candidate.purchase_date && j.gross_weight === candidate.gross_weight)
  ));
}

export const DUPLICATE_MESSAGE = "This jewellery looks like a duplicate (same invoice number, or same name, date and weight).";

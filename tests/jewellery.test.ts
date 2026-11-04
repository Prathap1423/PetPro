import { describe, expect, it } from "vitest";
import { isDuplicate } from "@/domain/jewellery";

const chain = { id: "a", name: "Gold Chain", purchase_date: "2024-01-10", gross_weight: 8, invoice_number: "INV-1" };

describe("duplicate detection", () => {
  it("flags the same invoice number, ignoring case and spaces", () => {
    expect(isDuplicate([chain], { ...chain, name: "Other", invoice_number: " inv-1 " }, "b")).toBe(true);
  });
  it("flags the same name, date and gross weight", () => {
    expect(isDuplicate([chain], { ...chain, name: "gold chain", invoice_number: null }, "b")).toBe(true);
  });
  it("allows a different item and ignores the item itself", () => {
    expect(isDuplicate([chain], { ...chain, gross_weight: 9, invoice_number: null }, "b")).toBe(false);
    expect(isDuplicate([chain], chain, "a")).toBe(false);
  });
  it("does not match on blank invoice numbers", () => {
    expect(isDuplicate([{ ...chain, invoice_number: null }], { ...chain, name: "Ring", invoice_number: "" }, "b")).toBe(false);
  });
});

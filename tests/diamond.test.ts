import { describe, expect, it } from "vitest";
import { formatCarat, gradeLine, isDuplicateDiamond, summariseDiamonds, type SummarisableDiamond } from "@/domain/diamond";
import { diamondSchema } from "@/domain/schemas";

const d = (over: Partial<SummarisableDiamond>): SummarisableDiamond => ({ carat: 1, purchasePrice: 100000, currentValue: null, status: "owned", ...over });

describe("diamond summary", () => {
  it("totals owned diamonds and values only the ones with a value", () => {
    const s = summariseDiamonds([
      d({ carat: 1.2, purchasePrice: 200000, currentValue: 240000 }),
      d({ carat: 0.5, purchasePrice: 60000 }),
      d({ carat: 2, purchasePrice: 500000, currentValue: 550000, status: "sold" }),
    ]);
    expect(s.itemCount).toBe(2);
    expect(s.totalCarat).toBe(1.7);
    expect(s.totalInvestment).toBe(260000);
    expect(s.estimatedValue).toBe(240000);
    expect(s.unvaluedCount).toBe(1);
    expect(s.profitLoss).toBe(40000);
    expect(s.profitLossPercent).toBe(20);
  });
  it("has no percentage when nothing is valued", () => {
    expect(summariseDiamonds([d({})]).profitLossPercent).toBeNull();
  });
});

describe("diamond duplicates", () => {
  const stone = { id: "a", invoice_number: "INV-9", certificate_lab: "GIA", certificate_number: "2141438171" };
  it("flags the same certificate from the same lab", () => {
    expect(isDuplicateDiamond([stone], { invoice_number: null, certificate_lab: "GIA", certificate_number: " 2141438171 " }, "b")).toBe(true);
  });
  it("allows the same number from a different lab", () => {
    expect(isDuplicateDiamond([stone], { invoice_number: null, certificate_lab: "IGI", certificate_number: "2141438171" }, "b")).toBe(false);
  });
  it("flags the same invoice and ignores the diamond itself", () => {
    expect(isDuplicateDiamond([stone], { invoice_number: "inv-9", certificate_lab: null, certificate_number: null }, "b")).toBe(true);
    expect(isDuplicateDiamond([stone], stone, "a")).toBe(false);
  });
});

describe("diamond formatting and validation", () => {
  it("formats carat and the grading line", () => {
    expect(formatCarat(1.25)).toBe("1.25 ct");
    expect(gradeLine({ carat: 0.5, colour: "G", clarity: "VS1" })).toBe("0.5 ct · G · VS1");
    expect(gradeLine({ carat: 0.5, colour: null, clarity: null })).toBe("0.5 ct");
  });
  it("turns empty selects and value into null", () => {
    const r = diamondSchema.parse({
      name: "Solitaire", diamond_type: "Ring", purchase_date: "2024-05-01", carat: "0.9", shape: "Round",
      cut: "", colour: "", clarity: "VS2", certificate_lab: "", purchase_price: "150000", current_value: "",
    });
    expect(r.cut).toBeNull();
    expect(r.current_value).toBeNull();
    expect(r.clarity).toBe("VS2");
    expect(r.stone_count).toBe(1);
  });
  it("rejects a zero carat weight", () => {
    expect(diamondSchema.safeParse({ name: "x", diamond_type: "Ring", purchase_date: "2024-05-01", carat: 0, shape: "Round", purchase_price: 1 }).success).toBe(false);
  });
});

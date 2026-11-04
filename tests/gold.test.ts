import { describe, expect, it } from "vitest";
import {
  chargeAmount, estimateCurrentValue, estimatePurchaseCost, gramsToSovereigns, netGoldWeight,
  percentChange, rateForPurity, realizedProfitLoss, round, sovereignsToGrams, summariseInventory,
  validateWeights, type SummarisableItem,
} from "@/domain/gold";

describe("weight conversion", () => {
  it("converts grams to sovereigns (1 sov = 8 g)", () => {
    expect(gramsToSovereigns(16)).toBe(2);
    expect(gramsToSovereigns(4)).toBe(0.5);
    expect(gramsToSovereigns(10)).toBe(1.25);
    expect(gramsToSovereigns(0)).toBe(0);
  });
  it("converts sovereigns to grams and round-trips", () => {
    expect(sovereignsToGrams(2)).toBe(16);
    expect(sovereignsToGrams(0.125)).toBe(1);
    expect(gramsToSovereigns(sovereignsToGrams(3.375))).toBe(3.375);
  });
  it("computes net gold weight", () => {
    expect(netGoldWeight(16.5, 0.5)).toBe(16);
    expect(netGoldWeight(0.3, 0.1)).toBe(0.2); // float-safe
  });
  it("validates weights", () => {
    expect(validateWeights(16, 0)).toEqual({ ok: true });
    expect(validateWeights(0, 0).ok).toBe(false);
    expect(validateWeights(5, -1).ok).toBe(false);
    expect(validateWeights(5, 5).ok).toBe(false);
    expect(validateWeights(Number.NaN, 0).ok).toBe(false);
  });
});

describe("rounding", () => {
  it("rounds half away from zero without float drift", () => {
    expect(round(1.005, 2)).toBe(1.01);
    expect(round(-1.005, 2)).toBe(-1.01);
    expect(round(Number.NaN, 2)).toBe(0);
  });
});

describe("charges and cost estimate", () => {
  it("supports fixed and percentage charges", () => {
    expect(chargeAmount({ type: "fixed", value: 5000 }, 100000)).toBe(5000);
    expect(chargeAmount({ type: "percent", value: 12 }, 100000)).toBe(12000);
    expect(chargeAmount(undefined, 100000)).toBe(0);
    expect(chargeAmount({ type: "percent", value: -5 }, 100000)).toBe(0);
  });
  it("estimates cost: metal + making + wastage + 3% GST + other", () => {
    const c = estimatePurchaseCost({
      netWeight: 16, ratePerGram: 10000,
      making: { type: "percent", value: 8 }, wastage: { type: "fixed", value: 2000 },
      tax: { type: "percent", value: 3 }, otherCharges: 500,
    });
    expect(c.metalValue).toBe(160000);
    expect(c.making).toBe(12800);
    expect(c.wastage).toBe(2000);
    expect(c.tax).toBe(5244); // 3% of 174,800
    expect(c.other).toBe(500);
    expect(c.total).toBe(180544);
  });
});

describe("valuation", () => {
  const rates = { "22K": 9000 };
  it("uses a direct rate when present", () => {
    expect(rateForPurity("22K", rates)).toEqual({ rate: 9000, basis: "direct" });
  });
  it("derives from 24K when no direct rate", () => {
    expect(rateForPurity("22K", { "24K": 9600 })).toEqual({ rate: 8800, basis: "derived" });
    expect(rateForPurity("18K", { "24K": 9600 })).toEqual({ rate: 7200, basis: "derived" });
  });
  it("returns null when no rate is usable, and never derives for Other", () => {
    expect(rateForPurity("18K", {})).toBeNull();
    expect(rateForPurity("Other", { "24K": 9600 })).toBeNull();
  });
  it("estimates item value", () => {
    expect(estimateCurrentValue({ netGoldWeight: 16, purity: "22K" }, rates)).toBe(144000);
    expect(estimateCurrentValue({ netGoldWeight: 16, purity: "18K" }, rates)).toBeNull();
  });
  it("computes percent change safely", () => {
    expect(percentChange(180000, 144000)).toBe(-20);
    expect(percentChange(0, 100)).toBeNull();
  });
});

describe("inventory totals", () => {
  const items: SummarisableItem[] = [
    { netGoldWeight: 16, purity: "22K", purchasePrice: 180000, status: "owned", makingCharges: 12000 },
    { netGoldWeight: 8, purity: "22K", purchasePrice: 70000, status: "owned", makingCharges: 3000 },
    { netGoldWeight: 5, purity: "24K", purchasePrice: 40000, status: "sold", makingCharges: 1000 },
    { netGoldWeight: 2, purity: "Other", purchasePrice: 15000, status: "owned", makingCharges: 500 },
    { netGoldWeight: 4, purity: "18K", purchasePrice: 30000, status: "gifted", makingCharges: 0 },
  ];
  it("counts only owned items and excludes sold/gifted/exchanged", () => {
    const s = summariseInventory(items, { "22K": 10000 });
    expect(s.itemCount).toBe(3);
    expect(s.totalGrams).toBe(26);
    expect(s.totalSovereigns).toBe(3.25);
    expect(s.totalInvestment).toBe(265000);
    expect(s.totalMakingCharges).toBe(15500);
  });
  it("compares like with like when some items lack a rate", () => {
    const s = summariseInventory(items, { "22K": 10000 });
    expect(s.estimatedValue).toBe(240000);
    expect(s.unvaluedCount).toBe(1);
    expect(s.valuedInvestment).toBe(250000);
    expect(s.profitLoss).toBe(-10000);
    expect(s.profitLossPercent).toBe(-4);
  });
  it("handles empty inventory", () => {
    const s = summariseInventory([], {});
    expect(s).toMatchObject({ itemCount: 0, totalGrams: 0, totalInvestment: 0, profitLossPercent: null });
  });
  it("computes realized profit/loss on sale", () => {
    expect(realizedProfitLoss(180000, 195000.5)).toBe(15000.5);
    expect(realizedProfitLoss(180000, 170000)).toBe(-10000);
  });
});

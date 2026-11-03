/**
 * Pure business logic for My Gold Vault. No I/O, no React — fully unit-tested.
 * 1 sovereign (pavan / பவுன்) = 8 grams.
 */

export const SOVEREIGN_GRAMS = 8;

export const PURITIES = ["24K", "22K", "18K", "14K", "Other"] as const;
export type Purity = (typeof PURITIES)[number];

export const CATEGORIES = [
  "Chain", "Necklace", "Ring", "Bracelet", "Bangle", "Earring", "Pendant", "Coin", "Other",
] as const;
export type Category = (typeof CATEGORIES)[number];

export const STATUSES = ["owned", "sold", "gifted", "exchanged"] as const;
export type JewelleryStatus = (typeof STATUSES)[number];

/** Gold fineness of each karat relative to 24K. "Other" has no implied fraction. */
export const PURITY_FRACTION: Record<Exclude<Purity, "Other">, number> = {
  "24K": 24 / 24,
  "22K": 22 / 24,
  "18K": 18 / 24,
  "14K": 14 / 24,
};

/** Round half away from zero to `dp` decimals, avoiding float artefacts (e.g. 1.005). */
export function round(value: number, dp: number): number {
  if (!Number.isFinite(value)) return 0;
  const f = 10 ** dp;
  const n = Math.abs(value) * f;
  const r = Math.round(n + Number.EPSILON * n);
  return (Math.sign(value) * r) / f;
}
export const roundMoney = (v: number) => round(v, 2);
export const roundWeight = (v: number) => round(v, 3);

export const gramsToSovereigns = (grams: number) => roundWeight(grams / SOVEREIGN_GRAMS);
export const sovereignsToGrams = (sov: number) => roundWeight(sov * SOVEREIGN_GRAMS);

export function netGoldWeight(gross: number, nonGold: number): number {
  return roundWeight(gross - nonGold);
}

export type WeightValidation = { ok: true } | { ok: false; error: string };

export function validateWeights(gross: number, nonGold: number): WeightValidation {
  if (!Number.isFinite(gross) || gross <= 0) return { ok: false, error: "Gross weight must be greater than 0" };
  if (!Number.isFinite(nonGold) || nonGold < 0) return { ok: false, error: "Stone/non-gold weight cannot be negative" };
  if (nonGold >= gross) return { ok: false, error: "Non-gold weight must be less than gross weight" };
  return { ok: true };
}

/** A charge entered either as a fixed ₹ amount or a % of a base amount. */
export type Charge = { type: "fixed" | "percent"; value: number };

export function chargeAmount(charge: Charge | undefined, base: number): number {
  if (!charge || !(charge.value > 0)) return 0;
  return roundMoney(charge.type === "percent" ? (base * charge.value) / 100 : charge.value);
}

export interface CostInput {
  netWeight: number;
  ratePerGram: number;
  making?: Charge;
  wastage?: Charge;
  /** GST/tax. Percent is applied on metal + making + wastage. */
  tax?: Charge;
  otherCharges?: number;
}

export interface CostBreakdown {
  metalValue: number;
  making: number;
  wastage: number;
  tax: number;
  other: number;
  total: number;
}

/** Estimated purchase cost. This is only a *suggestion* — the actual price is user-entered. */
export function estimatePurchaseCost(input: CostInput): CostBreakdown {
  const metalValue = roundMoney(input.netWeight * input.ratePerGram);
  const making = chargeAmount(input.making, metalValue);
  const wastage = chargeAmount(input.wastage, metalValue);
  const tax = chargeAmount(input.tax, metalValue + making + wastage);
  const other = roundMoney(Math.max(0, input.otherCharges ?? 0));
  return { metalValue, making, wastage, tax, other, total: roundMoney(metalValue + making + wastage + tax + other) };
}

// ---------- Valuation ----------

export type RateMap = Partial<Record<Purity, number>>;

export interface RateLookup {
  rate: number;
  /** "direct" = user entered a rate for this purity; "derived" = scaled from the 24K rate. */
  basis: "direct" | "derived";
}

export function rateForPurity(purity: Purity, rates: RateMap): RateLookup | null {
  const direct = rates[purity];
  if (direct && direct > 0) return { rate: direct, basis: "direct" };
  if (purity !== "Other") {
    const base = rates["24K"];
    if (base && base > 0) return { rate: roundMoney(base * PURITY_FRACTION[purity]), basis: "derived" };
  }
  return null;
}

export interface ValuedItem {
  netGoldWeight: number;
  purity: Purity;
  purchasePrice: number;
  status: JewelleryStatus;
}

/** Estimated metal value of one item at current rates; null when no rate is available. */
export function estimateCurrentValue(item: Pick<ValuedItem, "netGoldWeight" | "purity">, rates: RateMap): number | null {
  const lookup = rateForPurity(item.purity, rates);
  return lookup ? roundMoney(item.netGoldWeight * lookup.rate) : null;
}

export function percentChange(from: number, to: number): number | null {
  if (!(from > 0)) return null;
  return round(((to - from) / from) * 100, 2);
}

export interface InventorySummary {
  itemCount: number;
  totalGrams: number;
  totalSovereigns: number;
  totalInvestment: number;
  /** Sum of metal values for items that have a rate. */
  estimatedValue: number;
  /** Items owned that could not be valued (no rate for their purity). */
  unvaluedCount: number;
  /** Investment of only the valued items, so profit/loss compares like with like. */
  valuedInvestment: number;
  profitLoss: number;
  profitLossPercent: number | null;
  totalMakingCharges: number;
}

export interface SummarisableItem extends ValuedItem {
  makingCharges: number;
}

/** Totals over *currently owned* items only; sold/gifted/exchanged are excluded. */
export function summariseInventory(items: SummarisableItem[], rates: RateMap): InventorySummary {
  const owned = items.filter((i) => i.status === "owned");
  let totalGrams = 0, totalInvestment = 0, estimatedValue = 0, valuedInvestment = 0, unvaluedCount = 0, making = 0;
  for (const it of owned) {
    totalGrams += it.netGoldWeight;
    totalInvestment += it.purchasePrice;
    making += it.makingCharges;
    const v = estimateCurrentValue(it, rates);
    if (v === null) unvaluedCount += 1;
    else { estimatedValue += v; valuedInvestment += it.purchasePrice; }
  }
  totalGrams = roundWeight(totalGrams);
  estimatedValue = roundMoney(estimatedValue);
  valuedInvestment = roundMoney(valuedInvestment);
  return {
    itemCount: owned.length,
    totalGrams,
    totalSovereigns: gramsToSovereigns(totalGrams),
    totalInvestment: roundMoney(totalInvestment),
    estimatedValue,
    unvaluedCount,
    valuedInvestment,
    profitLoss: roundMoney(estimatedValue - valuedInvestment),
    profitLossPercent: percentChange(valuedInvestment, estimatedValue),
    totalMakingCharges: roundMoney(making),
  };
}

export function realizedProfitLoss(purchasePrice: number, saleAmount: number): number {
  return roundMoney(saleAmount - purchasePrice);
}

// ---------- Formatting ----------

const inr = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });
const inr2 = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 });
export const formatINR = (v: number, precise = false) => (precise ? inr2 : inr).format(v);
export const formatGrams = (g: number) => `${roundWeight(g).toLocaleString("en-IN", { maximumFractionDigits: 3 })} g`;
export const formatSovereigns = (s: number) => `${roundWeight(s).toLocaleString("en-IN", { maximumFractionDigits: 3 })} sov`;

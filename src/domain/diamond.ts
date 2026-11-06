/**
 * Business rules for diamonds. Pure — no storage, no React.
 * Diamonds have no daily market rate like gold, so the current value is entered by hand.
 */
import { percentChange, round, roundMoney } from "@/domain/gold";

export const DIAMOND_TYPES = ["Loose stone", "Ring", "Earrings", "Pendant", "Necklace", "Bracelet", "Bangle", "Nose pin", "Other"] as const;
export const SHAPES = ["Round", "Princess", "Oval", "Cushion", "Emerald", "Pear", "Marquise", "Heart", "Radiant", "Asscher", "Other"] as const;
export const CUTS = ["Excellent", "Very Good", "Good", "Fair", "Poor"] as const;
export const COLOURS = ["D", "E", "F", "G", "H", "I", "J", "K", "L", "M", "N-Z"] as const;
export const CLARITIES = ["FL", "IF", "VVS1", "VVS2", "VS1", "VS2", "SI1", "SI2", "I1", "I2", "I3"] as const;
export const LABS = ["GIA", "IGI", "HRD", "SGL", "Other"] as const;
export const SETTING_METALS = ["Yellow gold", "White gold", "Rose gold", "Platinum", "Silver", "Other"] as const;

export type DiamondType = (typeof DIAMOND_TYPES)[number];
export type Shape = (typeof SHAPES)[number];
export type Cut = (typeof CUTS)[number];
export type Colour = (typeof COLOURS)[number];
export type Clarity = (typeof CLARITIES)[number];
export type Lab = (typeof LABS)[number];
export type SettingMetal = (typeof SETTING_METALS)[number];

export const roundCarat = (c: number) => round(c, 3);
export const formatCarat = (c: number) => `${roundCarat(c).toLocaleString("en-IN", { maximumFractionDigits: 3 })} ct`;

/** "1.25 ct · G · VS1" — the grading line shown on cards. */
export function gradeLine(d: { carat: number; colour: string | null; clarity: string | null }) {
  return [formatCarat(d.carat), d.colour, d.clarity].filter(Boolean).join(" · ");
}

export interface SummarisableDiamond {
  carat: number;
  purchasePrice: number;
  currentValue: number | null;
  status: "owned" | "sold" | "gifted" | "exchanged";
}

export interface DiamondSummary {
  itemCount: number;
  totalCarat: number;
  totalInvestment: number;
  /** Sum of the values you entered; pieces without a value are left out. */
  estimatedValue: number;
  unvaluedCount: number;
  /** Investment of only the valued pieces, so profit/loss compares like with like. */
  valuedInvestment: number;
  profitLoss: number;
  profitLossPercent: number | null;
}

/** Totals over *currently owned* diamonds only; sold/gifted/exchanged are excluded. */
export function summariseDiamonds(items: SummarisableDiamond[]): DiamondSummary {
  const owned = items.filter((i) => i.status === "owned");
  let carat = 0, investment = 0, value = 0, valuedInvestment = 0, unvalued = 0;
  for (const d of owned) {
    carat += d.carat;
    investment += d.purchasePrice;
    if (d.currentValue === null) unvalued += 1;
    else { value += d.currentValue; valuedInvestment += d.purchasePrice; }
  }
  value = roundMoney(value);
  valuedInvestment = roundMoney(valuedInvestment);
  return {
    itemCount: owned.length,
    totalCarat: roundCarat(carat),
    totalInvestment: roundMoney(investment),
    estimatedValue: value,
    unvaluedCount: unvalued,
    valuedInvestment,
    profitLoss: roundMoney(value - valuedInvestment),
    profitLossPercent: percentChange(valuedInvestment, value),
  };
}

type DuplicateKey = { invoice_number: string | null; certificate_lab: string | null; certificate_number: string | null };
const norm = (s: string | null) => (s ?? "").trim().toLowerCase();

/** Same invoice number, or the same lab + certificate number, cannot be entered twice. */
export function isDuplicateDiamond(existing: (DuplicateKey & { id: string })[], candidate: DuplicateKey, selfId: string) {
  return existing.some((d) => d.id !== selfId && (
    (norm(candidate.invoice_number) !== "" && norm(d.invoice_number) === norm(candidate.invoice_number)) ||
    (norm(candidate.certificate_number) !== "" && norm(d.certificate_number) === norm(candidate.certificate_number)
      && norm(d.certificate_lab) === norm(candidate.certificate_lab))
  ));
}

export const DUPLICATE_DIAMOND_MESSAGE = "This diamond looks like a duplicate (same invoice number, or same certificate).";

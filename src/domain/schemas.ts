import { z } from "zod";
import { CATEGORIES, PURITIES, netGoldWeight, validateWeights } from "@/domain/gold";
import { CLARITIES, COLOURS, CUTS, DIAMOND_TYPES, LABS, SETTING_METALS, SHAPES } from "@/domain/diamond";

const money = z.coerce.number().finite().min(0).max(99_999_999);
const optionalText = (max: number) =>
  z.string().trim().max(max).optional().transform((v) => (v ? v : null));

export const jewellerySchema = z
  .object({
    name: z.string().trim().min(1, "Name is required").max(120),
    category: z.enum(CATEGORIES),
    purchase_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date"),
    shop_name: optionalText(120),
    invoice_number: optionalText(60),
    purity: z.enum(PURITIES),
    huid: optionalText(20),
    gross_weight: z.coerce.number().finite().positive("Gross weight must be greater than 0").max(100_000),
    non_gold_weight: z.coerce.number().finite().min(0).max(100_000).default(0),
    gold_rate_at_purchase: z.preprocess(
      (v) => (v === "" || v === null || v === undefined ? null : v),
      z.coerce.number().finite().positive().max(10_000_000).nullable(),
    ),
    making_charges: money.default(0),
    wastage_charges: money.default(0),
    tax: money.default(0),
    other_charges: money.default(0),
    purchase_price: money,
    notes: optionalText(2000),
  })
  .superRefine((v, ctx) => {
    const w = validateWeights(v.gross_weight, v.non_gold_weight);
    if (!w.ok) ctx.addIssue({ code: "custom", path: ["non_gold_weight"], message: w.error });
    const d = new Date(v.purchase_date + "T00:00:00Z");
    if (Number.isNaN(d.getTime())) ctx.addIssue({ code: "custom", path: ["purchase_date"], message: "Invalid date" });
    else if (d.getTime() > Date.now() + 36 * 3600 * 1000)
      ctx.addIssue({ code: "custom", path: ["purchase_date"], message: "Purchase date cannot be in the future" });
  });

export type JewelleryInput = z.output<typeof jewellerySchema>;

/** Net weight is always derived when saving — never trusted from the form. */
export const withNetWeight = (v: JewelleryInput) => ({
  ...v,
  net_gold_weight: netGoldWeight(v.gross_weight, v.non_gold_weight),
});

export const ratesSchema = z.object({
  purity: z.enum(PURITIES),
  rate_per_gram: z.coerce.number().finite().positive("Rate must be greater than 0").max(10_000_000),
});

export const credentialsSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email"),
  password: z.string().min(8, "Password must be at least 8 characters").max(72, "Password must be at most 72 characters"),
});

/** A select left on "Not specified" sends ""; store that as null. */
const optionalEnum = <T extends readonly [string, ...string[]]>(values: T) =>
  z.preprocess((v) => (v === "" || v === undefined ? null : v), z.enum(values).nullable());

const purchaseDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date").superRefine((v, ctx) => {
  const d = new Date(v + "T00:00:00Z");
  if (Number.isNaN(d.getTime())) ctx.addIssue({ code: "custom", message: "Invalid date" });
  else if (d.getTime() > Date.now() + 36 * 3600 * 1000) ctx.addIssue({ code: "custom", message: "Purchase date cannot be in the future" });
});

export const diamondSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(120),
  diamond_type: z.enum(DIAMOND_TYPES),
  purchase_date: purchaseDate,
  shop_name: optionalText(120),
  invoice_number: optionalText(60),
  carat: z.coerce.number().finite().positive("Carat weight must be greater than 0").max(1000),
  stone_count: z.coerce.number().int("Whole number of stones").min(1).max(1000).default(1),
  shape: z.enum(SHAPES),
  cut: optionalEnum(CUTS),
  colour: optionalEnum(COLOURS),
  clarity: optionalEnum(CLARITIES),
  certificate_lab: optionalEnum(LABS),
  certificate_number: optionalText(40),
  setting_metal: optionalEnum(SETTING_METALS),
  purchase_price: money,
  current_value: z.preprocess((v) => (v === "" || v === null || v === undefined ? null : v), money.nullable()),
  notes: optionalText(2000),
});

export type DiamondInput = z.output<typeof diamondSchema>;

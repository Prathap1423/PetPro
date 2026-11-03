import { z } from "zod";
import { CATEGORIES, PURITIES, netGoldWeight, validateWeights } from "@/lib/gold";

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

/** Net weight is always derived on the server — never trusted from the client. */
export const withNetWeight = (v: JewelleryInput) => ({
  ...v,
  net_gold_weight: netGoldWeight(v.gross_weight, v.non_gold_weight),
});

export const ratesSchema = z.object({
  purity: z.enum(PURITIES),
  rate_per_gram: z.coerce.number().finite().positive("Rate must be greater than 0").max(10_000_000),
});

export const credentialsSchema = z.object({
  email: z.string().trim().email("Enter a valid email"),
  password: z.string().min(8, "Password must be at least 8 characters").max(72),
});

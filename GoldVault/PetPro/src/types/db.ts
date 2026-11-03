import type { Category, JewelleryStatus, Purity } from "@/lib/gold";

export interface Jewellery {
  id: string;
  user_id: string;
  name: string;
  category: Category;
  purchase_date: string;
  shop_name: string | null;
  invoice_number: string | null;
  purity: Purity;
  huid: string | null;
  gross_weight: number;
  non_gold_weight: number;
  net_gold_weight: number;
  gold_rate_at_purchase: number | null;
  making_charges: number;
  wastage_charges: number;
  tax: number;
  other_charges: number;
  purchase_price: number;
  status: JewelleryStatus;
  bill_path: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface JewelleryImage {
  id: string;
  jewellery_id: string;
  storage_path: string;
  is_cover: boolean;
}

export interface GoldRate {
  id: string;
  purity: Purity;
  rate_per_gram: number;
  source: string;
  updated_at: string;
}

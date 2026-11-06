import type { Category, JewelleryStatus, Purity } from "@/domain/gold";
import type { Clarity, Colour, Cut, DiamondType, Lab, SettingMetal, Shape } from "@/domain/diamond";

export interface Jewellery {
  id: string;
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

export interface StoredImage extends JewelleryImage {
  created_at: string;
}

export interface Transaction {
  id: string;
  jewellery_id: string;
  transaction_type: "purchase" | "sale" | "gift" | "exchange";
  transaction_date: string;
  amount: number;
  created_at: string;
}

export interface Diamond {
  id: string;
  name: string;
  diamond_type: DiamondType;
  purchase_date: string;
  shop_name: string | null;
  invoice_number: string | null;
  carat: number;
  stone_count: number;
  shape: Shape;
  cut: Cut | null;
  colour: Colour | null;
  clarity: Clarity | null;
  certificate_lab: Lab | null;
  certificate_number: string | null;
  setting_metal: SettingMetal | null;
  purchase_price: number;
  current_value: number | null;
  value_updated_at: string | null;
  status: JewelleryStatus;
  bill_path: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

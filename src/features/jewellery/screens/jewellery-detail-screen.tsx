"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, FileText, Pencil } from "lucide-react";
import { getJewelleryById } from "@/features/jewellery/queries";
import { getRates } from "@/features/rates/queries";
import { useVaultData } from "@/hooks/use-vault-data";
import { estimateCurrentValue, formatGrams, formatINR, formatSovereigns, gramsToSovereigns, percentChange, rateForPurity } from "@/domain/gold";
import { formatDate } from "@/lib/utils";
import { Badge, Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ImageGallery } from "@/features/jewellery/components/image-gallery";
import { DeleteButton } from "@/features/jewellery/components/delete-button";
import { ItemNotFound } from "@/features/jewellery/components/item-not-found";

export function JewelleryDetailScreen() {
  return <Suspense><JewelleryDetail /></Suspense>;
}

function JewelleryDetail() {
  const id = useSearchParams().get("id") ?? "";
  const loaded = useVaultData(() => Promise.all([getJewelleryById(id), getRates()]), [id]);
  if (!loaded) return null;
  const [data, { rates }] = loaded;
  if (!data) return <ItemNotFound />;
  const { item, images, billUrl } = data;
  const value = estimateCurrentValue({ netGoldWeight: item.net_gold_weight, purity: item.purity }, rates);
  const lookup = rateForPurity(item.purity, rates);
  const change = value === null ? null : percentChange(item.purchase_price, value);

  const rows: [string, string | null][] = [
    ["Category", item.category], ["Purity", item.purity], ["Purchase date", formatDate(item.purchase_date)],
    ["Shop", item.shop_name], ["Invoice no.", item.invoice_number], ["HUID", item.huid],
    ["Gross weight", formatGrams(item.gross_weight)], ["Stone / non-gold", formatGrams(item.non_gold_weight)],
    ["Net gold weight", `${formatGrams(item.net_gold_weight)} (${formatSovereigns(gramsToSovereigns(item.net_gold_weight))})`],
    ["Rate at purchase", item.gold_rate_at_purchase ? `${formatINR(item.gold_rate_at_purchase)}/g` : null],
    ["Making charges", formatINR(item.making_charges, true)], ["Wastage", formatINR(item.wastage_charges, true)],
    ["GST / tax", formatINR(item.tax, true)], ["Other charges", formatINR(item.other_charges, true)],
  ];

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <Link href="/collection" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" />Collection</Link>
      <div className="grid gap-6 md:grid-cols-2">
        <ImageGallery images={images} name={item.name} />
        <div className="space-y-4">
          <div>
            <h1 className="font-serif text-2xl font-semibold">{item.name}</h1>
            <div className="mt-2 flex gap-2"><Badge>{item.category}</Badge><Badge>{item.purity}</Badge><Badge className="capitalize">{item.status}</Badge></div>
          </div>
          <Card>
            <CardContent className="grid grid-cols-2 gap-4 pt-4">
              <div><p className="text-xs text-muted-foreground">Purchase price</p><p className="font-serif text-xl font-semibold">{formatINR(item.purchase_price)}</p></div>
              <div>
                <p className="text-xs text-muted-foreground">Estimated metal value</p>
                <p className="font-serif text-xl font-semibold">{value === null ? "Set rate" : formatINR(value)}</p>
                {change !== null && <p className={`text-xs ${change >= 0 ? "text-success" : "text-destructive"}`}>{change >= 0 ? "+" : ""}{change}% vs purchase</p>}
                {lookup?.basis === "derived" && <p className="text-xs text-muted-foreground">derived from 24K rate</p>}
              </div>
            </CardContent>
          </Card>
          <div className="flex flex-wrap gap-2">
            <Link href={`/jewellery/edit?id=${item.id}`} className="inline-flex h-11 items-center gap-2 rounded-md glass-control px-4 text-sm font-medium hover:bg-foreground/5"><Pencil className="h-4 w-4" />Edit</Link>
            {billUrl && <a href={billUrl} target="_blank" rel="noopener noreferrer" className="inline-flex h-11 items-center gap-2 rounded-md glass-control px-4 text-sm font-medium hover:bg-foreground/5"><FileText className="h-4 w-4" />View bill</a>}
            <DeleteButton id={item.id} name={item.name} />
          </div>
        </div>
      </div>
      <Card>
        <CardHeader><CardTitle>Details</CardTitle></CardHeader>
        <CardContent>
          <dl className="grid gap-x-8 gap-y-3 sm:grid-cols-2">
            {rows.filter(([, v]) => v).map(([k, v]) => (
              <div key={k} className="flex justify-between border-b border-border/60 pb-2 text-sm"><dt className="text-muted-foreground">{k}</dt><dd className="text-right font-medium">{v}</dd></div>
            ))}
          </dl>
          {item.notes && <p className="mt-4 whitespace-pre-wrap text-sm">{item.notes}</p>}
        </CardContent>
      </Card>
    </div>
  );
}

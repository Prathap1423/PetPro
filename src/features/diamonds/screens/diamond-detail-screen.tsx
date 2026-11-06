"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, FileText, Pencil } from "lucide-react";
import { getDiamondById } from "@/features/diamonds/queries";
import { deleteDiamond } from "@/features/diamonds/service";
import { useVaultData } from "@/hooks/use-vault-data";
import { formatCarat } from "@/domain/diamond";
import { formatINR, percentChange } from "@/domain/gold";
import { formatDate } from "@/lib/utils";
import { Badge, Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ImageGallery } from "@/features/items/components/image-gallery";
import { DeleteButton } from "@/features/items/components/delete-button";
import { ItemNotFound } from "@/features/items/components/item-not-found";

export function DiamondDetailScreen() {
  return <Suspense><DiamondDetail /></Suspense>;
}

function DiamondDetail() {
  const id = useSearchParams().get("id") ?? "";
  // Wrapped so "still loading" (undefined) and "not found" (null) stay distinct.
  const data = useVaultData(() => getDiamondById(id).then((d) => ({ d })), [id])?.d;
  if (data === undefined) return null;
  if (!data) return <ItemNotFound noun="Diamond" backHref="/diamonds" backLabel="Back to diamonds" />;
  const { item, images, billUrl } = data;
  const change = item.current_value === null ? null : percentChange(item.purchase_price, item.current_value);
  const certificate = [item.certificate_lab, item.certificate_number].filter(Boolean).join(" · ") || null;

  const rows: [string, string | null][] = [
    ["Type", item.diamond_type], ["Shape", item.shape], ["Carat weight", formatCarat(item.carat)],
    ["Stones", item.stone_count > 1 ? String(item.stone_count) : null],
    ["Cut", item.cut], ["Colour", item.colour], ["Clarity", item.clarity],
    ["Certificate", certificate], ["Setting metal", item.setting_metal],
    ["Purchase date", formatDate(item.purchase_date)], ["Shop", item.shop_name], ["Invoice no.", item.invoice_number],
  ];

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <Link href="/diamonds" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" />Diamonds</Link>
      <div className="grid gap-6 md:grid-cols-2">
        <ImageGallery images={images} name={item.name} />
        <div className="space-y-4">
          <div>
            <h1 className="font-serif text-2xl font-semibold">{item.name}</h1>
            <div className="mt-2 flex flex-wrap gap-2"><Badge>{item.diamond_type}</Badge><Badge>{item.shape}</Badge><Badge>{formatCarat(item.carat)}</Badge><Badge className="capitalize">{item.status}</Badge></div>
          </div>
          <Card>
            <CardContent className="grid grid-cols-2 gap-4 pt-4">
              <div><p className="text-xs text-muted-foreground">Purchase price</p><p className="font-serif text-xl font-semibold">{formatINR(item.purchase_price)}</p></div>
              <div>
                <p className="text-xs text-muted-foreground">Estimated value</p>
                {item.current_value === null ? (
                  <Link href={`/diamonds/edit?id=${item.id}`} className="font-serif text-xl font-semibold text-gold underline">Add value</Link>
                ) : (
                  <p className="font-serif text-xl font-semibold">{formatINR(item.current_value)}</p>
                )}
                {change !== null && <p className={`text-xs ${change >= 0 ? "text-success" : "text-destructive"}`}>{change >= 0 ? "+" : ""}{change}% vs purchase</p>}
                {item.value_updated_at && <p className="text-xs text-muted-foreground">updated {formatDate(item.value_updated_at)}</p>}
              </div>
            </CardContent>
          </Card>
          <div className="flex flex-wrap gap-2">
            <Link href={`/diamonds/edit?id=${item.id}`} className="inline-flex h-11 items-center gap-2 rounded-md glass-control px-4 text-sm font-medium hover:bg-foreground/5"><Pencil className="h-4 w-4" />Edit</Link>
            {billUrl && <a href={billUrl} target="_blank" rel="noopener noreferrer" className="inline-flex h-11 items-center gap-2 rounded-md glass-control px-4 text-sm font-medium hover:bg-foreground/5"><FileText className="h-4 w-4" />View bill</a>}
            <DeleteButton name={item.name} noun="diamond" onDelete={() => deleteDiamond(item.id)} backHref="/diamonds" />
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
          <p className="mt-4 text-xs text-muted-foreground">The estimated value is the figure you entered — for example a jeweller&apos;s quote — not a live market price.</p>
        </CardContent>
      </Card>
    </div>
  );
}

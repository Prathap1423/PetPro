import Link from "next/link";
import { ImageOff } from "lucide-react";
import { Badge } from "@/components/ui/card";
import { estimateCurrentValue, formatGrams, formatINR, formatSovereigns, gramsToSovereigns, type RateMap } from "@/domain/gold";
import { formatDate, cn } from "@/lib/utils";
import type { JewelleryWithCover } from "@/features/jewellery/queries";

export function JewelleryCard({ item, rates, layout = "grid" }: { item: JewelleryWithCover; rates: RateMap; layout?: "grid" | "list" }) {
  const value = estimateCurrentValue({ netGoldWeight: item.net_gold_weight, purity: item.purity }, rates);
  return (
    <Link
      href={`/jewellery?id=${item.id}`}
      className={cn("group overflow-hidden rounded-lg border border-border bg-card card-pop shadow-sm focus-visible:ring-2 focus-visible:ring-gold", layout === "list" ? "flex" : "block")}
    >
      <div className={cn("relative overflow-hidden bg-muted", layout === "list" ? "h-28 w-28 shrink-0" : "aspect-square w-full")}>
        {item.cover_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={item.cover_url} alt={item.name} loading="lazy" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
        ) : (
          <div className="grid h-full w-full place-items-center text-muted-foreground"><ImageOff className="h-8 w-8" /></div>
        )}
        {item.status !== "owned" && <Badge className="absolute left-2 top-2 capitalize">{item.status}</Badge>}
      </div>
      <div className="min-w-0 flex-1 space-y-1 p-3">
        <h3 className="truncate font-serif text-base font-semibold">{item.name}</h3>
        <div className="flex flex-wrap gap-1.5"><Badge>{item.category}</Badge><Badge>{item.purity}</Badge></div>
        <p className="text-sm">{formatGrams(item.net_gold_weight)} · {formatSovereigns(gramsToSovereigns(item.net_gold_weight))}</p>
        <p className="text-sm font-medium tabular-nums">{formatINR(item.purchase_price)}</p>
        <p className="text-xs text-muted-foreground">Bought {formatDate(item.purchase_date)}</p>
        <p className="text-xs text-muted-foreground">Est. value: {value === null ? "set rate" : formatINR(value)}</p>
      </div>
    </Link>
  );
}

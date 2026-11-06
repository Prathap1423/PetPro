import Link from "next/link";
import { Diamond as DiamondIcon } from "lucide-react";
import { Badge } from "@/components/ui/card";
import { gradeLine } from "@/domain/diamond";
import { formatINR } from "@/domain/gold";
import { formatDate, cn } from "@/lib/utils";
import type { DiamondWithCover } from "@/features/diamonds/queries";

export function DiamondCard({ item, layout = "grid" }: { item: DiamondWithCover; layout?: "grid" | "list" }) {
  return (
    <Link
      href={`/diamonds/item?id=${item.id}`}
      className={cn("glass group overflow-hidden rounded-lg card-pop focus-visible:ring-2 focus-visible:ring-gold", layout === "list" ? "flex" : "block")}
    >
      <div className={cn("relative overflow-hidden bg-muted", layout === "list" ? "h-28 w-28 shrink-0" : "aspect-square w-full")}>
        {item.cover_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={item.cover_url} alt={item.name} loading="lazy" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
        ) : (
          <div className="grid h-full w-full place-items-center text-muted-foreground"><DiamondIcon className="h-8 w-8" /></div>
        )}
        {item.status !== "owned" && <Badge className="absolute left-2 top-2 capitalize">{item.status}</Badge>}
      </div>
      <div className="min-w-0 flex-1 space-y-1 p-3">
        <h3 className="truncate font-serif text-base font-semibold">{item.name}</h3>
        <div className="flex flex-wrap gap-1.5"><Badge>{item.diamond_type}</Badge><Badge>{item.shape}</Badge></div>
        <p className="text-sm">{gradeLine(item)}{item.stone_count > 1 ? ` · ${item.stone_count} stones` : ""}</p>
        <p className="text-sm font-medium tabular-nums">{formatINR(item.purchase_price)}</p>
        <p className="text-xs text-muted-foreground">Bought {formatDate(item.purchase_date)}</p>
        <p className="text-xs text-muted-foreground">Est. value: {item.current_value === null ? "not set" : formatINR(item.current_value)}</p>
      </div>
    </Link>
  );
}

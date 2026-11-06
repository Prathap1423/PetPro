import { Diamond as DiamondIcon, Gem, TrendingUp, Wallet } from "lucide-react";
import { formatCarat, summariseDiamonds } from "@/domain/diamond";
import { formatINR } from "@/domain/gold";
import { StatCard } from "@/features/dashboard/components/stat-card";
import type { Diamond } from "@/domain/types";

/** Four stat cards for owned diamonds: count, carats, investment, estimated value with profit/loss. */
export function DiamondSummary({ items }: { items: Diamond[] }) {
  const s = summariseDiamonds(items.map((d) => ({ carat: d.carat, purchasePrice: d.purchase_price, currentValue: d.current_value, status: d.status })));
  const valued = s.itemCount > s.unvaluedCount;
  const pl = s.profitLoss;
  return (
    <div className="stagger grid grid-cols-2 gap-3 lg:grid-cols-4">
      <StatCard label="Diamond pieces" value={String(s.itemCount)} icon={<DiamondIcon className="h-5 w-5" />} />
      <StatCard label="Total carat weight" value={formatCarat(s.totalCarat)} icon={<Gem className="h-5 w-5" />} />
      <StatCard label="Diamond investment" value={formatINR(s.totalInvestment)} icon={<Wallet className="h-5 w-5" />} />
      <StatCard
        label="Estimated diamond value"
        value={valued ? formatINR(s.estimatedValue) : "Add values"}
        sub={valued
          ? `${pl >= 0 ? "+" : "−"}${formatINR(Math.abs(pl))}${s.profitLossPercent !== null ? ` (${s.profitLossPercent >= 0 ? "+" : ""}${s.profitLossPercent}%)` : ""}${s.unvaluedCount ? ` · ${s.unvaluedCount} without a value` : ""}`
          : "Enter a current value on each diamond"}
        tone={valued ? (pl >= 0 ? "positive" : "negative") : undefined}
        icon={<TrendingUp className="h-5 w-5" />}
      />
    </div>
  );
}

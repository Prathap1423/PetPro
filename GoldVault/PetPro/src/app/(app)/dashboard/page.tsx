import Link from "next/link";
import { Coins, Gem, HandCoins, Plus, Scale, TrendingUp, Wallet } from "lucide-react";
import { getJewellery, getRates } from "@/lib/data";
import { formatGrams, formatINR, formatSovereigns, summariseInventory } from "@/lib/gold";
import { StatCard } from "@/components/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { JewelleryCard } from "@/components/jewellery-card";

export default async function DashboardPage() {
  const [items, { rates }] = await Promise.all([getJewellery(), getRates()]);
  const summary = summariseInventory(
    items.map((i) => ({
      netGoldWeight: i.net_gold_weight, purity: i.purity, purchasePrice: i.purchase_price,
      status: i.status, makingCharges: i.making_charges,
    })),
    rates,
  );
  const hasRates = Object.keys(rates).length > 0;
  const owned = items.filter((i) => i.status === "owned");

  if (!items.length) {
    return (
      <div className="mx-auto mt-16 max-w-md text-center">
        <span className="gold-gradient mx-auto mb-4 grid h-16 w-16 place-items-center rounded-full text-gold-foreground"><Gem className="h-8 w-8" /></span>
        <h1 className="font-serif text-2xl font-semibold">Your vault is empty</h1>
        <p className="mt-2 text-muted-foreground">Add your first piece of gold jewellery — snap a photo, enter the weight and price, and your totals appear here.</p>
        <Link href="/add" className="gold-gradient mt-6 inline-flex h-12 items-center gap-2 rounded-md px-6 font-medium text-gold-foreground shadow"><Plus className="h-5 w-5" />Add Gold</Link>
      </div>
    );
  }

  const pl = summary.profitLoss;
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-serif text-2xl font-semibold">Dashboard</h1>
        <Link href="/add" className="gold-gradient hidden h-11 items-center gap-2 rounded-md px-4 text-sm font-medium text-gold-foreground shadow md:flex"><Plus className="h-5 w-5" />Add Gold</Link>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Jewellery items" value={String(summary.itemCount)} icon={<Gem className="h-5 w-5" />} />
        <StatCard label="Total gold weight" value={formatGrams(summary.totalGrams)} sub="net gold" icon={<Scale className="h-5 w-5" />} />
        <StatCard label="In sovereigns (பவுன்)" value={formatSovereigns(summary.totalSovereigns)} sub="1 sovereign = 8 g" icon={<Coins className="h-5 w-5" />} />
        <StatCard label="Total investment" value={formatINR(summary.totalInvestment)} icon={<Wallet className="h-5 w-5" />} />
        <StatCard
          label="Estimated current value"
          value={hasRates ? formatINR(summary.estimatedValue) : "Set rates"}
          sub={hasRates ? (summary.unvaluedCount ? `${summary.unvaluedCount} item(s) have no rate` : "gold metal value") : "Enter today's gold rate"}
          icon={<TrendingUp className="h-5 w-5" />}
        />
        <StatCard
          label="Estimated profit / loss"
          value={hasRates ? `${pl >= 0 ? "+" : "−"}${formatINR(Math.abs(pl))}` : "—"}
          sub={hasRates && summary.profitLossPercent !== null ? `${summary.profitLossPercent >= 0 ? "+" : ""}${summary.profitLossPercent}%` : undefined}
          tone={hasRates ? (pl >= 0 ? "positive" : "negative") : undefined}
        />
        <StatCard label="Making charges paid" value={formatINR(summary.totalMakingCharges)} icon={<HandCoins className="h-5 w-5" />} />
      </div>

      {!hasRates && (
        <Card><CardContent className="pt-4 text-sm">
          To see the estimated value, <Link href="/rates" className="text-gold underline">enter today&apos;s gold rate</Link>.
        </CardContent></Card>
      )}
      <p className="text-xs text-muted-foreground">
        Estimated value is the gold metal value at the rates you entered — not a guaranteed resale price. Making charges, wastage, taxes and shop deductions affect what you would actually receive.
      </p>

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle>Recently added</CardTitle>
          <Link href="/collection" className="text-sm text-gold underline">View all</Link>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {owned.slice(0, 3).map((i) => <JewelleryCard key={i.id} item={i} rates={rates} />)}
        </CardContent>
      </Card>
    </div>
  );
}

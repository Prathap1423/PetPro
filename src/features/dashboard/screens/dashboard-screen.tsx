"use client";

import Link from "next/link";
import { Coins, Diamond, Gem, HandCoins, Plus, Scale, TrendingUp, Wallet } from "lucide-react";
import { getJewellery } from "@/features/jewellery/queries";
import { getRates } from "@/features/rates/queries";
import { getDiamonds } from "@/features/diamonds/queries";
import { DiamondSummary } from "@/features/diamonds/components/diamond-summary";
import { DiamondCard } from "@/features/diamonds/components/diamond-card";
import { useVaultData } from "@/hooks/use-vault-data";
import { formatGrams, formatINR, formatSovereigns, summariseInventory } from "@/domain/gold";
import { StatCard } from "@/features/dashboard/components/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { JewelleryCard } from "@/features/jewellery/components/jewellery-card";
import { PageSkeleton } from "@/components/page-skeleton";

export function DashboardScreen() {
  const data = useVaultData(() => Promise.all([getJewellery(), getRates(), getDiamonds()]));
  if (!data) return <PageSkeleton />;
  const [items, { rates }, diamonds] = data;
  const summary = summariseInventory(
    items.map((i) => ({
      netGoldWeight: i.net_gold_weight, purity: i.purity, purchasePrice: i.purchase_price,
      status: i.status, makingCharges: i.making_charges,
    })),
    rates,
  );
  const hasRates = Object.keys(rates).length > 0;
  const owned = items.filter((i) => i.status === "owned");
  const ownedDiamonds = diamonds.filter((d) => d.status === "owned");

  if (!items.length && !diamonds.length) {
    return (
      <div className="mx-auto mt-16 max-w-md text-center">
        <span className="gold-gradient animate-pop mx-auto mb-4 grid h-16 w-16 place-items-center rounded-full text-gold-foreground"><Gem className="h-8 w-8" /></span>
        <h1 className="font-serif text-2xl font-semibold">Your vault is empty</h1>
        <p className="mt-2 text-muted-foreground">Add your first piece of gold jewellery or a diamond — snap a photo, enter the details and price, and your totals appear here.</p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <Link href="/add" className="gold-gradient gold-shine transition active:scale-[0.97] inline-flex h-12 items-center gap-2 rounded-md px-6 font-medium text-gold-foreground shadow"><Plus className="h-5 w-5" />Add Gold</Link>
          <Link href="/diamonds/add" className="glass-control transition active:scale-[0.97] inline-flex h-12 items-center gap-2 rounded-md px-6 font-medium hover:bg-foreground/5"><Diamond className="h-5 w-5" />Add Diamond</Link>
        </div>
      </div>
    );
  }

  const pl = summary.profitLoss;
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-serif text-2xl font-semibold">Dashboard</h1>
        <div className="hidden gap-2 md:flex">
          <Link href="/diamonds/add" className="glass-control transition active:scale-[0.97] inline-flex h-11 items-center gap-2 rounded-md px-4 text-sm font-medium hover:bg-foreground/5"><Diamond className="h-5 w-5" />Add Diamond</Link>
          <Link href="/add" className="gold-gradient gold-shine transition active:scale-[0.97] inline-flex h-11 items-center gap-2 rounded-md px-4 text-sm font-medium text-gold-foreground shadow"><Plus className="h-5 w-5" />Add Gold</Link>
        </div>
      </div>

      <h2 className="font-serif text-xl font-semibold">Gold</h2>
      {items.length > 0 ? (<>
      <div className="stagger grid grid-cols-2 gap-3 lg:grid-cols-4">
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

      {owned.length > 0 && (
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Recently added gold</CardTitle>
            <Link href="/collection" className="text-sm text-gold underline">View all</Link>
          </CardHeader>
          <CardContent className="stagger grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {owned.slice(0, 3).map((i) => <JewelleryCard key={i.id} item={i} rates={rates} />)}
          </CardContent>
        </Card>
      )}
      </>) : (
        <Card><CardContent className="pt-4 text-sm">No gold jewellery yet. <Link href="/add" className="text-gold underline">Add your first piece</Link>.</CardContent></Card>
      )}

      <h2 className="pt-2 font-serif text-xl font-semibold">Diamonds</h2>
      {diamonds.length > 0 ? (<>
        <DiamondSummary items={diamonds} />
        {ownedDiamonds.length > 0 && (
          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle>Recently added diamonds</CardTitle>
              <Link href="/diamonds" className="text-sm text-gold underline">View all</Link>
            </CardHeader>
            <CardContent className="stagger grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {ownedDiamonds.slice(0, 3).map((d) => <DiamondCard key={d.id} item={d} />)}
            </CardContent>
          </Card>
        )}
      </>) : (
        <Card><CardContent className="pt-4 text-sm">No diamonds yet. <Link href="/diamonds/add" className="text-gold underline">Add a ring, earrings or a loose stone</Link> with its grading and certificate.</CardContent></Card>
      )}
    </div>
  );
}

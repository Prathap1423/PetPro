"use client";

import Link from "next/link";
import { Plus } from "lucide-react";
import { getDiamonds } from "@/features/diamonds/queries";
import { useVaultData } from "@/hooks/use-vault-data";
import { DiamondList } from "@/features/diamonds/components/diamond-list";
import { DiamondSummary } from "@/features/diamonds/components/diamond-summary";
import { PageSkeleton } from "@/components/page-skeleton";

export function DiamondsScreen() {
  const items = useVaultData(getDiamonds);
  if (!items) return <PageSkeleton />;
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-serif text-2xl font-semibold">My Diamonds</h1>
        {items.length > 0 && (
          <Link href="/diamonds/add" className="gold-gradient gold-shine transition active:scale-[0.97] inline-flex h-11 items-center gap-2 rounded-md px-4 text-sm font-medium text-gold-foreground shadow"><Plus className="h-5 w-5" />Add Diamond</Link>
        )}
      </div>
      {items.length > 0 && <DiamondSummary items={items} />}
      <DiamondList items={items} />
    </div>
  );
}

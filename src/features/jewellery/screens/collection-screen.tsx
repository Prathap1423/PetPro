"use client";

import { getJewellery } from "@/features/jewellery/queries";
import { getRates } from "@/features/rates/queries";
import { useVaultData } from "@/hooks/use-vault-data";
import { CollectionView } from "@/features/jewellery/components/collection-view";
import { PageSkeleton } from "@/components/page-skeleton";

export function CollectionScreen() {
  const data = useVaultData(() => Promise.all([getJewellery(), getRates()]));
  if (!data) return <PageSkeleton />;
  const [items, { rates }] = data;
  return (
    <div className="space-y-4">
      <h1 className="font-serif text-2xl font-semibold">My Gold Collection</h1>
      <CollectionView items={items} rates={rates} />
    </div>
  );
}

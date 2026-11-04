"use client";

import { getJewellery, getRates, useVaultData } from "@/lib/data";
import { CollectionView } from "@/components/collection-view";
import Loading from "./loading";

export default function CollectionPage() {
  const data = useVaultData(() => Promise.all([getJewellery(), getRates()]));
  if (!data) return <Loading />;
  const [items, { rates }] = data;
  return (
    <div className="space-y-4">
      <h1 className="font-serif text-2xl font-semibold">My Gold Collection</h1>
      <CollectionView items={items} rates={rates} />
    </div>
  );
}

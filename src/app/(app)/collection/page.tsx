import { getJewellery, getRates } from "@/lib/data";
import { CollectionView } from "@/components/collection-view";

export default async function CollectionPage() {
  const [items, { rates }] = await Promise.all([getJewellery(), getRates()]);
  return (
    <div className="space-y-4">
      <h1 className="font-serif text-2xl font-semibold">My Gold Collection</h1>
      <CollectionView items={items} rates={rates} />
    </div>
  );
}

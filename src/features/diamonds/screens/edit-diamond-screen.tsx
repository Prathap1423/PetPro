"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { getDiamondById } from "@/features/diamonds/queries";
import { useVaultData } from "@/hooks/use-vault-data";
import { DiamondForm } from "@/features/diamonds/components/diamond-form";
import { ItemNotFound } from "@/features/items/components/item-not-found";

export function EditDiamondScreen() {
  return <Suspense><EditDiamond /></Suspense>;
}

function EditDiamond() {
  const id = useSearchParams().get("id") ?? "";
  // Wrapped so "still loading" (undefined) and "not found" (null) stay distinct.
  const data = useVaultData(() => getDiamondById(id).then((d) => ({ d })), [id])?.d;
  if (data === undefined) return null;
  if (!data) return <ItemNotFound noun="Diamond" backHref="/diamonds" backLabel="Back to diamonds" />;
  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <h1 className="font-serif text-2xl font-semibold">Edit diamond</h1>
      <DiamondForm key={data.item.id} existing={data} />
    </div>
  );
}

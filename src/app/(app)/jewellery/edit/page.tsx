"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { getJewelleryById, useVaultData } from "@/lib/data";
import { JewelleryForm } from "@/components/jewellery-form";
import { ItemNotFound } from "@/components/item-not-found";

export default function EditPage() {
  return <Suspense><EditJewellery /></Suspense>;
}

function EditJewellery() {
  const id = useSearchParams().get("id") ?? "";
  // Wrapped so "still loading" (undefined) and "not found" (null) stay distinct.
  const data = useVaultData(() => getJewelleryById(id).then((d) => ({ d })), [id])?.d;
  if (data === undefined) return null;
  if (!data) return <ItemNotFound />;
  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <h1 className="font-serif text-2xl font-semibold">Edit jewellery</h1>
      <JewelleryForm key={data.item.id} existing={{ item: data.item, images: data.images, billUrl: data.billUrl }} />
    </div>
  );
}

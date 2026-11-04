import { notFound } from "next/navigation";
import { getJewelleryById } from "@/lib/data";
import { JewelleryForm } from "@/components/jewellery-form";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function EditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  const data = await getJewelleryById(id);
  if (!data) notFound();
  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <h1 className="font-serif text-2xl font-semibold">Edit jewellery</h1>
      <JewelleryForm existing={{ item: data.item, images: data.images, billUrl: data.billUrl }} />
    </div>
  );
}

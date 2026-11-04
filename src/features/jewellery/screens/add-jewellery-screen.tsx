import { JewelleryForm } from "@/features/jewellery/components/jewellery-form";

export function AddJewelleryScreen() {
  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <h1 className="font-serif text-2xl font-semibold">Add Gold</h1>
      <JewelleryForm />
    </div>
  );
}

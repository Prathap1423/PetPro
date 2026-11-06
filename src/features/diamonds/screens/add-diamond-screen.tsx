import { DiamondForm } from "@/features/diamonds/components/diamond-form";

export function AddDiamondScreen() {
  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <h1 className="font-serif text-2xl font-semibold">Add Diamond</h1>
      <DiamondForm />
    </div>
  );
}

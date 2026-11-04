import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { JewelleryForm } from "@/components/jewellery-form";

export default async function AddPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <h1 className="font-serif text-2xl font-semibold">Add Gold</h1>
      <JewelleryForm userId={user.id} />
    </div>
  );
}

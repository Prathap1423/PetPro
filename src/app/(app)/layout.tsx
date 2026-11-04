import { redirect } from "next/navigation";
import { AppNav } from "@/components/app-nav";
import { createClient } from "@/lib/supabase/server";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: profile } = await supabase.from("profiles").select("display_name").eq("id", user.id).single();
  return (
    <div className="min-h-screen">
      <AppNav name={profile?.display_name ?? user.email ?? ""} />
      <main className="mx-auto max-w-6xl px-4 pb-28 pt-4 md:ml-60 md:max-w-none md:px-8 md:pb-10 md:pt-8">{children}</main>
    </div>
  );
}

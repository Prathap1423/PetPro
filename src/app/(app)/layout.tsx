import { AppNav } from "@/components/app-nav";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen">
      <AppNav />
      <main className="mx-auto max-w-6xl px-4 pb-28 pt-4 md:ml-60 md:max-w-none md:px-8 md:pb-10 md:pt-8">{children}</main>
    </div>
  );
}

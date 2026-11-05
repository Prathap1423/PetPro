"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Gem, LayoutDashboard, LineChart, LogOut, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { signOut } from "@/features/auth/service";

const links = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/collection", label: "Collection", icon: Gem },
  { href: "/rates", label: "Gold Rates", icon: LineChart },
];

function SignOutButton() {
  return (
    <Button variant="ghost" size="icon" aria-label="Sign out" title="Sign out" onClick={() => signOut()}>
      <LogOut className="h-5 w-5" />
    </Button>
  );
}

export function AppNav() {
  const path = usePathname();
  const active = (href: string) => path === href || path.startsWith(href + "/");
  return (
    <>
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 hidden w-60 flex-col border-r border-border bg-card p-4 md:flex">
        <Link href="/dashboard" className="mb-8 flex items-center gap-2 font-serif text-xl font-semibold">
          <span className="gold-gradient grid h-9 w-9 place-items-center rounded-full text-gold-foreground"><Gem className="h-5 w-5" /></span>
          My Gold Vault
        </Link>
        <nav className="flex flex-1 flex-col gap-1">
          {links.map(({ href, label, icon: Icon }) => (
            <Link key={href} href={href} className={cn("flex h-11 items-center gap-3 rounded-md px-3 text-sm font-medium hover:bg-muted", active(href) && "bg-muted text-gold")}>
              <Icon className="h-5 w-5" />{label}
            </Link>
          ))}
          <Link href="/add" className="gold-gradient mt-4 flex h-11 items-center justify-center gap-2 rounded-md text-sm font-medium text-gold-foreground shadow">
            <Plus className="h-5 w-5" />Add Gold
          </Link>
        </nav>
        <div className="flex justify-end gap-1 border-t border-border pt-3">
          <ThemeToggle />
          <SignOutButton />
        </div>
      </aside>

      {/* Mobile top bar */}
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-border bg-card/95 px-4 backdrop-blur md:hidden">
        <span className="font-serif text-lg font-semibold">My Gold Vault</span>
        <div className="flex gap-1"><ThemeToggle /><SignOutButton /></div>
      </header>

      {/* Mobile bottom nav + floating Add Gold button */}
      <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-3 border-t border-border bg-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
        {links.map(({ href, label, icon: Icon }) => (
          <Link key={href} href={href} className={cn("flex h-16 flex-col items-center justify-center gap-1 text-xs", active(href) ? "text-gold" : "text-muted-foreground")}>
            <Icon className="h-6 w-6" />{label}
          </Link>
        ))}
      </nav>
      <Link href="/add" aria-label="Add Gold" className="gold-gradient fixed bottom-24 right-4 z-40 grid h-14 w-14 place-items-center rounded-full text-gold-foreground shadow-lg md:hidden">
        <Plus className="h-7 w-7" />
      </Link>
    </>
  );
}

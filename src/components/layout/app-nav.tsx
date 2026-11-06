"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Diamond, Gem, LayoutDashboard, LineChart, LogOut, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { signOut } from "@/features/auth/service";

const links = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/collection", label: "Gold", icon: Gem },
  { href: "/diamonds", label: "Diamonds", icon: Diamond },
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
  // The floating + button adds whatever kind of item you are looking at.
  const add = active("/diamonds") ? { href: "/diamonds/add", label: "Add Diamond" } : { href: "/add", label: "Add Gold" };
  // Hidden on add/edit forms, where it would cover the Save button.
  const onForm = /\/(add|edit)\/?$/.test(path);
  return (
    <>
      {/* Desktop sidebar */}
      <aside className="glass fixed inset-y-3 left-3 z-30 hidden w-60 flex-col rounded-[1.75rem] p-4 md:flex">
        <Link href="/dashboard" className="mb-8 flex items-center gap-2 font-serif text-xl font-semibold">
          <span className="gold-gradient grid h-9 w-9 place-items-center rounded-full text-gold-foreground"><Gem className="h-5 w-5" /></span>
          My Gold Vault
        </Link>
        <nav className="flex flex-1 flex-col gap-1">
          {links.map(({ href, label, icon: Icon }) => (
            <Link key={href} href={href} className={cn("flex h-11 items-center gap-3 rounded-md px-3 text-sm font-medium transition hover:bg-foreground/5", active(href) && "bg-foreground/[.07] text-gold")}>
              <Icon className="h-5 w-5" />{label}
            </Link>
          ))}
          <Link href="/add" className="gold-gradient gold-shine transition active:scale-[0.97] mt-4 flex h-11 items-center justify-center gap-2 rounded-md text-sm font-medium text-gold-foreground shadow">
            <Plus className="h-5 w-5" />Add Gold
          </Link>
          <Link href="/diamonds/add" className="glass-control mt-2 flex h-11 items-center justify-center gap-2 rounded-md text-sm font-medium transition hover:bg-foreground/5 active:scale-[0.97]">
            <Diamond className="h-5 w-5" />Add Diamond
          </Link>
        </nav>
        <div className="flex justify-end gap-1 border-t border-foreground/10 pt-3">
          <ThemeToggle />
          <SignOutButton />
        </div>
      </aside>

      {/* Mobile top bar */}
      <header className="glass sticky top-0 z-30 flex h-14 items-center justify-between rounded-none border-x-0 border-t-0 px-4 md:hidden">
        <span className="font-serif text-lg font-semibold">My Gold Vault</span>
        <div className="flex gap-1"><ThemeToggle /><SignOutButton /></div>
      </header>

      {/* Mobile bottom nav + floating Add Gold button */}
      <nav className="glass fixed inset-x-4 bottom-[calc(env(safe-area-inset-bottom)+0.75rem)] z-30 grid grid-cols-4 gap-1 rounded-full p-1.5 md:hidden">
        {links.map(({ href, label, icon: Icon }) => (
          <Link key={href} href={href} className={cn("flex h-14 flex-col items-center justify-center gap-0.5 rounded-full text-xs transition", active(href) ? "bg-foreground/[.08] text-gold" : "text-muted-foreground")}>
            <Icon className="h-6 w-6" />{label}
          </Link>
        ))}
      </nav>
      {!onForm && (
        <Link href={add.href} aria-label={add.label} className="gold-gradient gold-shine animate-pop transition hover:scale-105 active:scale-95 fixed bottom-[calc(env(safe-area-inset-bottom)+5.75rem)] right-5 z-40 grid h-14 w-14 place-items-center rounded-full text-gold-foreground shadow-lg md:hidden">
          <Plus className="h-7 w-7" />
        </Link>
      )}
    </>
  );
}

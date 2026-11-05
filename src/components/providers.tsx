"use client";

import { ThemeProvider } from "next-themes";
import { Toaster } from "sonner";
import { FreshPages } from "@/components/fresh-pages";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      {children}
      <Toaster richColors position="top-center" />
      <FreshPages />
    </ThemeProvider>
  );
}

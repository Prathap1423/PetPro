import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Providers } from "@/components/providers";

export const metadata: Metadata = {
  title: "My Gold Vault",
  description: "A private digital locker for your gold jewellery collection.",
  robots: { index: false, follow: false },
};
export const viewport: Viewport = { themeColor: "#b8860b", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen font-sans antialiased"><Providers>{children}</Providers></body>
    </html>
  );
}

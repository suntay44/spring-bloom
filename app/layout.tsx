import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",   // FOUT instead of FOIT — text renders immediately with fallback, swaps in Inter when ready
  preload: true,
});

export const metadata: Metadata = {
  title: "SpringBloom",
  description: "A programmer-centric AI app builder with review, security, analytics, and credit-aware agent runs."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning className={`${inter.variable} font-sans`}>
      <body>
        {children}
        <Toaster position="bottom-right" richColors />
      </body>
    </html>
  );
}

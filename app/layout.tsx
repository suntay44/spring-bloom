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
  title: "SpringBloom — Build apps in plain English",
  description: "SpringBloom is an AI-powered app builder. Describe your idea, confirm a brief, and get production-ready web or mobile code — with built-in review, security, and analytics.",
  icons: {
    icon: [{ url: "/logos/SpringBloom-Icon-1x1.png" }],
    apple: "/logos/SpringBloom-Icon-1x1.png",
    shortcut: "/logos/SpringBloom-Icon-1x1.png",
  },
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

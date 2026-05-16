import type { Metadata } from "next";
import { Geist } from "next/font/google";
import { Toaster } from "sonner";
import { MockAuthProvider } from "@/context/MockAuthContext";
import "./globals.css";

const geist = Geist({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  title: "Wild Cupcake",
  description: "A programmer-centric AI app builder with review, security, analytics, and credit-aware agent runs."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning className={`${geist.variable} font-sans`}>
      <body>
        <MockAuthProvider>{children}</MockAuthProvider>
        <Toaster position="bottom-right" richColors />
      </body>
    </html>
  );
}

import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { MockAuthProvider } from "@/context/MockAuthContext";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "Wild Cupcake",
  description: "A programmer-centric AI app builder with review, security, analytics, and credit-aware agent runs."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.variable}>
        <MockAuthProvider>{children}</MockAuthProvider>
      </body>
    </html>
  );
}

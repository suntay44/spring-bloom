import type { Metadata } from "next";
import { Stint_Ultra_Expanded, Pontano_Sans } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";

// Display / heading font — used for h1, h2, h3
const stintUltraExpanded = Stint_Ultra_Expanded({
  weight: "400",          // only weight available for this face
  subsets: ["latin"],
  variable: "--font-stint",
  display: "swap",
  preload: true,
});

// Body / UI font — clean geometric sans-serif
const pontanoSans = Pontano_Sans({
  weight: "400",          // only weight available for this face
  subsets: ["latin"],
  variable: "--font-pontano",
  display: "swap",
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
    <html
      lang="en"
      suppressHydrationWarning
      className={`${stintUltraExpanded.variable} ${pontanoSans.variable}`}
    >
      <body>
        {children}
        <Toaster position="bottom-right" richColors />
      </body>
    </html>
  );
}

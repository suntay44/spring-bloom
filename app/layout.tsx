import type { Metadata } from "next";
import { Space_Grotesk, DM_Sans } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";

// Heading font — modern geometric with personality
const spaceGrotesk = Space_Grotesk({
  weight: ["300", "400", "500", "600", "700"],
  subsets: ["latin"],
  variable: "--font-space",
  display: "swap",
  preload: true,
});

// Body / UI font — clean, highly legible at small sizes
const dmSans = DM_Sans({
  weight: ["300", "400", "500", "600", "700"],
  subsets: ["latin"],
  variable: "--font-dm",
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
      className={`${spaceGrotesk.variable} ${dmSans.variable}`}
    >
      <body>
        {children}
        <Toaster position="bottom-right" richColors />
      </body>
    </html>
  );
}

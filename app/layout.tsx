import type { Metadata, Viewport } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import {
  Cinzel,
  Cormorant_Garamond,
  DM_Sans,
  Figtree,
  JetBrains_Mono,
  Lora,
} from "next/font/google";
import { cookies } from "next/headers";
import "./globals.css";

const lora = Lora({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

const figtree = Figtree({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
});

// Warm Almanac type stack. Loaded at root so every screen can opt in via the
// almanac.* color + font Tailwind utilities. Existing themes still read
// --font-display / --font-body unchanged.
const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  style: ["normal", "italic"],
  variable: "--font-almanac-serif",
  display: "swap",
});

const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-almanac-body",
  display: "swap",
});

const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-almanac-mono",
  display: "swap",
});

const cinzel = Cinzel({
  subsets: ["latin"],
  weight: ["500", "600"],
  variable: "--font-almanac-display",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Kairos — Your 2026 planner, built from your natal chart",
  description:
    "A personalized year-long blueprint built from your real natal chart and the actual planetary transits of your year.",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/icon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: [{ url: "/apple-icon.png", sizes: "180x180", type: "image/png" }],
  },
};

export const viewport: Viewport = {
  themeColor: "#0A0A0E",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const theme = cookieStore.get("kiaros-theme")?.value ?? "obsidian";

  return (
    <ClerkProvider>
      <html
        lang="en"
        data-theme={theme}
        suppressHydrationWarning
        className={`${lora.variable} ${figtree.variable} ${cormorant.variable} ${dmSans.variable} ${jetbrains.variable} ${cinzel.variable}`}
      >
        <head>
          <meta charSet="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
        </head>
        <body className="bg-stone-950 text-bone antialiased">
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}

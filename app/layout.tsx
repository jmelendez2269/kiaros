import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { Lora, Figtree } from "next/font/google";
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

export const metadata: Metadata = {
  title: "Kairos — Your 2026 planner, built from your natal chart",
  description:
    "A personalized year-long blueprint built from your real natal chart and the actual planetary transits of your year.",
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
        className={`${lora.variable} ${figtree.variable}`}
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

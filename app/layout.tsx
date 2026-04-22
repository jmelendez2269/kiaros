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
  title: "Kiaros",
  description:
    "A personalized planning system built around your goals, timing, and natural cycles.",
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

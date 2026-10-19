import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { ImageResponse } from "next/og";

import { BRAND } from "@/lib/brand";
import { MARKETING_OG_IMAGE_SIZE } from "@/lib/marketing/marketing-og-image-size";

export { MARKETING_OG_IMAGE_SIZE };

/** App icon PNG (triangle mark from public/icon.svg). Satori does not render SVG <img> reliably. */
const KAIROS_MARK_ICON_PATH = join(process.cwd(), "public", "icon-192.png");

async function kairosMarkDataUrl(): Promise<string> {
  const bytes = await readFile(KAIROS_MARK_ICON_PATH);
  return `data:image/png;base64,${bytes.toString("base64")}`;
}

async function loadGoogleFont(
  family: string,
  weight: number,
  text: string,
): Promise<ArrayBuffer> {
  const url = `https://fonts.googleapis.com/css2?family=${family}:wght@${weight}&text=${encodeURIComponent(text)}`;
  const css = await (await fetch(url)).text();
  const match = css.match(/src: url\((.+)\) format\('(?:opentype|truetype)'\)/);
  if (!match?.[1]) {
    throw new Error(`Failed to load font data for ${family}`);
  }
  return await (await fetch(match[1])).arrayBuffer();
}

export interface MarketingOgImageContent {
  /** Primary line (display). */
  title: string;
  /** Secondary line under the title. */
  subtitle: string;
  /** Small caps kicker above the title (optional). */
  kicker?: string;
}

export async function renderMarketingOgImage(content: MarketingOgImageContent) {
  const fontText = `${BRAND.product} ${content.title} ${content.subtitle} ${content.kicker ?? ""}`;
  const [displayFont, bodyFont, markSrc] = await Promise.all([
    loadGoogleFont("Cinzel", 600, fontText),
    loadGoogleFont("DM+Sans", 400, fontText),
    kairosMarkDataUrl(),
  ]);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "72px 80px",
          backgroundColor: "#0a0c14",
          backgroundImage:
            "radial-gradient(ellipse 70% 55% at 85% 15%, rgba(112,75,210,0.35), rgba(10,12,20,0)), radial-gradient(ellipse 45% 40% at 8% 90%, rgba(78,231,253,0.12), rgba(10,12,20,0))",
          color: "#e3e2ed",
          fontFamily: "DM Sans",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 40 }}>
          <img src={markSrc} width={56} height={56} alt="" />
          <span
            style={{
              fontFamily: "Cinzel",
              fontSize: 28,
              letterSpacing: "0.12em",
              color: "#c7b3f5",
            }}
          >
            {BRAND.product.toUpperCase()}
          </span>
        </div>
        {content.kicker ? (
          <p
            style={{
              margin: 0,
              marginBottom: 16,
              fontSize: 18,
              letterSpacing: "0.28em",
              textTransform: "uppercase",
              color: "#a98aef",
            }}
          >
            {content.kicker}
          </p>
        ) : null}
        <p
          style={{
            margin: 0,
            fontFamily: "Cinzel",
            fontSize: content.title.length > 48 ? 46 : 56,
            lineHeight: 1.08,
            letterSpacing: "0.02em",
            maxWidth: 980,
          }}
        >
          {content.title}
        </p>
        <p
          style={{
            margin: 0,
            marginTop: 28,
            fontSize: 26,
            lineHeight: 1.45,
            color: "#a4a3b1",
            maxWidth: 920,
          }}
        >
          {content.subtitle}
        </p>
      </div>
    ),
    {
      ...MARKETING_OG_IMAGE_SIZE,
      fonts: [
        { name: "Cinzel", data: displayFont, weight: 600, style: "normal" },
        { name: "DM Sans", data: bodyFont, weight: 400, style: "normal" },
      ],
    },
  );
}

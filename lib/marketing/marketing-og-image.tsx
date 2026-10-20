import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { ImageResponse } from "next/og";

import { BRAND } from "@/lib/brand";
import { MARKETING_OG_IMAGE_SIZE } from "@/lib/marketing/marketing-og-image-size";
import {
  MARKETING_OG_BODY_LINE_HEIGHT,
  MARKETING_OG_HEADLINE_LINE_HEIGHT,
  MARKETING_OG_TEXT_COLUMN_WIDTH,
  pickMarketingOgTypography,
} from "@/lib/marketing/marketing-og-typography";

export { MARKETING_OG_IMAGE_SIZE };

/** App icon PNG (triangle mark from public/icon.svg). Satori does not render SVG <img> reliably. */
const KAIROS_MARK_ICON_PATH = join(process.cwd(), "public", "icon-192.png");

/** Centred square crop safe zone (e.g. iMessage / WhatsApp previews). */
const SAFE_ZONE_LEFT = 285;

const PAGE_MARGIN = 120;
const MARK_SIZE = 88;
const BLOCK_GAP = 16;

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

  const typography = pickMarketingOgTypography({
    title: content.title,
    subtitle: content.subtitle,
    hasKicker: Boolean(content.kicker),
  });

  const headlineLetterSpacingPx = typography.headlineFontSize * 0.02;

  const contentHeight = MARKETING_OG_IMAGE_SIZE.height - PAGE_MARGIN * 2;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          position: "relative",
          display: "flex",
          flexDirection: "row",
          backgroundColor: "#0a0c14",
          backgroundImage:
            "radial-gradient(ellipse 70% 55% at 85% 15%, rgba(112,75,210,0.35), rgba(10,12,20,0)), radial-gradient(ellipse 45% 40% at 8% 90%, rgba(78,231,253,0.12), rgba(10,12,20,0))",
          color: "#e3e2ed",
          fontFamily: "DM Sans",
        }}
      >
        {/* Decorative accent — outside centred text safe zone */}
        <div
          style={{
            position: "absolute",
            right: 48,
            top: 72,
            width: 0,
            height: 0,
            borderLeft: "220px solid transparent",
            borderBottom: "380px solid rgba(112, 75, 210, 0.12)",
          }}
        />

        <div
          style={{
            position: "absolute",
            left: SAFE_ZONE_LEFT,
            top: PAGE_MARGIN,
            width: MARKETING_OG_TEXT_COLUMN_WIDTH,
            height: contentHeight,
            display: "flex",
            flexDirection: "column",
            gap: BLOCK_GAP,
          }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "row",
              alignItems: "center",
              gap: 16,
              flexShrink: 0,
            }}
          >
            <img src={markSrc} width={MARK_SIZE} height={MARK_SIZE} alt="" />
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
                flexShrink: 0,
                fontSize: 18,
                letterSpacing: "0.28em",
                textTransform: "uppercase",
                color: "#c7b3f5",
              }}
            >
              {content.kicker}
            </p>
          ) : null}

          <p
            style={{
              margin: 0,
              flexShrink: 0,
              fontFamily: "Cinzel",
              fontSize: typography.headlineFontSize,
              lineHeight: MARKETING_OG_HEADLINE_LINE_HEIGHT,
              letterSpacing: `${headlineLetterSpacingPx}px`,
              display: "block",
              width: "100%",
            }}
          >
            {content.title}
          </p>
          <p
            style={{
              margin: 0,
              flexShrink: 0,
              fontSize: typography.bodyFontSize,
              lineHeight: MARKETING_OG_BODY_LINE_HEIGHT,
              color: "rgba(227, 226, 237, 0.8)",
              display: "block",
              width: "100%",
            }}
          >
            {content.subtitle}
          </p>
        </div>
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

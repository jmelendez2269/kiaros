import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { ImageResponse } from "next/og";

import { BRAND } from "@/lib/brand";
import { MARKETING_OG_IMAGE_SIZE } from "@/lib/marketing/marketing-og-image-size";
import { ogTwoLineBlockStyle, pickOgFontSizeForTwoLines } from "@/lib/marketing/og-text-fit";

export { MARKETING_OG_IMAGE_SIZE };

/** App icon PNG (triangle mark from public/icon.svg). Satori does not render SVG <img> reliably. */
const KAIROS_MARK_ICON_PATH = join(process.cwd(), "public", "icon-192.png");

/** Centred square crop safe zone (e.g. iMessage / WhatsApp previews). */
const SAFE_ZONE_LEFT = 285;
const SAFE_ZONE_WIDTH = 630;

const PAGE_MARGIN = 120;
const MARK_SIZE = 88;
const HEADLINE_LINE_HEIGHT = 1.12;
const BODY_LINE_HEIGHT = 1.4;
const BLOCK_GAP = 16;

const HEADLINE_SIZES = [44, 40, 36] as const;
const BODY_SIZES = [30, 28, 26, 24, 22] as const;

const CINZEL_OG_FAMILY = "KiarosOgCinzel";
const DM_SANS_OG_FAMILY = "KiarosOgDmSans";

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

  const [headlineFontSize, bodyFontSize] = await Promise.all([
    pickOgFontSizeForTwoLines({
      fontData: displayFont,
      fontFamily: CINZEL_OG_FAMILY,
      fontWeight: 600,
      sizes: HEADLINE_SIZES,
      text: content.title,
      maxWidth: SAFE_ZONE_WIDTH,
      letterSpacingEm: 0.02,
    }),
    pickOgFontSizeForTwoLines({
      fontData: bodyFont,
      fontFamily: DM_SANS_OG_FAMILY,
      fontWeight: 400,
      sizes: BODY_SIZES,
      text: content.subtitle,
      maxWidth: SAFE_ZONE_WIDTH,
    }),
  ]);

  const headlineLetterSpacingPx = headlineFontSize * 0.02;

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
            width: SAFE_ZONE_WIDTH,
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
              fontSize: headlineFontSize,
              lineHeight: HEADLINE_LINE_HEIGHT,
              letterSpacing: `${headlineLetterSpacingPx}px`,
              ...ogTwoLineBlockStyle(headlineFontSize, HEADLINE_LINE_HEIGHT),
            }}
          >
            {content.title}
          </p>
          <p
            style={{
              margin: 0,
              flexShrink: 0,
              fontSize: bodyFontSize,
              lineHeight: BODY_LINE_HEIGHT,
              color: "rgba(227, 226, 237, 0.8)",
              ...ogTwoLineBlockStyle(bodyFontSize, BODY_LINE_HEIGHT),
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

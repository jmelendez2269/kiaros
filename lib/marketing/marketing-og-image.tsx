import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { ImageResponse } from "next/og";

import { BRAND } from "@/lib/brand";
import { MARKETING_OG_IMAGE_SIZE } from "@/lib/marketing/marketing-og-image-size";

export { MARKETING_OG_IMAGE_SIZE };

/** App icon PNG (triangle mark from public/icon.svg). Satori does not render SVG <img> reliably. */
const KAIROS_MARK_ICON_PATH = join(process.cwd(), "public", "icon-192.png");

/** Centred square crop safe zone (e.g. iMessage / WhatsApp previews). */
const SAFE_ZONE_LEFT = 285;
const SAFE_ZONE_WIDTH = 630;

const LOGO_ROW_TOP = 120;
const HEADLINE_TOP = 228;
const KICKER_TOP = 188;
/** Fixed body start so subtitle baseline matches across home, pricing, and field notes. */
const BODY_TOP = 372;

const MARK_OUTER = 88;
const MARK_INNER = 72;

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

  const titleFontSize = content.title.length > 48 ? 46 : 56;

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
            top: 0,
            width: SAFE_ZONE_WIDTH,
            height: "100%",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <div
            style={{
              position: "absolute",
              top: LOGO_ROW_TOP,
              left: 0,
              display: "flex",
              alignItems: "center",
              gap: 16,
            }}
          >
            <div
              style={{
                width: MARK_OUTER,
                height: MARK_OUTER,
                display: "flex",
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                borderRadius: 14,
                border: "1px solid rgba(199, 179, 245, 0.28)",
                backgroundColor: "rgba(112, 75, 210, 0.18)",
              }}
            >
              <img src={markSrc} width={MARK_INNER} height={MARK_INNER} alt="" />
            </div>
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
                position: "absolute",
                top: KICKER_TOP,
                left: 0,
                margin: 0,
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
              position: "absolute",
              top: HEADLINE_TOP,
              left: 0,
              margin: 0,
              fontFamily: "Cinzel",
              fontSize: titleFontSize,
              lineHeight: 1.08,
              letterSpacing: "0.02em",
              maxWidth: SAFE_ZONE_WIDTH,
            }}
          >
            {content.title}
          </p>
          <p
            style={{
              position: "absolute",
              top: BODY_TOP,
              left: 0,
              margin: 0,
              fontSize: 30,
              lineHeight: 1.45,
              color: "rgba(227, 226, 237, 0.8)",
              maxWidth: SAFE_ZONE_WIDTH,
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

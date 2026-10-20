import { createCanvas, GlobalFonts, loadImage } from "@napi-rs/canvas";
import { createHash } from "node:crypto";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { ImageResponse } from "next/og";

const registeredFontKeys = new Set<string>();

async function registerFontFromBuffer(data: ArrayBuffer, family: string): Promise<void> {
  const key = createHash("sha256").update(Buffer.from(data)).digest("hex");
  if (registeredFontKeys.has(key)) {
    return;
  }
  const dir = await mkdtemp(join(tmpdir(), "kiaros-og-font-"));
  const fontPath = join(dir, `${family}.ttf`);
  await writeFile(fontPath, Buffer.from(data));
  GlobalFonts.registerFromPath(fontPath, family);
  registeredFontKeys.add(key);
}

function isLikelyTextPixel(r: number, g: number, b: number, a: number): boolean {
  if (a < 20) {
    return false;
  }
  if (r < 30 && g < 32 && b < 40) {
    return false;
  }
  if (r > 100 && g > 70 && b > 180 && a < 120) {
    return false;
  }
  return r + g + b > 280;
}

/** Count horizontal text bands in a Satori PNG (one band ≈ one line). */
async function countLinesInPng(png: Buffer, width: number): Promise<number> {
  const img = await loadImage(png);
  const canvas = createCanvas(img.width, img.height);
  const ctx = canvas.getContext("2d");
  ctx.drawImage(img, 0, 0);
  const { data } = ctx.getImageData(0, 0, img.width, img.height);

  let lines = 0;
  let inLine = false;
  for (let y = 0; y < img.height; y++) {
    let rowPixels = 0;
    for (let x = 0; x < width; x++) {
      const i = (y * img.width + x) * 4;
      if (isLikelyTextPixel(data[i], data[i + 1], data[i + 2], data[i + 3])) {
        rowPixels += 1;
      }
    }
    const hasLine = rowPixels > 40;
    if (hasLine && !inLine) {
      lines += 1;
      inLine = true;
    } else if (!hasLine) {
      inLine = false;
    }
  }
  return lines;
}

async function countSatoriRenderedLines(options: {
  text: string;
  fontSize: number;
  lineHeight: number;
  letterSpacingPx: number;
  satoriFontFamily: string;
  fontData: ArrayBuffer;
  fontWeight: 400 | 600;
  layoutWidth: number;
}): Promise<number> {
  const paragraphStyle: Record<string, string | number> = {
    margin: 0,
    display: "block",
    width: "100%",
    fontFamily: options.satoriFontFamily,
    fontSize: options.fontSize,
    lineHeight: options.lineHeight,
  };
  if (options.letterSpacingPx > 0) {
    paragraphStyle.letterSpacing = `${options.letterSpacingPx}px`;
  }

  const response = new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          width: options.layoutWidth,
        }}
      >
        <p style={paragraphStyle}>{options.text}</p>
      </div>
    ),
    {
      width: options.layoutWidth,
      height: Math.ceil(options.fontSize * options.lineHeight * 5) + 48,
      fonts: [
        {
          name: options.satoriFontFamily,
          data: options.fontData,
          weight: options.fontWeight,
          style: "normal",
        },
      ],
    },
  );

  const png = Buffer.from(await response.arrayBuffer());
  return countLinesInPng(png, options.layoutWidth);
}

export interface OgFontFitOptions {
  fontData: ArrayBuffer;
  satoriFontFamily: string;
  fontWeight: 400 | 600;
  sizes: readonly number[];
  text: string;
  layoutWidth: number;
  lineHeight: number;
  letterSpacingEm?: number;
  minFontSize: number;
  allowThirdLineAtFloor?: boolean;
  logLabel?: string;
}

export interface OgFontFitResult {
  fontSize: number;
  lineCount: number;
}

export async function fitOgTextBlock(options: OgFontFitOptions): Promise<OgFontFitResult> {
  const {
    fontData,
    satoriFontFamily,
    fontWeight,
    sizes,
    text,
    layoutWidth,
    lineHeight,
    letterSpacingEm = 0,
    minFontSize,
    allowThirdLineAtFloor = false,
    logLabel = "og-text",
  } = options;

  await registerFontFromBuffer(fontData, `Probe${satoriFontFamily}`);

  const descending = [...sizes].sort((a, b) => b - a);
  const floor = descending.filter((s) => s >= minFontSize).at(-1) ?? minFontSize;

  const measureAt = async (fontSize: number) =>
    countSatoriRenderedLines({
      text,
      fontSize,
      lineHeight,
      letterSpacingPx: letterSpacingEm > 0 ? fontSize * letterSpacingEm : 0,
      satoriFontFamily,
      fontData,
      fontWeight,
      layoutWidth,
    });

  for (const fontSize of descending) {
    const lines = await measureAt(fontSize);
    if (lines <= 2) {
      return { fontSize, lineCount: lines };
    }
  }

  const linesAtFloor = await measureAt(floor);

  if (linesAtFloor <= 2) {
    return { fontSize: floor, lineCount: linesAtFloor };
  }

  if (allowThirdLineAtFloor) {
    console.warn(
      `[marketing-og] ${logLabel}: using ${linesAtFloor} lines at ${floor}px (floor); full copy preserved`,
    );
    return { fontSize: floor, lineCount: linesAtFloor };
  }

  console.warn(
    `[marketing-og] ${logLabel}: ${linesAtFloor} lines at ${floor}px floor; full copy preserved`,
  );
  return { fontSize: floor, lineCount: linesAtFloor };
}

export function ogTextBlockStyle() {
  return {
    display: "block" as const,
    width: "100%",
  };
}

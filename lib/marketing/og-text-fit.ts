import { createCanvas, GlobalFonts } from "@napi-rs/canvas";
import { createHash } from "node:crypto";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

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

function lineCountAtWidth(
  text: string,
  maxWidth: number,
  measure: (line: string) => number,
): number {
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) {
    return 0;
  }

  let lines = 1;
  let current = words[0] ?? "";
  for (let i = 1; i < words.length; i++) {
    const word = words[i];
    const candidate = `${current} ${word}`;
    if (measure(candidate) > maxWidth && current) {
      lines += 1;
      current = word;
    } else {
      current = candidate;
    }
  }
  return lines;
}

export interface OgFontFitOptions {
  fontData: ArrayBuffer;
  fontFamily: string;
  fontWeight: number;
  sizes: readonly number[];
  text: string;
  maxWidth: number;
  /** Added to measured width: `(fontSize * em) * (graphemes - 1)` when > 0. */
  letterSpacingEm?: number;
}

/** Largest font size (from `sizes`) that wraps to at most two lines at `maxWidth`. */
export async function pickOgFontSizeForTwoLines(options: OgFontFitOptions): Promise<number> {
  const { fontData, fontFamily, fontWeight, sizes, text, maxWidth, letterSpacingEm = 0 } =
    options;

  await registerFontFromBuffer(fontData, fontFamily);

  const canvas = createCanvas(1, 1);
  const ctx = canvas.getContext("2d");

  const sorted = [...sizes].sort((a, b) => b - a);
  for (const fontSize of sorted) {
    const letterSpacingPx = letterSpacingEm > 0 ? fontSize * letterSpacingEm : 0;
    const measureLine = (line: string) => {
      ctx.font = `${fontWeight} ${fontSize}px ${fontFamily}`;
      const width = ctx.measureText(line).width;
      const spacing =
        letterSpacingPx > 0 && line.length > 1 ? letterSpacingPx * (line.length - 1) : 0;
      return width + spacing;
    };
    if (lineCountAtWidth(text, maxWidth, measureLine) <= 2) {
      return fontSize;
    }
  }

  return sorted[sorted.length - 1]!;
}

/** Satori-supported two-line clamp (not -webkit-line-clamp). */
export function ogTwoLineBlockStyle(fontSize: number, lineHeight: number) {
  const maxHeight = Math.ceil(fontSize * lineHeight * 2);
  return {
    display: "block" as const,
    lineClamp: 2,
    overflow: "hidden" as const,
    maxHeight,
    width: "100%",
  };
}

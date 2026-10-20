/**
 * Deterministic OG typography (no Satori probe renders).
 * Char-width ratios calibrated against local `next build` prerender PNGs at
 * MARKETING_OG_TEXT_COLUMN_WIDTH.
 */

export const MARKETING_OG_TEXT_COLUMN_WIDTH = 630;

export const MARKETING_OG_CONTENT_TOP = 120;
export const MARKETING_OG_CONTENT_BOTTOM = 510;
export const MARKETING_OG_MAX_STACK_HEIGHT =
  MARKETING_OG_CONTENT_BOTTOM - MARKETING_OG_CONTENT_TOP;

export const MARKETING_OG_HEADLINE_LINE_HEIGHT = 1.12;
export const MARKETING_OG_BODY_LINE_HEIGHT = 1.4;

export const MARKETING_OG_HEADLINE_MAX_LINES = 2;
export const MARKETING_OG_BODY_MAX_LINES = 3;

/**
 * Cinzel 600 — conservative vs Satori wraps at 630px column width.
 * Tuned via `npm run build` + `npx tsx scripts/measure-marketing-og-prerender.mts`.
 */
const CINZEL_CHAR_WIDTH_RATIO = 0.67;
const CINZEL_LETTER_SPACING_EM = 0.02;

/** DM Sans 400 */
const DM_SANS_CHAR_WIDTH_RATIO = 0.56;

const HEADLINE_FONT_SIZES = [44, 40, 36, 32, 28] as const;
const BODY_FONT_SIZES = [28, 26, 24, 22] as const;

const MARK_ROW_HEIGHT = 88;
const BLOCK_GAP = 16;
const KICKER_BLOCK_HEIGHT = 22;

export interface MarketingOgTypographyInput {
  title: string;
  subtitle: string;
  hasKicker: boolean;
}

export interface MarketingOgTypographyResult {
  headlineFontSize: number;
  bodyFontSize: number;
  headlineLines: number;
  bodyLines: number;
  stackHeight: number;
}

function wordWidth(
  word: string,
  fontSize: number,
  charWidthRatio: number,
  letterSpacingEm = 0,
): number {
  if (word.length === 0) {
    return 0;
  }
  const base = word.length * fontSize * charWidthRatio;
  const spacing =
    letterSpacingEm > 0 && word.length > 1 ? (word.length - 1) * fontSize * letterSpacingEm : 0;
  return base + spacing;
}

/** Greedy word wrap — matches Satori closely when ratios are calibrated. */
export function estimateWrappedLineCount(
  text: string,
  columnWidth: number,
  fontSize: number,
  charWidthRatio: number,
  letterSpacingEm = 0,
): number {
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) {
    return 0;
  }

  const spaceWidth = fontSize * charWidthRatio * 0.35;
  let lines = 1;
  let lineWidth = 0;

  for (const word of words) {
    const w = wordWidth(word, fontSize, charWidthRatio, letterSpacingEm);
    const add = lineWidth === 0 ? w : spaceWidth + w;
    if (lineWidth > 0 && lineWidth + add > columnWidth) {
      lines += 1;
      lineWidth = w;
    } else {
      lineWidth = lineWidth === 0 ? w : lineWidth + add;
    }
  }

  return lines;
}

export function estimateMarketingOgStackHeight(options: {
  hasKicker: boolean;
  headlineLines: number;
  headlineFontSize: number;
  bodyLines: number;
  bodyFontSize: number;
}): number {
  let height = MARK_ROW_HEIGHT + BLOCK_GAP;
  if (options.hasKicker) {
    height += KICKER_BLOCK_HEIGHT + BLOCK_GAP;
  }
  height +=
    options.headlineLines * options.headlineFontSize * MARKETING_OG_HEADLINE_LINE_HEIGHT +
    BLOCK_GAP;
  height += options.bodyLines * options.bodyFontSize * MARKETING_OG_BODY_LINE_HEIGHT;
  return height;
}

export function pickMarketingOgTypography(
  input: MarketingOgTypographyInput,
): MarketingOgTypographyResult {
  const columnWidth = MARKETING_OG_TEXT_COLUMN_WIDTH;

  let best: MarketingOgTypographyResult | null = null;

  for (const bodyFontSize of BODY_FONT_SIZES) {
    const bodyLines = estimateWrappedLineCount(
      input.subtitle,
      columnWidth,
      bodyFontSize,
      DM_SANS_CHAR_WIDTH_RATIO,
    );
    if (bodyLines > MARKETING_OG_BODY_MAX_LINES) {
      continue;
    }

    for (const headlineFontSize of HEADLINE_FONT_SIZES) {
      const headlineLines = estimateWrappedLineCount(
        input.title,
        columnWidth,
        headlineFontSize,
        CINZEL_CHAR_WIDTH_RATIO,
        CINZEL_LETTER_SPACING_EM,
      );
      if (headlineLines > MARKETING_OG_HEADLINE_MAX_LINES) {
        continue;
      }

      const stackHeight = estimateMarketingOgStackHeight({
        hasKicker: input.hasKicker,
        headlineLines,
        headlineFontSize,
        bodyLines,
        bodyFontSize,
      });

      if (stackHeight > MARKETING_OG_MAX_STACK_HEIGHT) {
        continue;
      }

      const candidate: MarketingOgTypographyResult = {
        headlineFontSize,
        bodyFontSize,
        headlineLines,
        bodyLines,
        stackHeight,
      };

      if (
        !best ||
        candidate.headlineFontSize > best.headlineFontSize ||
        (candidate.headlineFontSize === best.headlineFontSize &&
          candidate.bodyFontSize > best.bodyFontSize)
      ) {
        best = candidate;
      }
    }
  }

  if (best) {
    return best;
  }

  const headlineFontSize = HEADLINE_FONT_SIZES[HEADLINE_FONT_SIZES.length - 1];
  const bodyFontSize = BODY_FONT_SIZES[BODY_FONT_SIZES.length - 1];
  const headlineLines = estimateWrappedLineCount(
    input.title,
    columnWidth,
    headlineFontSize,
    CINZEL_CHAR_WIDTH_RATIO,
    CINZEL_LETTER_SPACING_EM,
  );
  const bodyLines = estimateWrappedLineCount(
    input.subtitle,
    columnWidth,
    bodyFontSize,
    DM_SANS_CHAR_WIDTH_RATIO,
  );

  console.warn(
    `[marketing-og] typography: no size pair fit stack budget; using ${headlineFontSize}/${bodyFontSize}px (headline ${headlineLines} lines, body ${bodyLines} lines)`,
  );

  return {
    headlineFontSize,
    bodyFontSize,
    headlineLines,
    bodyLines,
    stackHeight: estimateMarketingOgStackHeight({
      hasKicker: input.hasKicker,
      headlineLines,
      headlineFontSize,
      bodyLines,
      bodyFontSize,
    }),
  };
}

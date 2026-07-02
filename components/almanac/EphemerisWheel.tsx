import { K, GLYPH, type AspectKind, type GlyphKey } from "./tokens";

type PlanetMap = Partial<Record<GlyphKey, number>>;

interface Aspect {
  a: number;
  b: number;
  kind: AspectKind;
}

interface Props {
  size?: number;
  /** Natal positions, in degrees 0–360 from 0° Aries, keyed by planet name. */
  natal?: PlanetMap | null;
  /** Transit positions, same shape as natal. */
  transit?: PlanetMap | null;
  /** Aspect chords drawn across the inner ring. */
  aspects?: Aspect[];
  showHouses?: boolean;
}

// DM Sans (K.fBody) doesn't cover the zodiac-sign Unicode block (U+2648–2653)
// as completely as the planet glyphs just below it, so those ticks render as
// fallback tofu boxes without a symbol font in the stack.
const SYMBOL_FONT_STACK = `${K.fBody}, "Segoe UI Symbol", "Noto Sans Symbols 2", sans-serif`;

const SIGNS: GlyphKey[] = [
  "aries",
  "taurus",
  "gemini",
  "cancer",
  "leo",
  "virgo",
  "libra",
  "scorpio",
  "sagittarius",
  "capricorn",
  "aquarius",
  "pisces",
];

export function EphemerisWheel({
  size = 320,
  natal = null,
  transit = null,
  aspects = [],
  showHouses = true,
}: Props) {
  const cx = size / 2;
  const cy = size / 2;
  const rOuter = size * 0.48;
  const rZodiac = size * 0.42;
  const rTransit = size * 0.34;
  const rNatal = size * 0.26;
  const rInner = size * 0.18;

  // Astrological degree → SVG (cx, cy). 0° Aries at 9 o'clock, counterclockwise.
  const toXY = (deg: number, r: number): [number, number] => {
    const a = ((180 - deg) * Math.PI) / 180;
    return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
  };

  const aspectColor = (kind: AspectKind): string => {
    if (kind === "trine" || kind === "sextile") return K.sage;
    if (kind === "opposition" || kind === "square") return K.brickHi;
    return K.copperHi;
  };

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ display: "block" }}>
      {/* concentric rings */}
      <circle cx={cx} cy={cy} r={rOuter} fill="none" stroke={K.lineHi} strokeWidth="0.5" />
      <circle cx={cx} cy={cy} r={rZodiac} fill="none" stroke={K.line} strokeWidth="0.5" />
      <circle
        cx={cx}
        cy={cy}
        r={rTransit}
        fill="none"
        stroke={K.line}
        strokeWidth="0.4"
        strokeDasharray="2 3"
      />
      <circle cx={cx} cy={cy} r={rNatal} fill="none" stroke={K.line} strokeWidth="0.5" />
      <circle cx={cx} cy={cy} r={rInner} fill={K.bg2} stroke={K.line} strokeWidth="0.5" />

      {/* 12 sign divisions */}
      {SIGNS.map((sign, i) => {
        const deg = i * 30;
        const [x1, y1] = toXY(deg, rInner);
        const [x2, y2] = toXY(deg, rOuter);
        const [tx, ty] = toXY(deg + 15, (rOuter + rZodiac) / 2);
        return (
          <g key={sign}>
            <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={K.line} strokeWidth="0.5" />
            <text
              x={tx}
              y={ty + 4}
              textAnchor="middle"
              fontSize={size * 0.04}
              fill={K.copperHi}
              fontFamily={SYMBOL_FONT_STACK}
            >
              {GLYPH[sign]}
            </text>
          </g>
        );
      })}

      {/* house ticks just outside inner ring */}
      {showHouses
        ? Array.from({ length: 12 }).map((_, i) => {
            const deg = i * 30 + 5;
            const [x1, y1] = toXY(deg, rInner);
            const [x2, y2] = toXY(deg, rInner + 6);
            return (
              <line
                key={i}
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke={K.copper}
                strokeWidth="0.5"
                opacity="0.6"
              />
            );
          })
        : null}

      {/* aspect chords */}
      {aspects.map((asp, i) => {
        const [x1, y1] = toXY(asp.a, rNatal - 2);
        const [x2, y2] = toXY(asp.b, rNatal - 2);
        return (
          <line
            key={i}
            x1={x1}
            y1={y1}
            x2={x2}
            y2={y2}
            stroke={aspectColor(asp.kind)}
            strokeWidth="0.6"
            opacity="0.65"
          />
        );
      })}

      {/* natal planets on inner ring */}
      {natal
        ? (Object.entries(natal) as [GlyphKey, number][]).map(([planet, deg]) => {
            const [x, y] = toXY(deg, rNatal + 4);
            return (
              <g key={planet}>
                <circle cx={x} cy={y} r={size * 0.025} fill={K.bg} stroke={K.copperHi} strokeWidth="0.8" />
                <text
                  x={x}
                  y={y + 3}
                  textAnchor="middle"
                  fontSize={size * 0.035}
                  fill={K.copperHi}
                  fontFamily={SYMBOL_FONT_STACK}
                >
                  {GLYPH[planet] ?? "·"}
                </text>
              </g>
            );
          })
        : null}

      {/* transit planets on outer ring */}
      {transit
        ? (Object.entries(transit) as [GlyphKey, number][]).map(([planet, deg]) => {
            const [x, y] = toXY(deg, rTransit + 4);
            return (
              <g key={planet}>
                <circle
                  cx={x}
                  cy={y}
                  r={size * 0.022}
                  fill={K.bg}
                  stroke={K.starlight}
                  strokeWidth="0.6"
                />
                <text
                  x={x}
                  y={y + 3}
                  textAnchor="middle"
                  fontSize={size * 0.032}
                  fill={K.starlight}
                  fontFamily={SYMBOL_FONT_STACK}
                >
                  {GLYPH[planet] ?? "·"}
                </text>
              </g>
            );
          })
        : null}

      {/* center mark */}
      <circle cx={cx} cy={cy} r="1.4" fill={K.copperHi} />
    </svg>
  );
}

export type { Aspect, PlanetMap };

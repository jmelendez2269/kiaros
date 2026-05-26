(function(){
// Kairos — Warm Almanac design tokens, glyphs, helpers

const K = {
  // ── palette ────────────────────────────────────────────────────
  bg:       '#15100c',  // deep cocoa
  bg2:      '#1f1814',  // umber
  bg3:      '#2a2018',  // raised umber
  bg4:      '#372a20',  // even more raised
  line:     'rgba(244, 232, 212, 0.10)',
  lineHi:   'rgba(244, 232, 212, 0.18)',
  ink:      '#f4e8d4',  // parchment
  inkDim:   '#c7b69a',
  inkSoft:  '#8b7a60',
  inkFaint: 'rgba(244, 232, 212, 0.4)',
  // accents (Warm Almanac)
  brick:    '#7c2d2d',
  brickHi:  '#a04040',
  copper:   '#c9854c',
  copperHi: '#e0a05c',
  ember:    '#d97c5e',
  sage:     '#7a8a6e',
  plum:     '#6b3d6e',
  midnight: '#1a2240',
  starlight:'#a9b4d8',
  // ── Brand accents (Project Parallax · sprinkled throughout) ────
  kairos:   '#9966FF',  // Kairos · brand violet
  kairosHi: '#B58FFF',  // lighter violet
  kairosLo: '#6B3FCC',  // deeper plum-violet
  prism:    '#4EE7FD',  // for Stelloquy listening orb
  chronos:  '#FF9B2B',  // for Stelloquy thinking orb
  // fonts
  fSerif:   '"Cormorant Garamond", "EB Garamond", Georgia, serif',
  fBody:    '"DM Sans", ui-sans-serif, system-ui, sans-serif',
  fMono:    '"JetBrains Mono", "IBM Plex Mono", ui-monospace, monospace',
  fDisplay: '"Cinzel", "Trajan Pro", serif',  // brand display (sparingly)
};

// Unicode glyphs — astrological
const GLYPH = {
  sun: '☉', moon: '☽', mercury: '☿', venus: '♀', mars: '♂',
  jupiter: '♃', saturn: '♄', uranus: '♅', neptune: '♆', pluto: '♇',
  northNode: '☊', southNode: '☋', chiron: '⚷',
  aries: '♈', taurus: '♉', gemini: '♊', cancer: '♋', leo: '♌',
  virgo: '♍', libra: '♎', scorpio: '♏', sagittarius: '♐',
  capricorn: '♑', aquarius: '♒', pisces: '♓',
  conjunction: '☌', opposition: '☍', square: '□', trine: '△', sextile: '⚹',
};

// ── moon phase glyph (filled SVG circle, no slop) ───────────────
function MoonGlyph({ phase = 0.5, size = 18, color = K.copperHi }) {
  // phase 0 = new (black), 0.5 = full (light), 1 = new again
  // We draw two stacked half-circles by clipping.
  const r = size / 2;
  const illum = Math.max(0, Math.min(1, phase));
  // Ellipse x-radius for terminator
  const tx = Math.abs(0.5 - illum) * 2 * r;
  const waxing = illum < 0.5;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ display: 'inline-block', verticalAlign: 'middle' }}>
      <circle cx={r} cy={r} r={r - 0.5} fill={K.bg} stroke={color} strokeWidth="1" />
      {illum > 0.02 && (
        <>
          {/* lit side */}
          <path
            d={
              illum < 0.5
                ? `M ${r},${0.5} A ${r - 0.5},${r - 0.5} 0 0 1 ${r},${size - 0.5} A ${tx},${r - 0.5} 0 0 0 ${r},${0.5} Z`
                : `M ${r},${0.5} A ${r - 0.5},${r - 0.5} 0 0 1 ${r},${size - 0.5} A ${tx},${r - 0.5} 0 0 1 ${r},${0.5} Z`
            }
            fill={color}
          />
          {/* mirror for left side if waning > 0.5 */}
          {illum > 0.5 && (
            <path
              d={`M ${r},${0.5} A ${r - 0.5},${r - 0.5} 0 0 0 ${r},${size - 0.5} A ${tx},${r - 0.5} 0 0 1 ${r},${0.5} Z`}
              fill={color}
            />
          )}
        </>
      )}
    </svg>
  );
}

// ── star scatter (random but deterministic via seed) ────────────
function seeded(n) { let s = n; return () => { s = (s * 9301 + 49297) % 233280; return s / 233280; }; }

function StarField({ count = 36, seed = 7, opacity = 0.7 }) {
  const r = seeded(seed);
  const stars = Array.from({ length: count }, (_, i) => ({
    x: r() * 100, y: r() * 100, s: r() * 1.6 + 0.4, o: 0.3 + r() * 0.7,
  }));
  return (
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity, pointerEvents: 'none' }}>
      {stars.map((st, i) => (
        <circle key={i} cx={st.x} cy={st.y} r={st.s * 0.18} fill={K.ink} opacity={st.o} />
      ))}
    </svg>
  );
}

// ── ephemeris wheel — concentric circles + radial ticks + glyphs ─
function EphemerisWheel({
  size = 320,
  natal = null,    // { sun: deg, moon: deg, ... }
  transit = null,  // same shape
  aspects = [],    // [{a: deg, b: deg, kind: 'trine'|'square'|...}]
  showHouses = true,
}) {
  const cx = size / 2, cy = size / 2;
  const rOuter = size * 0.48;
  const rZodiac = size * 0.42;
  const rTransit = size * 0.34;
  const rNatal = size * 0.26;
  const rInner = size * 0.18;

  const SIGNS = ['aries','taurus','gemini','cancer','leo','virgo','libra','scorpio','sagittarius','capricorn','aquarius','pisces'];

  // Convert astrological degree → SVG angle. 0° Aries at left (9 o'clock), counterclockwise.
  const toXY = (deg, r) => {
    const a = (180 - deg) * Math.PI / 180;
    return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
  };

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ display: 'block' }}>
      {/* rings */}
      <circle cx={cx} cy={cy} r={rOuter} fill="none" stroke={K.lineHi} strokeWidth="0.5" />
      <circle cx={cx} cy={cy} r={rZodiac} fill="none" stroke={K.line} strokeWidth="0.5" />
      <circle cx={cx} cy={cy} r={rTransit} fill="none" stroke={K.line} strokeWidth="0.4" strokeDasharray="2 3" />
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
            <text x={tx} y={ty + 4} textAnchor="middle" fontSize={size * 0.04} fill={K.copperHi} fontFamily={K.fBody}>
              {GLYPH[sign]}
            </text>
          </g>
        );
      })}

      {/* houses (12 small ticks just outside inner ring) */}
      {showHouses && Array.from({ length: 12 }).map((_, i) => {
        const deg = i * 30 + 5;
        const [x1, y1] = toXY(deg, rInner);
        const [x2, y2] = toXY(deg, rInner + 6);
        return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke={K.copper} strokeWidth="0.5" opacity="0.6" />;
      })}

      {/* aspects (chords) */}
      {aspects.map((asp, i) => {
        const [x1, y1] = toXY(asp.a, rNatal - 2);
        const [x2, y2] = toXY(asp.b, rNatal - 2);
        const color = asp.kind === 'trine' || asp.kind === 'sextile' ? K.sage : asp.kind === 'opposition' || asp.kind === 'square' ? K.brickHi : K.copperHi;
        return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke={color} strokeWidth="0.6" opacity="0.65" />;
      })}

      {/* natal planets (inner ring) */}
      {natal && Object.entries(natal).map(([planet, deg]) => {
        const [x, y] = toXY(deg, rNatal + 4);
        return (
          <g key={planet}>
            <circle cx={x} cy={y} r={size * 0.025} fill={K.bg} stroke={K.copperHi} strokeWidth="0.8" />
            <text x={x} y={y + 3} textAnchor="middle" fontSize={size * 0.035} fill={K.copperHi} fontFamily={K.fBody}>{GLYPH[planet] || '·'}</text>
          </g>
        );
      })}

      {/* transit planets (outer ring) */}
      {transit && Object.entries(transit).map(([planet, deg]) => {
        const [x, y] = toXY(deg, rTransit + 4);
        return (
          <g key={planet}>
            <circle cx={x} cy={y} r={size * 0.022} fill={K.bg} stroke={K.starlight} strokeWidth="0.6" />
            <text x={x} y={y + 3} textAnchor="middle" fontSize={size * 0.032} fill={K.starlight} fontFamily={K.fBody}>{GLYPH[planet] || '·'}</text>
          </g>
        );
      })}

      {/* center mark */}
      <circle cx={cx} cy={cy} r="1.4" fill={K.copperHi} />
    </svg>
  );
}

// ── reusable bits ───────────────────────────────────────────────
function Kicker({ children, color = K.copperHi }) {
  return (
    <div style={{
      fontFamily: K.fMono, fontSize: 10, letterSpacing: '0.22em', textTransform: 'uppercase',
      color, opacity: 0.85,
    }}>{children}</div>
  );
}

function Stat({ label, value, mono = true }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <div style={{ fontFamily: K.fMono, fontSize: 9, letterSpacing: '0.18em', textTransform: 'uppercase', color: K.inkSoft }}>{label}</div>
      <div style={{ fontFamily: mono ? K.fMono : K.fSerif, fontSize: mono ? 13 : 18, color: K.ink, fontWeight: mono ? 500 : 400 }}>{value}</div>
    </div>
  );
}

function Seal({ children, color = K.copper, size = 28 }) {
  // A small etched circular seal — used for nav items, dates, etc.
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      border: `1px solid ${color}`,
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      color, fontFamily: K.fSerif, fontSize: size * 0.45, fontStyle: 'italic',
      background: `radial-gradient(circle, ${K.bg3} 0%, ${K.bg} 100%)`,
      boxShadow: `inset 0 0 0 1px ${K.bg2}, 0 1px 0 rgba(255,255,255,0.04)`,
    }}>{children}</div>
  );
}

// Etched divider — a thin rule with a glyph centered on it
function Divider({ glyph = '·' }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '8px 0' }}>
      <div style={{ flex: 1, height: 1, background: `linear-gradient(to right, transparent, ${K.line} 30%, ${K.line} 70%, transparent)` }} />
      <span style={{ color: K.copper, fontFamily: K.fSerif, fontSize: 14, fontStyle: 'italic' }}>{glyph}</span>
      <div style={{ flex: 1, height: 1, background: `linear-gradient(to right, transparent, ${K.line} 30%, ${K.line} 70%, transparent)` }} />
    </div>
  );
}

// Frame — base panel with optional starfield background
function Frame({ children, style, stars = false, padding = 24, tone = 'umber' }) {
  const bg = tone === 'umber' ? K.bg2 : tone === 'cocoa' ? K.bg : tone === 'raised' ? K.bg3 : K.bg4;
  return (
    <div style={{
      position: 'relative', overflow: 'hidden',
      background: bg,
      border: `1px solid ${K.line}`,
      borderRadius: 16,
      padding,
      ...style,
    }}>
      {stars && <StarField opacity={0.18} />}
      <div style={{ position: 'relative' }}>{children}</div>
    </div>
  );
}

// expose
Object.assign(window, { K, GLYPH, MoonGlyph, StarField, EphemerisWheel, Kicker, Stat, Seal, Divider, Frame });

})();

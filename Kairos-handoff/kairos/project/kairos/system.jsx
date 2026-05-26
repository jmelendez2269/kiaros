(function(){
// System foundations artboard — the nav, palette, type, motifs all on one page
const { K, GLYPH, MoonGlyph, StarField, EphemerisWheel, Kicker, Stat, Seal, Divider, Frame } = window;

const NEW_NAV = [
  { key: 'today',     label: 'Today',     hint: 'sky now · daily focus',          glyph: '☉', tone: K.copper },
  { key: 'year',      label: 'Year',      hint: 'calendar · blueprint · arcs',    glyph: '◐', tone: K.ember },
  { key: 'self',      label: 'Self',      hint: 'natal · design · areas',         glyph: '✺', tone: K.sage },
  { key: 'journal',   label: 'Journal',   hint: 'entries · tracker · memory',     glyph: '✎', tone: K.brickHi },
];

function ChromeMark() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <div style={{
        width: 40, height: 40, borderRadius: '50%',
        border: `1px solid ${K.copper}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: `radial-gradient(circle at 30% 30%, ${K.bg3}, ${K.bg})`,
        position: 'relative',
      }}>
        <svg width="40" height="40" viewBox="0 0 40 40" style={{ position: 'absolute', inset: 0 }}>
          <circle cx="20" cy="20" r="13" fill="none" stroke={K.copper} strokeWidth="0.5" opacity="0.6" />
          <circle cx="20" cy="20" r="8" fill="none" stroke={K.copperHi} strokeWidth="0.5" opacity="0.8" />
          {/* small planet dots */}
          <circle cx="20" cy="7" r="1.6" fill={K.copperHi} />
          <circle cx="33" cy="20" r="1.1" fill={K.kairos} />
          <circle cx="11" cy="26" r="1.1" fill={K.starlight} />
        </svg>
      </div>
      <div>
        <div style={{ fontFamily: K.fSerif, fontStyle: 'italic', fontSize: 26, color: K.ink, lineHeight: 1 }}>Kairos</div>
        <div style={{ fontFamily: K.fMono, fontSize: 9, letterSpacing: '0.24em', textTransform: 'uppercase', marginTop: 4 }}>
          <span style={{ color: K.kairos }}>●</span>{' '}
          <span style={{ color: K.copperHi }}>Almanac · 2026</span>
        </div>
      </div>
    </div>
  );
}

function NavRow({ active = 'today', collapsed = false }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {NEW_NAV.map(n => {
        const isActive = n.key === active;
        return (
          <div key={n.key} style={{
            display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px',
            borderRadius: 10,
            border: `1px solid ${isActive ? n.tone + '66' : 'transparent'}`,
            background: isActive ? `linear-gradient(to right, ${n.tone}1a, transparent)` : 'transparent',
          }}>
            <div style={{
              width: 30, height: 30, borderRadius: '50%',
              border: `1px solid ${isActive ? n.tone : K.line}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: isActive ? n.tone : K.inkDim,
              fontFamily: K.fSerif, fontSize: 16,
              background: K.bg,
            }}>{n.glyph}</div>
            {!collapsed && (
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: K.fBody, fontSize: 14, fontWeight: 500, color: isActive ? K.ink : K.inkDim }}>{n.label}</div>
                <div style={{ fontFamily: K.fMono, fontSize: 9.5, letterSpacing: '0.1em', color: K.inkSoft, marginTop: 2 }}>{n.hint}</div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function SystemArtboard() {
  return (
    <div style={{
      background: K.bg, color: K.ink, fontFamily: K.fBody,
      padding: 36, height: '100%', display: 'flex', flexDirection: 'column', gap: 28,
      backgroundImage: `radial-gradient(ellipse at top, ${K.brick}26 0%, transparent 40%), radial-gradient(ellipse at bottom right, ${K.kairos}14 0%, transparent 50%)`,
    }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 24 }}>
        <div>
          <Kicker color={K.copper}>System foundations · Warm Almanac v1</Kicker>
          <div style={{ fontFamily: K.fSerif, fontSize: 42, fontStyle: 'italic', color: K.ink, marginTop: 6, lineHeight: 1 }}>
            A planner with a pulse, an almanac with a soul.
          </div>
        </div>
        <ChromeMark />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 20, flex: 1 }}>
        {/* IA */}
        <Frame tone="umber" padding={22}>
          <Kicker>Navigation · 8 → 4</Kicker>
          <div style={{ fontFamily: K.fSerif, fontSize: 22, color: K.ink, marginTop: 8, marginBottom: 14, lineHeight: 1.15 }}>
            Four doors. Stelloquy is the fifth, but it follows you.
          </div>
          <NavRow active="today" />
          <Divider glyph="✦" />
          <div style={{ fontFamily: K.fMono, fontSize: 10, color: K.inkSoft, lineHeight: 1.6 }}>
            <div><span style={{ color: K.copperHi }}>Today</span> ← Dashboard</div>
            <div><span style={{ color: K.copperHi }}>Year</span> ← Calendar + Blueprint + Curriculum (nested)</div>
            <div><span style={{ color: K.copperHi }}>Self</span> ← Human Design + Blueprint chart + Areas</div>
            <div><span style={{ color: K.copperHi }}>Journal</span> ← Journal + Tracker + Pattern memory</div>
            <div style={{ marginTop: 8, color: K.kairos, fontStyle: 'italic' }}>Stelloquy → ambient orb, every screen</div>
          </div>
        </Frame>

        {/* Palette */}
        <Frame tone="umber" padding={22}>
          <Kicker>Palette · Warm Almanac</Kicker>
          <div style={{ fontFamily: K.fSerif, fontSize: 22, color: K.ink, marginTop: 8, marginBottom: 14, lineHeight: 1.15 }}>
            Candlelight on old paper, with brick & copper for the seal.
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {[
              ['cocoa', K.bg, 'base'],
              ['umber', K.bg2, 'panel'],
              ['raised', K.bg3, 'inset'],
              ['parchment', K.ink, 'ink'],
              ['brick', K.brick, 'seal'],
              ['copper', K.copper, 'primary'],
              ['ember', K.ember, 'spark'],
              ['sage', K.sage, 'rest'],
              ['kairos', K.kairos, 'brand accent'],
              ['starlight', K.starlight, 'transit'],
            ].map(([name, hex, role]) => {
              const isBrand = name === 'kairos';
              return (
                <div key={name} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 28, height: 28, borderRadius: 6, background: hex, border: `1px solid ${K.line}`, boxShadow: isBrand ? `0 0 12px ${K.kairos}88` : 'none' }} />
                  <div>
                    <div style={{ fontFamily: K.fBody, fontSize: 11, color: K.ink, textTransform: 'capitalize' }}>{name}</div>
                    <div style={{ fontFamily: K.fMono, fontSize: 8.5, color: isBrand ? K.kairos : K.inkSoft, letterSpacing: '0.08em' }}>{role.toUpperCase()}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </Frame>

        {/* Type & motifs */}
        <Frame tone="umber" padding={22}>
          <Kicker>Type · Almanac Editorial</Kicker>
          <div style={{ fontFamily: K.fSerif, fontSize: 36, fontStyle: 'italic', color: K.ink, marginTop: 8, lineHeight: 1 }}>
            Cormorant
          </div>
          <div style={{ fontFamily: K.fSerif, fontSize: 14, color: K.inkDim, marginTop: 2, fontStyle: 'italic' }}>display · headlines · pull-quotes</div>

          <div style={{ fontFamily: K.fBody, fontSize: 22, color: K.ink, marginTop: 18, lineHeight: 1 }}>DM Sans</div>
          <div style={{ fontFamily: K.fBody, fontSize: 12, color: K.inkDim, marginTop: 2 }}>body · UI · running text</div>

          <div style={{ fontFamily: K.fMono, fontSize: 18, color: K.copperHi, marginTop: 18, letterSpacing: '0.04em' }}>JetBrains Mono</div>
          <div style={{ fontFamily: K.fMono, fontSize: 10, color: K.inkSoft, marginTop: 4, letterSpacing: '0.12em' }}>ALMANAC · DATA · TICKERS</div>

          <div style={{ fontFamily: K.fDisplay, fontWeight: 600, fontSize: 14, color: K.kairos, marginTop: 18, letterSpacing: '0.32em' }}>STELLOQUY</div>
          <div style={{ fontFamily: K.fMono, fontSize: 10, color: K.inkSoft, marginTop: 4, letterSpacing: '0.12em' }}>CINZEL · BRAND DISPLAY · STELLOQUY ONLY</div>

          <Divider glyph="☽" />

          <div style={{ fontFamily: K.fMono, fontSize: 9, letterSpacing: '0.18em', textTransform: 'uppercase', color: K.copper }}>Motifs</div>
          <div style={{ display: 'flex', gap: 14, marginTop: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            <MoonGlyph phase={0.25} size={22} />
            <MoonGlyph phase={0.5} size={22} />
            <MoonGlyph phase={0.75} size={22} />
            <span style={{ color: K.copperHi, fontSize: 18 }}>{GLYPH.sun}</span>
            <span style={{ color: K.copperHi, fontSize: 18 }}>{GLYPH.mercury}</span>
            <span style={{ color: K.copperHi, fontSize: 18 }}>{GLYPH.venus}</span>
            <span style={{ color: K.copperHi, fontSize: 18 }}>{GLYPH.mars}</span>
            <span style={{ color: K.copperHi, fontSize: 18 }}>{GLYPH.jupiter}</span>
            <span style={{ color: K.copperHi, fontSize: 18 }}>{GLYPH.saturn}</span>
            <Seal color={K.kairos} size={26}>K</Seal>
          </div>
        </Frame>
      </div>

      {/* Bottom row — sabian quote + system principles */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 20 }}>
        <Frame tone="cocoa" padding={28} stars style={{ borderColor: K.copper + '44' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 8 }}>
            <Kicker color={K.copper}>Sabian symbol · Moon 14° Scorpio</Kicker>
            <div style={{ fontFamily: K.fMono, fontSize: 9, color: K.inkSoft }}>oct 22 · 7:14pm est</div>
          </div>
          <div style={{ fontFamily: K.fSerif, fontStyle: 'italic', fontSize: 32, color: K.ink, lineHeight: 1.2, maxWidth: 720, textWrap: 'balance' }}>
            "Telephone linemen at work installing new connections."
          </div>
          <div style={{ fontFamily: K.fBody, fontSize: 13, color: K.inkDim, marginTop: 12, maxWidth: 540, lineHeight: 1.55 }}>
            Treated as an editorial moment, not a tooltip. Every screen has space to hold a quiet symbol like this — it's how the celestial gets a voice.
          </div>
        </Frame>
        <Frame tone="umber" padding={22}>
          <Kicker>Principles</Kicker>
          <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[
              { h: 'Warm, not cold.',           s: 'Candlelight, not screensaver.',           dot: K.copper },
              { h: 'Almanac, not dashboard.',   s: 'Mono ticks + serif voice.',               dot: K.copper },
              { h: 'Ambient stelloquy.',        s: 'Oracle follows, never demands a tab.',    dot: K.kairos },
              { h: 'One chart, many lenses.',   s: 'HD, natal, Gene Keys are the same self.', dot: K.copper },
              { h: 'Journal is the practice.',  s: 'Tracker is just journaling with shape.',  dot: K.copper },
            ].map(p => (
              <div key={p.h} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: p.dot, marginTop: 7, flexShrink: 0, boxShadow: p.dot === K.kairos ? `0 0 8px ${K.kairos}` : 'none' }} />
                <div>
                  <div style={{ fontFamily: K.fSerif, fontSize: 16, color: K.ink, lineHeight: 1.2, fontStyle: 'italic' }}>{p.h}</div>
                  <div style={{ fontFamily: K.fBody, fontSize: 12, color: K.inkDim }}>{p.s}</div>
                </div>
              </div>
            ))}
          </div>
        </Frame>
      </div>
    </div>
  );
}

Object.assign(window, { SystemArtboard, ChromeMark, NavRow, NEW_NAV });

})();

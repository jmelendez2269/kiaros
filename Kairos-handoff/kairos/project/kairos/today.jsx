(function(){
// Today artboard — the new dashboard. Sky now, daily focus, week ribbon, journal slot, areas, ambient stelloquy.
const { K, GLYPH, MoonGlyph, StarField, EphemerisWheel, Kicker, Stat, Seal, Divider, Frame } = window;
const { ChromeMark, NavRow } = window;

// Sidebar — the shell that all screens share
function Shell({ active = 'today', children }) {
  return (
    <div style={{
      display: 'grid', gridTemplateColumns: '240px 1fr', height: '100%',
      background: K.bg, color: K.ink, fontFamily: K.fBody, overflow: 'hidden', position: 'relative',
    }}>
      {/* Sidebar */}
      <aside style={{
        background: K.bg2, borderRight: `1px solid ${K.line}`,
        padding: '22px 16px 16px', display: 'flex', flexDirection: 'column', gap: 18,
        position: 'relative', overflow: 'hidden',
      }}>
        <StarField count={20} seed={11} opacity={0.12} />
        <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: 18, height: '100%' }}>
          <div style={{ padding: '0 4px' }}><ChromeMark /></div>
          <div style={{ height: 1, background: K.line }} />
          <NavRow active={active} />
          <div style={{ flex: 1 }} />
          {/* Areas in sidebar — pinned shortcuts */}
          <div>
            <Kicker color={K.inkSoft}>Pinned areas</Kicker>
            <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 4 }}>
              {[
                ['Body', '◉', K.ember],
                ['Craft', '✦', K.copper],
                ['Money', '◐', K.sage],
                ['Love', '♥', K.brickHi],
              ].map(([n, g, c]) => (
                <div key={n} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 8px', borderRadius: 8 }}>
                  <span style={{ color: c, fontSize: 12, width: 14, textAlign: 'center' }}>{g}</span>
                  <span style={{ fontFamily: K.fBody, fontSize: 12, color: K.inkDim }}>{n}</span>
                </div>
              ))}
            </div>
          </div>
          <div style={{ height: 1, background: K.line }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '4px 6px' }}>
            <div style={{ width: 30, height: 30, borderRadius: '50%', background: K.bg3, border: `1px solid ${K.line}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: K.fSerif, fontStyle: 'italic', color: K.copperHi, fontSize: 14 }}>e</div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontFamily: K.fBody, fontSize: 12, color: K.ink }}>Elise</div>
              <div style={{ fontFamily: K.fMono, fontSize: 9, color: K.inkSoft, letterSpacing: '0.1em' }}>5/1 GENERATOR</div>
            </div>
          </div>
        </div>
      </aside>

      <main style={{ overflow: 'hidden', position: 'relative' }}>{children}</main>

      {/* Ambient Stelloquy orb */}
      <StelloquyOrb />
    </div>
  );
}

function StelloquyOrb() {
  return (
    <div style={{
      position: 'absolute', bottom: 22, right: 22, display: 'flex', alignItems: 'center', gap: 12,
      background: `linear-gradient(135deg, ${K.bg3}, ${K.bg2})`,
      border: `1px solid ${K.kairos}55`,
      borderRadius: 999,
      padding: '8px 18px 8px 8px',
      boxShadow: `0 12px 32px rgba(0,0,0,0.6), 0 0 0 1px ${K.kairos}22, 0 0 32px ${K.kairos}33`,
    }}>
      <div style={{
        width: 34, height: 34, borderRadius: '50%',
        background: `radial-gradient(circle at 50% 38%, #ffffff 0%, ${K.kairosHi} 14%, ${K.kairos} 42%, ${K.prism} 78%, transparent 100%)`,
        boxShadow: `0 0 18px ${K.kairos}66, 0 0 32px ${K.prism}33`,
      }} />
      <div>
        <div style={{ fontFamily: K.fDisplay, fontSize: 11, color: K.ink, lineHeight: 1, letterSpacing: '0.24em', fontWeight: 500 }}>STELLOQUY</div>
        <div style={{ fontFamily: K.fMono, fontSize: 8.5, color: K.inkSoft, letterSpacing: '0.18em', marginTop: 5 }}>⌘ K · ANYWHERE</div>
      </div>
    </div>
  );
}

// Sky strip — gradient banner showing time-of-day sky, with sun/moon/transits.
// Mode is read from window.__kairosTweaks.sky → 'sunset' | 'nebula' | 'starlit'
function SkyBanner() {
  const mode = (typeof window !== 'undefined' && window.__kairosTweaks && window.__kairosTweaks.sky) || 'sunset';

  // background + decoration vary by mode; text content stays the same
  const isSunset  = mode === 'sunset';
  const isNebula  = mode === 'nebula';
  const isStarlit = mode === 'starlit';

  const bgFill = isSunset
    ? `linear-gradient(180deg, #1a2240 0%, #3a2d4a 35%, #6b3d4a 65%, #c9854c 90%, #e0a05c 100%)`
    : isNebula
    ? K.bg
    : K.bg;

  const borderTone = isSunset ? K.copper : K.kairos;
  const eyebrowColor = isSunset ? '#e8dcc4' : K.kairosHi;
  const titleColor   = isSunset ? '#fff5e0' : K.ink;
  const bodyColor    = isSunset ? '#f0e0c8' : K.inkDim;
  const metaColor    = isSunset ? '#f0e0c8' : K.inkDim;
  const metaHi       = isSunset ? '#fff5e0' : K.ink;

  return (
    <div style={{
      position: 'relative', overflow: 'hidden', borderRadius: 14,
      background: bgFill,
      padding: 24,
      border: `1px solid ${borderTone}44`,
      minHeight: 200,
      boxShadow: isNebula || isStarlit ? `0 24px 60px rgba(0,0,0,0.5)` : 'none',
    }}>
      {/* mode-specific decoration */}
      {isSunset && (
        <>
          <StarField count={28} seed={3} opacity={0.55} />
          <svg viewBox="0 0 100 12" preserveAspectRatio="none" style={{ position: 'absolute', left: 0, right: 0, bottom: 0, width: '100%', height: 40, opacity: 0.6 }}>
            <path d="M 0 10 L 8 8 L 14 9 L 22 6 L 30 8 L 38 5 L 46 7 L 54 4 L 62 6 L 70 5 L 78 8 L 86 6 L 94 9 L 100 8 L 100 12 L 0 12 Z" fill="#1a0e08" />
          </svg>
          <div style={{ position: 'absolute', right: '8%', bottom: '20%', width: 56, height: 56, borderRadius: '50%', background: `radial-gradient(circle, ${K.copperHi}, ${K.ember}88 60%, transparent)`, boxShadow: `0 0 60px ${K.copperHi}`, filter: 'blur(0.3px)' }} />
          <div style={{ position: 'absolute', top: 28, left: '30%' }}>
            <MoonGlyph phase={0.72} size={28} color="#e8dcc4" />
          </div>
        </>
      )}
      {isNebula && (
        <>
          <div style={{ position: 'absolute', inset: '-20%', background: `radial-gradient(ellipse 60% 50% at 25% 25%, ${K.kairos}aa 0%, transparent 60%)`, mixBlendMode: 'screen' }} />
          <div style={{ position: 'absolute', inset: '-20%', background: `radial-gradient(ellipse 55% 55% at 75% 70%, ${K.prism}66 0%, transparent 60%)`, mixBlendMode: 'screen' }} />
          <div style={{ position: 'absolute', inset: '-20%', background: `radial-gradient(ellipse 45% 40% at 55% 50%, ${K.chronos}33 0%, transparent 60%)`, mixBlendMode: 'screen' }} />
          <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at 50% 40%, rgba(10,10,14,0.04) 0%, rgba(10,10,14,0.6) 100%)' }} />
          <StarField count={36} seed={3} opacity={0.6} />
        </>
      )}
      {isStarlit && (
        <>
          <div style={{ position: 'absolute', inset: 0, background: `radial-gradient(ellipse at 70% 30%, ${K.kairos}22 0%, transparent 60%)`, mixBlendMode: 'screen' }} />
          <StarField count={80} seed={3} opacity={0.85} />
          <div style={{ position: 'absolute', top: 32, right: 60 }}>
            <MoonGlyph phase={0.72} size={36} color={K.ink} />
          </div>
        </>
      )}

      <div style={{ position: 'relative', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 24 }}>
        <div>
          <div style={{ fontFamily: K.fMono, fontSize: 10, color: eyebrowColor, letterSpacing: '0.22em', textTransform: 'uppercase', opacity: 0.92 }}>
            Thursday · October 22 · Astoria, NY
          </div>
          <div style={{ fontFamily: K.fSerif, fontStyle: 'italic', fontSize: isSunset ? 42 : 44, color: titleColor, lineHeight: 1.05, marginTop: isSunset ? 6 : 10, textWrap: 'balance', maxWidth: 560, textShadow: isSunset ? 'none' : `0 0 60px ${K.kairos}55` }}>
            The sky is editing. Trust the small revision.
          </div>
          <div style={{ fontFamily: K.fBody, fontSize: 13.5, color: bodyColor, maxWidth: 480, marginTop: 12, lineHeight: 1.55 }}>
            Waning gibbous in Scorpio, Mercury squaring your natal Sun at 0.8°. Today wants a sentence, not a paragraph — say less, mean more.
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-end', fontFamily: K.fMono, fontSize: 10, color: metaColor, letterSpacing: '0.16em' }}>
          <div>SUNRISE  <span style={{ color: metaHi }}>07:24</span></div>
          <div>SUNSET   <span style={{ color: metaHi }}>18:11</span></div>
          <div>MOONRISE <span style={{ color: metaHi }}>21:48</span></div>
          <div style={{ color: metaHi, marginTop: 6 }}>☽ 14° ♏ · 72% wax</div>
        </div>
      </div>
    </div>
  );
}

function TodayArtboard() {
  return (
    <Shell active="today">
      <div style={{
        padding: 28, height: '100%', overflow: 'hidden',
        display: 'grid', gridTemplateRows: 'auto auto 1fr', gap: 18,
      }}>
        {/* Sky banner */}
        <SkyBanner />

        {/* Two-up: focus + signals */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 16 }}>
          {/* Today's focus */}
          <Frame tone="umber" padding={22}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 12 }}>
              <Kicker>The shape of today</Kicker>
              <div style={{ fontFamily: K.fMono, fontSize: 10, color: K.inkSoft, letterSpacing: '0.14em' }}>WEEK 43 · DAY 295</div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14, marginBottom: 18 }}>
              {[
                { label: 'Energy', value: 'review', glyph: '◐', color: K.sage, note: 'edit, refine' },
                { label: 'Voice', value: 'quieter', glyph: '☾', color: K.plum, note: 'listen first' },
                { label: 'Body', value: 'soft', glyph: '✺', color: K.copper, note: 'pace yourself' },
              ].map(s => (
                <div key={s.label} style={{
                  background: K.bg3, border: `1px solid ${s.color}44`, borderRadius: 10, padding: 14,
                  display: 'flex', flexDirection: 'column', gap: 4,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ color: s.color, fontSize: 18, fontFamily: K.fSerif }}>{s.glyph}</span>
                    <span style={{ fontFamily: K.fMono, fontSize: 9, color: K.inkSoft, letterSpacing: '0.18em', textTransform: 'uppercase' }}>{s.label}</span>
                  </div>
                  <div style={{ fontFamily: K.fSerif, fontStyle: 'italic', fontSize: 22, color: K.ink, lineHeight: 1, marginTop: 2 }}>{s.value}</div>
                  <div style={{ fontFamily: K.fBody, fontSize: 11.5, color: K.inkDim }}>{s.note}</div>
                </div>
              ))}
            </div>

            <div style={{ fontFamily: K.fMono, fontSize: 9, color: K.copper, letterSpacing: '0.18em' }}>ACTIVE TRANSITS</div>
            <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[
                { l: '☿ □ ☉', r: 'Mercury square natal Sun', orb: '0.8°', state: 'applying', tone: K.brickHi },
                { l: '♃ △ ☽', r: 'Jupiter trine natal Moon', orb: '1.4°', state: 'separating', tone: K.sage },
                { l: '♄ ⚹ ♀', r: 'Saturn sextile natal Venus', orb: '2.1°', state: 'applying', tone: K.copper },
              ].map((t, i) => (
                <div key={i} style={{ display: 'grid', gridTemplateColumns: '90px 1fr auto auto', alignItems: 'center', gap: 12, padding: '6px 0', borderTop: i === 0 ? 'none' : `1px solid ${K.line}` }}>
                  <div style={{ fontFamily: K.fSerif, fontSize: 22, color: t.tone, letterSpacing: '0.1em' }}>{t.l}</div>
                  <div style={{ fontFamily: K.fBody, fontSize: 13, color: K.ink }}>{t.r}</div>
                  <div style={{ fontFamily: K.fMono, fontSize: 10.5, color: K.inkDim }}>{t.orb}</div>
                  <div style={{ fontFamily: K.fMono, fontSize: 8.5, color: K.inkSoft, letterSpacing: '0.14em', textTransform: 'uppercase' }}>{t.state}</div>
                </div>
              ))}
            </div>
          </Frame>

          {/* Mini ephemeris */}
          <Frame tone="cocoa" padding={20} stars>
            <Kicker color={K.copper}>Sky now</Kicker>
            <div style={{ display: 'flex', justifyContent: 'center', marginTop: 8 }}>
              <EphemerisWheel
                size={260}
                natal={{ sun: 28, moon: 192, mercury: 22, venus: 56, mars: 145, jupiter: 268, saturn: 312 }}
                transit={{ sun: 209, moon: 224, mercury: 218, venus: 248, mars: 92 }}
                aspects={[
                  { a: 28, b: 218, kind: 'square' },
                  { a: 192, b: 268, kind: 'trine' },
                  { a: 56, b: 312, kind: 'sextile' },
                ]}
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10, fontFamily: K.fMono, fontSize: 9, color: K.inkSoft, letterSpacing: '0.14em' }}>
              <span style={{ color: K.copperHi }}>◯ NATAL</span>
              <span style={{ color: K.starlight }}>◌ TRANSIT</span>
              <span style={{ color: K.sage }}>— ASPECT</span>
            </div>
          </Frame>
        </div>

        {/* Bottom — week ribbon + quick journal */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: 16, minHeight: 0 }}>
          <Frame tone="umber" padding={20}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 12 }}>
              <Kicker>The week ahead</Kicker>
              <div style={{ fontFamily: K.fMono, fontSize: 10, color: K.inkSoft, letterSpacing: '0.14em' }}>OCT 20 — 26</div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 8 }}>
              {[
                { d: 'M', n: 20, ph: 0.55, hot: false, t: 'soft' },
                { d: 'T', n: 21, ph: 0.62, hot: false, t: 'soft' },
                { d: 'W', n: 22, ph: 0.72, hot: true,  t: 'today', active: true },
                { d: 'T', n: 23, ph: 0.82, hot: false, t: 'edit' },
                { d: 'F', n: 24, ph: 0.92, hot: true,  t: 'full ♏' },
                { d: 'S', n: 25, ph: 0.99, hot: false, t: 'release' },
                { d: 'S', n: 26, ph: 0.94, hot: false, t: 'rest' },
              ].map(day => (
                <div key={day.n} style={{
                  border: `1px solid ${day.active ? K.copper : K.line}`,
                  background: day.active ? `linear-gradient(180deg, ${K.copper}28, ${K.bg3})` : K.bg3,
                  borderRadius: 10, padding: '10px 8px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                  position: 'relative',
                }}>
                  <div style={{ fontFamily: K.fMono, fontSize: 9, color: K.inkSoft, letterSpacing: '0.16em' }}>{day.d}</div>
                  <div style={{ fontFamily: K.fSerif, fontStyle: 'italic', fontSize: 24, color: day.active ? K.ink : K.inkDim, lineHeight: 1 }}>{day.n}</div>
                  <MoonGlyph phase={day.ph} size={14} color={day.hot ? K.copperHi : K.inkDim} />
                  <div style={{ fontFamily: K.fBody, fontSize: 10.5, color: day.active ? K.copperHi : K.inkSoft, fontStyle: 'italic' }}>{day.t}</div>
                </div>
              ))}
            </div>

            <Divider glyph="·" />

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginTop: 4 }}>
              <div>
                <Kicker color={K.copper}>This week's theme</Kicker>
                <div style={{ fontFamily: K.fSerif, fontStyle: 'italic', fontSize: 20, color: K.ink, marginTop: 6, lineHeight: 1.2 }}>
                  Edit the room before you furnish it.
                </div>
                <div style={{ fontFamily: K.fBody, fontSize: 12, color: K.inkDim, marginTop: 6, lineHeight: 1.5 }}>
                  Mercury retrograde shadow closes Friday. Use the gibbous days for revision — the full moon on the 24th will show what's ready to leave.
                </div>
              </div>
              <div>
                <Kicker color={K.copper}>Upcoming events</Kicker>
                <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 6, fontFamily: K.fMono, fontSize: 10.5, color: K.inkDim, letterSpacing: '0.06em' }}>
                  <div><span style={{ color: K.copperHi }}>OCT 24</span> · Full Moon in Scorpio · 14°</div>
                  <div><span style={{ color: K.copperHi }}>OCT 27</span> · Mercury stations direct</div>
                  <div><span style={{ color: K.copperHi }}>NOV 01</span> · Sun ingress Sagittarius</div>
                  <div><span style={{ color: K.copperHi }}>NOV 08</span> · New Moon in Scorpio · 16°</div>
                </div>
              </div>
            </div>
          </Frame>

          {/* Quick journal slot */}
          <Frame tone="raised" padding={20} style={{ borderColor: K.brick + '55' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Kicker color={K.brickHi}>A line for today</Kicker>
              <span style={{ fontFamily: K.fMono, fontSize: 9, color: K.inkSoft, letterSpacing: '0.14em' }}>3-DAY STREAK</span>
            </div>
            <div style={{ fontFamily: K.fSerif, fontStyle: 'italic', fontSize: 19, color: K.ink, marginTop: 8, lineHeight: 1.25 }}>
              What did the day try to teach me?
            </div>
            <div style={{
              marginTop: 12, background: K.bg, border: `1px solid ${K.line}`, borderRadius: 10,
              padding: 14, fontFamily: K.fSerif, fontSize: 14, color: K.inkDim, fontStyle: 'italic', lineHeight: 1.6, minHeight: 100,
            }}>
              <span style={{ color: K.copperHi }}>|</span> Write a sentence. Tomorrow Stelloquy will fold it into the pattern.
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 }}>
              <div style={{ display: 'flex', gap: 6 }}>
                {['body', 'craft', 'love'].map(t => (
                  <span key={t} style={{ fontFamily: K.fMono, fontSize: 9.5, color: K.copperHi, border: `1px solid ${K.copper}55`, borderRadius: 999, padding: '3px 9px', letterSpacing: '0.1em', textTransform: 'uppercase' }}>{t}</span>
                ))}
              </div>
              <button style={{
                fontFamily: K.fBody, fontSize: 12, color: K.bg, background: K.copperHi, border: 'none',
                borderRadius: 8, padding: '8px 16px', fontWeight: 500, letterSpacing: '0.02em',
              }}>Save the line →</button>
            </div>
          </Frame>
        </div>
      </div>
    </Shell>
  );
}

Object.assign(window, { TodayArtboard, Shell, StelloquyOrb });

})();

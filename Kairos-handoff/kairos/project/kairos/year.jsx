(function(){
// Year artboard — calendar + blueprint baked in as ambient context, not its own tab.
const { K, GLYPH, MoonGlyph, StarField, EphemerisWheel, Kicker, Stat, Seal, Divider, Frame } = window;
const { Shell } = window;

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

// Quarter color mapping — borrowed from blueprint themes
const QUARTERS = [
  { label: 'Q1 · Plant',   theme: 'Begin from what is already true.',   tone: K.sage,    pole: 'push' },
  { label: 'Q2 · Build',   theme: 'Choose the version that can be kept.', tone: K.copper,  pole: 'push' },
  { label: 'Q3 · Ripen',   theme: 'Let what works become visible.',     tone: K.ember,   pole: 'rest' },
  { label: 'Q4 · Edit',    theme: 'Subtract until the shape is clean.', tone: K.brickHi, pole: 'edit' },
];

// Year overview: 12 months × ~30 days each as a heatmap of "activation"
function YearStrip() {
  // deterministic data
  const r = (() => { let s = 5; return () => { s = (s * 9301 + 49297) % 233280; return s / 233280; }; })();
  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: '60px 1fr', gap: 14, alignItems: 'center' }}>
        <Kicker>2026</Kicker>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
          {QUARTERS.map((q, i) => (
            <div key={q.label} style={{
              padding: '8px 12px', borderRadius: 8,
              background: `linear-gradient(135deg, ${q.tone}22, transparent)`,
              borderLeft: `2px solid ${q.tone}`,
            }}>
              <div style={{ fontFamily: K.fMono, fontSize: 9, color: q.tone, letterSpacing: '0.16em', textTransform: 'uppercase' }}>{q.label}</div>
              <div style={{ fontFamily: K.fSerif, fontSize: 13, fontStyle: 'italic', color: K.ink, marginTop: 2, lineHeight: 1.2 }}>{q.theme}</div>
            </div>
          ))}
        </div>
      </div>

      {/* the year as a thin grid of months × days */}
      <div style={{ marginTop: 14, display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: 6 }}>
        {MONTHS.map((m, mi) => {
          const days = mi === 1 ? 28 : [3,5,8,10].includes(mi) ? 30 : 31;
          const q = Math.floor(mi / 3);
          const tone = QUARTERS[q].tone;
          return (
            <div key={m} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <div style={{ fontFamily: K.fMono, fontSize: 9.5, color: mi === 9 ? K.copperHi : K.inkSoft, letterSpacing: '0.14em', textTransform: 'uppercase', textAlign: 'center' }}>
                {m}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 1.5 }}>
                {Array.from({ length: days }).map((_, di) => {
                  const intensity = r();
                  const isFull = intensity > 0.93;
                  const isNew = intensity < 0.07;
                  const today = mi === 9 && di === 21;
                  return (
                    <div key={di} style={{
                      width: '100%', aspectRatio: '1',
                      background: today ? K.copperHi : isFull ? K.copper : isNew ? K.bg : `${tone}${Math.floor(intensity * 30 + 10).toString(16).padStart(2,'0')}`,
                      borderRadius: 1.5,
                      border: today ? `1px solid ${K.ink}` : 'none',
                    }} />
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Month grid — 6 weeks × 7 days
function MonthGrid() {
  const today = 22;
  const offset = 3; // Oct 1 = Thursday → 3 empty cells from Sun
  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 1, marginBottom: 4 }}>
        {['S','M','T','W','T','F','S'].map((d, i) => (
          <div key={i} style={{ fontFamily: K.fMono, fontSize: 9.5, color: K.inkSoft, letterSpacing: '0.16em', textAlign: 'center', padding: '4px 0' }}>{d}</div>
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 1, background: K.line }}>
        {Array.from({ length: 35 }).map((_, i) => {
          const d = i - offset + 1;
          const valid = d >= 1 && d <= 31;
          const isToday = d === today;
          const phase = valid ? ((d - 1) / 29.5) % 1 : 0;
          const events = {
            6: { tag: 'Body · clinic', tone: K.ember },
            10: { tag: 'Last Q ☾', tone: K.inkDim },
            14: { tag: 'New project · craft', tone: K.copper },
            17: { tag: 'Saturn return rises', tone: K.brickHi },
            22: { tag: 'Today · review', tone: K.copperHi },
            24: { tag: 'Full ☾ Scorpio', tone: K.copper },
            27: { tag: 'Mercury direct', tone: K.sage },
          }[d];

          return (
            <div key={i} style={{
              minHeight: 78, background: !valid ? K.bg : isToday ? `linear-gradient(180deg, ${K.copper}22, ${K.bg2})` : K.bg2,
              padding: 7, position: 'relative',
              border: isToday ? `1px solid ${K.copper}` : 'none',
              borderRadius: isToday ? 4 : 0,
            }}>
              {valid && (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <span style={{ fontFamily: K.fSerif, fontStyle: 'italic', fontSize: 16, color: isToday ? K.ink : K.inkDim, lineHeight: 1 }}>{d}</span>
                    {(d % 7 === 1 || d === 24 || d === 10) && (
                      <MoonGlyph phase={d === 24 ? 1 : d === 10 ? 0.25 : phase} size={11} color={K.copperHi} />
                    )}
                  </div>
                  {events && (
                    <div style={{
                      marginTop: 6, fontFamily: K.fMono, fontSize: 8.5, color: events.tone, letterSpacing: '0.04em',
                      borderLeft: `2px solid ${events.tone}`, paddingLeft: 5, lineHeight: 1.3,
                    }}>{events.tag}</div>
                  )}
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function PushRestRibbon() {
  const periods = [
    { kind: 'push',  start: 0,   end: 14, label: 'PUSH · Year arc opens',   tone: K.copper },
    { kind: 'rest',  start: 14,  end: 22, label: 'REST · Editorial pause',  tone: K.sage   },
    { kind: 'push',  start: 22,  end: 48, label: 'PUSH · Build Q2',         tone: K.copper },
    { kind: 'rest',  start: 48,  end: 56, label: 'REST · Solstice rest',    tone: K.sage   },
    { kind: 'push',  start: 56,  end: 78, label: 'PUSH · Ripen the work',   tone: K.copper },
    { kind: 'edit',  start: 78,  end: 88, label: 'EDIT · Cull & close',     tone: K.brickHi },
    { kind: 'rest',  start: 88,  end: 100, label: 'REST · Year closes',     tone: K.sage   },
  ];
  return (
    <div style={{ position: 'relative', height: 32, background: K.bg3, borderRadius: 6, overflow: 'hidden', border: `1px solid ${K.line}` }}>
      {periods.map((p, i) => (
        <div key={i} style={{
          position: 'absolute', top: 0, bottom: 0,
          left: `${p.start}%`, width: `${p.end - p.start}%`,
          background: `linear-gradient(180deg, ${p.tone}44, ${p.tone}11)`,
          borderRight: i < periods.length - 1 ? `1px solid ${K.bg2}` : 'none',
          display: 'flex', alignItems: 'center', paddingLeft: 8,
          fontFamily: K.fMono, fontSize: 8.5, color: p.tone, letterSpacing: '0.14em', overflow: 'hidden', whiteSpace: 'nowrap',
        }}>{p.label}</div>
      ))}
      {/* today marker */}
      <div style={{ position: 'absolute', top: -4, bottom: -4, left: '81%', width: 2, background: K.ink, boxShadow: `0 0 6px ${K.ink}` }} />
    </div>
  );
}

function YearArtboard() {
  return (
    <Shell active="year">
      <div style={{
        padding: 28, height: '100%', overflow: 'hidden',
        display: 'grid', gridTemplateRows: 'auto auto 1fr auto', gap: 16,
      }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <div>
            <Kicker>Year · 2026</Kicker>
            <div style={{ fontFamily: K.fSerif, fontStyle: 'italic', fontSize: 36, color: K.ink, lineHeight: 1, marginTop: 4 }}>
              Your year, anchored to the sky.
            </div>
          </div>
          {/* View switcher */}
          <div style={{ display: 'flex', gap: 4, background: K.bg2, border: `1px solid ${K.line}`, borderRadius: 999, padding: 4 }}>
            {['Year', 'Month', 'Week', 'Day'].map((v, i) => (
              <div key={v} style={{
                fontFamily: K.fBody, fontSize: 12, padding: '6px 14px', borderRadius: 999,
                background: i === 1 ? `linear-gradient(180deg, ${K.copper}, ${K.brick})` : 'transparent',
                color: i === 1 ? K.bg : K.inkDim, fontWeight: i === 1 ? 600 : 400,
              }}>{v}</div>
            ))}
          </div>
        </div>

        {/* Year strip (always visible — blueprint context baked in) */}
        <Frame tone="umber" padding={18}>
          <YearStrip />
        </Frame>

        {/* Month grid + side panel */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 16, minHeight: 0 }}>
          <Frame tone="umber" padding={18}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 }}>
              <div style={{ fontFamily: K.fSerif, fontStyle: 'italic', fontSize: 26, color: K.ink }}>October</div>
              <div style={{ fontFamily: K.fMono, fontSize: 10, color: K.inkSoft, letterSpacing: '0.14em' }}>WK 40 — WK 44</div>
            </div>
            <MonthGrid />
          </Frame>

          {/* Side panel: this month's brief — blueprint baked in */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14, minHeight: 0 }}>
            <Frame tone="raised" padding={18} style={{ borderColor: K.brickHi + '55' }}>
              <Kicker color={K.brickHi}>October brief</Kicker>
              <div style={{ fontFamily: K.fSerif, fontStyle: 'italic', fontSize: 20, color: K.ink, marginTop: 6, lineHeight: 1.2 }}>
                Edit the year you've built.
              </div>
              <div style={{ fontFamily: K.fBody, fontSize: 12, color: K.inkDim, marginTop: 8, lineHeight: 1.6 }}>
                Scorpio season. The full moon on the 24th will show what's ready to leave. Keep one project open, not three.
              </div>
              <div style={{ marginTop: 10, fontFamily: K.fMono, fontSize: 9.5, color: K.copperHi, letterSpacing: '0.14em' }}>
                FOCUS · CRAFT · MONEY
              </div>
            </Frame>

            <Frame tone="cocoa" padding={16} stars>
              <Kicker color={K.copper}>Sabian for this week</Kicker>
              <div style={{ fontFamily: K.fSerif, fontStyle: 'italic', fontSize: 16, color: K.ink, marginTop: 8, lineHeight: 1.3 }}>
                "A drowning man being rescued."
              </div>
              <div style={{ fontFamily: K.fMono, fontSize: 9, color: K.inkSoft, letterSpacing: '0.14em', marginTop: 8 }}>SUN · 28° LIBRA</div>
            </Frame>

            <Frame tone="umber" padding={16}>
              <Kicker>Curriculum</Kicker>
              <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
                {[
                  ['Saturn return · part 3', '12 min', K.copper],
                  ['Gate 64 in the Gene Keys', '8 min', K.sage],
                ].map(([t, m, c]) => (
                  <div key={t} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', background: K.bg, border: `1px solid ${K.line}`, borderRadius: 8 }}>
                    <span style={{ color: c, fontSize: 14 }}>◐</span>
                    <span style={{ fontFamily: K.fBody, fontSize: 12, color: K.ink, flex: 1 }}>{t}</span>
                    <span style={{ fontFamily: K.fMono, fontSize: 9.5, color: K.inkSoft }}>{m}</span>
                  </div>
                ))}
              </div>
              <div style={{ fontFamily: K.fMono, fontSize: 9, color: K.copperHi, letterSpacing: '0.14em', marginTop: 10, textAlign: 'right' }}>
                BROWSE ALL TRACKS →
              </div>
            </Frame>
          </div>
        </div>

        {/* Push/rest ribbon */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
            <Kicker>Year's pulse · push / rest / edit</Kicker>
            <div style={{ fontFamily: K.fMono, fontSize: 9.5, color: K.inkSoft, letterSpacing: '0.14em' }}>JAN — DEC</div>
          </div>
          <PushRestRibbon />
        </div>
      </div>
    </Shell>
  );
}

Object.assign(window, { YearArtboard });

})();

(function(){
// Self artboard — Human Design + natal chart + Areas, unified as one self-portrait.
const { K, GLYPH, MoonGlyph, StarField, EphemerisWheel, Kicker, Stat, Seal, Divider, Frame } = window;
const { Shell } = window;

// Body graph — simplified, geometric. 9 centers + channels.
function BodyGraph({ size = 280 }) {
  const W = size, H = size * 1.5;
  const cx = W / 2;
  // Center positions (cx, cy, shape, label, defined)
  const CENTERS = [
    { id: 'head',    cx: cx, cy: 30,        shape: 'tri-down',  label: 'Head',    def: false },
    { id: 'ajna',    cx: cx, cy: 88,        shape: 'tri-up',    label: 'Ajna',    def: false },
    { id: 'throat',  cx: cx, cy: 150,       shape: 'square',    label: 'Throat',  def: true },
    { id: 'g',       cx: cx, cy: 220,       shape: 'diamond',   label: 'G',       def: true },
    { id: 'heart',   cx: cx + 56, cy: 226,  shape: 'tri-left',  label: 'Heart',   def: false },
    { id: 'spleen',  cx: cx - 80, cy: 290,  shape: 'tri-right', label: 'Spleen',  def: true },
    { id: 'sacral',  cx: cx, cy: 308,       shape: 'square',    label: 'Sacral',  def: true },
    { id: 'solar',   cx: cx + 80, cy: 290,  shape: 'tri-left',  label: 'Solar',   def: false },
    { id: 'root',    cx: cx, cy: 380,       shape: 'square',    label: 'Root',    def: true },
  ];
  const FILL = (def) => def ? K.copper : 'transparent';
  const STROKE = (def) => def ? K.copperHi : K.inkSoft;

  const shape = (c) => {
    const s = 36;
    const fill = FILL(c.def), stroke = STROKE(c.def);
    if (c.shape === 'square') return <rect x={c.cx - s/2} y={c.cy - s/2} width={s} height={s} fill={fill} stroke={stroke} strokeWidth="1.2" />;
    if (c.shape === 'diamond') return <rect x={c.cx - s/2} y={c.cy - s/2} width={s} height={s} fill={fill} stroke={stroke} strokeWidth="1.2" transform={`rotate(45 ${c.cx} ${c.cy})`} />;
    if (c.shape === 'tri-down') return <polygon points={`${c.cx-s/2},${c.cy-s/2} ${c.cx+s/2},${c.cy-s/2} ${c.cx},${c.cy+s/2}`} fill={fill} stroke={stroke} strokeWidth="1.2" />;
    if (c.shape === 'tri-up') return <polygon points={`${c.cx-s/2},${c.cy+s/2} ${c.cx+s/2},${c.cy+s/2} ${c.cx},${c.cy-s/2}`} fill={fill} stroke={stroke} strokeWidth="1.2" />;
    if (c.shape === 'tri-left') return <polygon points={`${c.cx+s/2},${c.cy-s/2} ${c.cx+s/2},${c.cy+s/2} ${c.cx-s/2},${c.cy}`} fill={fill} stroke={stroke} strokeWidth="1.2" />;
    if (c.shape === 'tri-right') return <polygon points={`${c.cx-s/2},${c.cy-s/2} ${c.cx-s/2},${c.cy+s/2} ${c.cx+s/2},${c.cy}`} fill={fill} stroke={stroke} strokeWidth="1.2" />;
  };

  // Channels — pairs of center ids that are connected (defined)
  const CHANNELS = [
    { from: 'throat', to: 'g', def: true },
    { from: 'g', to: 'sacral', def: true },
    { from: 'sacral', to: 'root', def: true },
    { from: 'spleen', to: 'g', def: false },
    { from: 'sacral', to: 'spleen', def: true },
    { from: 'ajna', to: 'throat', def: false },
    { from: 'head', to: 'ajna', def: false },
    { from: 'heart', to: 'g', def: false },
  ];

  const findCenter = (id) => CENTERS.find(c => c.id === id);

  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ display: 'block' }}>
      {/* channels first so centers sit on top */}
      {CHANNELS.map((ch, i) => {
        const a = findCenter(ch.from), b = findCenter(ch.to);
        return <line key={i} x1={a.cx} y1={a.cy} x2={b.cx} y2={b.cy}
          stroke={ch.def ? K.copperHi : K.line} strokeWidth={ch.def ? 4 : 1.5}
          strokeDasharray={ch.def ? 'none' : '3 3'} opacity={ch.def ? 0.85 : 0.5} />;
      })}
      {CENTERS.map(c => (
        <g key={c.id}>
          {shape(c)}
          <text x={c.cx} y={c.cy + 4} textAnchor="middle" fontSize="9" fontFamily={K.fMono}
            fill={c.def ? K.bg : K.inkDim} letterSpacing="0.12em">
            {c.label.toUpperCase()}
          </text>
        </g>
      ))}
    </svg>
  );
}

function ChannelChip({ name, gates, defined }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px',
      background: defined ? `linear-gradient(to right, ${K.copper}1a, transparent)` : K.bg3,
      border: `1px solid ${defined ? K.copper + '55' : K.line}`, borderRadius: 8,
    }}>
      <div style={{ fontFamily: K.fMono, fontSize: 10, color: defined ? K.copperHi : K.inkSoft, letterSpacing: '0.06em', minWidth: 40 }}>{gates}</div>
      <div style={{ fontFamily: K.fSerif, fontStyle: 'italic', fontSize: 14, color: K.ink, lineHeight: 1.2, flex: 1 }}>{name}</div>
    </div>
  );
}

function GeneKeyCard({ gate, name, shadow, gift, siddhi }) {
  return (
    <div style={{
      padding: 16, borderRadius: 10,
      background: `linear-gradient(180deg, ${K.bg3} 0%, ${K.bg2} 100%)`,
      border: `1px solid ${K.line}`, position: 'relative', overflow: 'hidden',
    }}>
      <div style={{ position: 'absolute', top: -20, right: -20, fontFamily: K.fSerif, fontStyle: 'italic', fontSize: 90, color: K.copper, opacity: 0.18, lineHeight: 1 }}>{gate}</div>
      <div style={{ fontFamily: K.fMono, fontSize: 9, color: K.copperHi, letterSpacing: '0.16em' }}>GATE {gate} · {name.toUpperCase()}</div>
      <div style={{ marginTop: 10, display: 'grid', gridTemplateColumns: '1fr', gap: 6 }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'baseline' }}>
          <span style={{ fontFamily: K.fMono, fontSize: 8.5, color: K.brickHi, letterSpacing: '0.14em', minWidth: 56 }}>SHADOW</span>
          <span style={{ fontFamily: K.fSerif, fontStyle: 'italic', fontSize: 13, color: K.inkDim }}>{shadow}</span>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'baseline' }}>
          <span style={{ fontFamily: K.fMono, fontSize: 8.5, color: K.copperHi, letterSpacing: '0.14em', minWidth: 56 }}>GIFT</span>
          <span style={{ fontFamily: K.fSerif, fontStyle: 'italic', fontSize: 13, color: K.ink }}>{gift}</span>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'baseline' }}>
          <span style={{ fontFamily: K.fMono, fontSize: 8.5, color: K.sage, letterSpacing: '0.14em', minWidth: 56 }}>SIDDHI</span>
          <span style={{ fontFamily: K.fSerif, fontStyle: 'italic', fontSize: 13, color: K.ink }}>{siddhi}</span>
        </div>
      </div>
    </div>
  );
}

function SelfArtboard() {
  return (
    <Shell active="self">
      <div style={{
        padding: 28, height: '100%', overflow: 'auto',
        display: 'flex', flexDirection: 'column', gap: 18,
      }}>
        {/* Hero */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <div>
            <Kicker>Self · the one chart, three lenses</Kicker>
            <div style={{ fontFamily: K.fSerif, fontStyle: 'italic', fontSize: 36, color: K.ink, lineHeight: 1, marginTop: 4 }}>
              Elise — a 5/1 Sacral Generator.
            </div>
            <div style={{ fontFamily: K.fBody, fontSize: 13, color: K.inkDim, marginTop: 6 }}>
              Born Apr 14, 1991 · 3:42 PM · Brooklyn, NY. The chart is one input — not a verdict.
            </div>
          </div>
          {/* Lens tabs */}
          <div style={{ display: 'flex', gap: 4, background: K.bg2, border: `1px solid ${K.line}`, borderRadius: 999, padding: 4 }}>
            {['Natal', 'Human Design', 'Gene Keys', 'Areas'].map((v, i) => (
              <div key={v} style={{
                fontFamily: K.fBody, fontSize: 12, padding: '6px 14px', borderRadius: 999,
                background: i === 1 ? `linear-gradient(180deg, ${K.copper}, ${K.brick})` : 'transparent',
                color: i === 1 ? K.bg : K.inkDim, fontWeight: i === 1 ? 600 : 400,
              }}>{v}</div>
            ))}
          </div>
        </div>

        {/* Top: chart wheel + body graph side by side */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <Frame tone="cocoa" padding={20} stars>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <Kicker color={K.copper}>Natal · the sky at birth</Kicker>
              <div style={{ fontFamily: K.fMono, fontSize: 9.5, color: K.inkSoft }}>15:42 · 40.66°N 73.94°W</div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'center', marginTop: 10 }}>
              <EphemerisWheel
                size={320}
                natal={{ sun: 24, moon: 158, mercury: 18, venus: 354, mars: 76, jupiter: 110, saturn: 290, uranus: 285, neptune: 285, pluto: 234 }}
                aspects={[
                  { a: 24, b: 290, kind: 'square' },
                  { a: 158, b: 18, kind: 'opposition' },
                  { a: 354, b: 110, kind: 'trine' },
                  { a: 76, b: 234, kind: 'sextile' },
                ]}
                showHouses
              />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginTop: 14 }}>
              <Stat label="Sun" value={`${GLYPH.aries} 4° · 1st`} mono={false} />
              <Stat label="Moon" value={`${GLYPH.virgo} 8° · 6th`} mono={false} />
              <Stat label="Rising" value={`${GLYPH.aries} 12°`} mono={false} />
            </div>
          </Frame>

          <Frame tone="umber" padding={20}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <Kicker color={K.copper}>Human Design · the body graph</Kicker>
              <div style={{ fontFamily: K.fMono, fontSize: 9.5, color: K.inkSoft }}>5 DEFINED · 4 OPEN</div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'center', marginTop: 6 }}>
              <BodyGraph size={240} />
            </div>
          </Frame>
        </div>

        {/* Type/Strategy/Authority/Profile — the four pillars */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
          {[
            { l: 'Type',      v: 'Generator',        s: 'sacral response', tone: K.copper },
            { l: 'Strategy',  v: 'To respond',       s: 'wait, then move', tone: K.sage },
            { l: 'Authority', v: 'Sacral',           s: 'gut-level uh-huh', tone: K.ember },
            { l: 'Profile',   v: '5 / 1',            s: 'heretic · investigator', tone: K.brickHi },
          ].map(p => (
            <div key={p.l} style={{
              padding: 18, borderRadius: 10,
              background: `linear-gradient(160deg, ${p.tone}1f 0%, ${K.bg2} 70%)`,
              border: `1px solid ${p.tone}55`,
            }}>
              <div style={{ fontFamily: K.fMono, fontSize: 9.5, color: p.tone, letterSpacing: '0.18em', textTransform: 'uppercase' }}>{p.l}</div>
              <div style={{ fontFamily: K.fSerif, fontStyle: 'italic', fontSize: 28, color: K.ink, lineHeight: 1, marginTop: 6 }}>{p.v}</div>
              <div style={{ fontFamily: K.fBody, fontSize: 11.5, color: K.inkDim, marginTop: 6 }}>{p.s}</div>
            </div>
          ))}
        </div>

        {/* Signature / Not-self */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <Frame tone="umber" padding={20} style={{ borderColor: K.sage + '44' }}>
            <Kicker color={K.sage}>Signature · when honored</Kicker>
            <div style={{ fontFamily: K.fSerif, fontStyle: 'italic', fontSize: 30, color: K.ink, marginTop: 8, lineHeight: 1.15 }}>
              Satisfaction.
            </div>
            <div style={{ fontFamily: K.fBody, fontSize: 13, color: K.inkDim, marginTop: 8, lineHeight: 1.55 }}>
              You know it as the warm exhale after work that responded to itself. Not pride, not relief — a quiet "yes, that."
            </div>
          </Frame>
          <Frame tone="umber" padding={20} style={{ borderColor: K.brickHi + '44' }}>
            <Kicker color={K.brickHi}>Not-self · when forcing</Kicker>
            <div style={{ fontFamily: K.fSerif, fontStyle: 'italic', fontSize: 30, color: K.ink, marginTop: 8, lineHeight: 1.15 }}>
              Frustration.
            </div>
            <div style={{ fontFamily: K.fBody, fontSize: 13, color: K.inkDim, marginTop: 8, lineHeight: 1.55 }}>
              Initiating before there's something to respond to. The day feels jagged. Stop. Wait for the body to lean toward something.
            </div>
          </Frame>
        </div>

        {/* Activated channels + Gene Keys (Prime Gifts) */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: 16 }}>
          <Frame tone="umber" padding={20}>
            <Kicker>Activated channels · 4</Kicker>
            <div style={{ fontFamily: K.fSerif, fontStyle: 'italic', fontSize: 18, color: K.ink, marginTop: 6, marginBottom: 12 }}>
              How your body is wired to flow.
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <ChannelChip name="The Channel of the Alpha — leadership" gates="7—31" defined />
              <ChannelChip name="The Channel of the Brain Wave — wishing" gates="47—64" defined />
              <ChannelChip name="The Channel of Surrender — a transmitter" gates="44—26" defined />
              <ChannelChip name="The Channel of Mating — focused on bonding" gates="59—6" defined />
              <ChannelChip name="The Channel of Inspiration — open" gates="11—56" defined={false} />
            </div>
          </Frame>

          <Frame tone="umber" padding={20}>
            <Kicker color={K.copper}>Prime gifts · Gene Keys activation</Kicker>
            <div style={{ fontFamily: K.fSerif, fontStyle: 'italic', fontSize: 18, color: K.ink, marginTop: 6, marginBottom: 12 }}>
              Four gates. Three octaves each. One contemplation.
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <GeneKeyCard gate="31" name="Life's work"        shadow="Arrogance"   gift="Leadership" siddhi="Humility" />
              <GeneKeyCard gate="41" name="Evolution"           shadow="Fantasy"     gift="Anticipation" siddhi="Emanation" />
              <GeneKeyCard gate="22" name="Radiance"            shadow="Dishonor"    gift="Graciousness" siddhi="Grace" />
              <GeneKeyCard gate="36" name="Purpose"             shadow="Turbulence"  gift="Humanity" siddhi="Compassion" />
            </div>
          </Frame>
        </div>

        {/* Areas of focus — pinned right into the self picture */}
        <Frame tone="cocoa" padding={22} stars>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 12 }}>
            <div>
              <Kicker color={K.copper}>Areas of focus · 2026</Kicker>
              <div style={{ fontFamily: K.fSerif, fontStyle: 'italic', fontSize: 22, color: K.ink, marginTop: 4 }}>
                Six rooms. Pick the one that's calling.
              </div>
            </div>
            <button style={{
              fontFamily: K.fBody, fontSize: 12, color: K.copperHi, background: 'transparent',
              border: `1px solid ${K.copper}`, borderRadius: 999, padding: '6px 14px',
            }}>＋ add an area</button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
            {[
              { name: 'Body',    g: '◉', n: 'movement, sleep, food',      tone: K.ember,  pct: 64 },
              { name: 'Craft',   g: '✦', n: 'writing, work, the studio',  tone: K.copper, pct: 82 },
              { name: 'Money',   g: '◐', n: 'cash, savings, the offering', tone: K.sage,   pct: 41 },
              { name: 'Love',    g: '♥', n: 'partner, family, friends',    tone: K.brickHi, pct: 70 },
              { name: 'Spirit',  g: '☽', n: 'practice, rest, ritual',     tone: K.plum,   pct: 55 },
              { name: 'Home',    g: '☖', n: 'space, beauty, order',       tone: K.starlight, pct: 38 },
            ].map(a => (
              <div key={a.name} style={{
                padding: 14, borderRadius: 10,
                background: `linear-gradient(160deg, ${a.tone}1c 0%, ${K.bg2} 80%)`,
                border: `1px solid ${a.tone}44`,
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ color: a.tone, fontSize: 16 }}>{a.g}</span>
                      <span style={{ fontFamily: K.fSerif, fontStyle: 'italic', fontSize: 18, color: K.ink }}>{a.name}</span>
                    </div>
                    <div style={{ fontFamily: K.fBody, fontSize: 11.5, color: K.inkDim, marginTop: 4 }}>{a.n}</div>
                  </div>
                  <div style={{ fontFamily: K.fMono, fontSize: 11, color: a.tone, letterSpacing: '0.06em' }}>{a.pct}%</div>
                </div>
                <div style={{ marginTop: 10, height: 3, background: K.bg, borderRadius: 2, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${a.pct}%`, background: a.tone }} />
                </div>
              </div>
            ))}
          </div>
        </Frame>
      </div>
    </Shell>
  );
}

Object.assign(window, { SelfArtboard, BodyGraph });

})();

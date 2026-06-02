(function(){
// Journal artboard — entries + tracker + pattern memory, one daily practice.
const { K, GLYPH, MoonGlyph, StarField, EphemerisWheel, Kicker, Stat, Seal, Divider, Frame } = window;
const { Shell } = window;

function PatternRow({ pattern, count, confidence, evidence, tone = K.copper }) {
  return (
    <div style={{ padding: '12px 0', borderTop: `1px solid ${K.line}` }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12 }}>
        <div style={{ fontFamily: K.fSerif, fontStyle: 'italic', fontSize: 18, color: K.ink, lineHeight: 1.2, flex: 1 }}>{pattern}</div>
        <div style={{ display: 'flex', gap: 14, alignItems: 'center', flexShrink: 0 }}>
          <div style={{ fontFamily: K.fMono, fontSize: 10, color: K.inkSoft, letterSpacing: '0.1em' }}>{count} entries</div>
          {/* confidence dots */}
          <div style={{ display: 'flex', gap: 2 }}>
            {[0,1,2,3,4].map(i => (
              <div key={i} style={{ width: 5, height: 5, borderRadius: '50%', background: i < confidence ? tone : K.bg3, border: `1px solid ${tone}55` }} />
            ))}
          </div>
        </div>
      </div>
      <div style={{ fontFamily: K.fBody, fontSize: 12, color: K.inkDim, marginTop: 6, lineHeight: 1.55 }}>{evidence}</div>
    </div>
  );
}

function EntryCard({ date, title, body, mood, sky, ritual = false }) {
  return (
    <div style={{
      padding: 16, borderRadius: 10,
      background: ritual ? `linear-gradient(160deg, ${K.brick}22 0%, ${K.bg2} 70%)` : K.bg2,
      border: `1px solid ${ritual ? K.brickHi + '55' : K.line}`,
      position: 'relative',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10, marginBottom: 8 }}>
        <div>
          <div style={{ fontFamily: K.fMono, fontSize: 9.5, color: K.copperHi, letterSpacing: '0.18em' }}>{date}</div>
          <div style={{ fontFamily: K.fSerif, fontStyle: 'italic', fontSize: 18, color: K.ink, marginTop: 4, lineHeight: 1.2 }}>{title}</div>
        </div>
        {ritual && <span style={{ fontFamily: K.fMono, fontSize: 8.5, color: K.brickHi, letterSpacing: '0.18em', border: `1px solid ${K.brickHi}55`, padding: '2px 8px', borderRadius: 999 }}>RITUAL</span>}
      </div>
      <div style={{ fontFamily: K.fBody, fontSize: 13, color: K.inkDim, lineHeight: 1.6 }}>{body}</div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, fontFamily: K.fMono, fontSize: 9.5, color: K.inkSoft, letterSpacing: '0.1em' }}>
        <span>{sky}</span>
        <span style={{ color: K.copperHi }}>{mood}</span>
      </div>
    </div>
  );
}

// Tracker — a simple chart of body/craft/mood over the last 30 days
function TrackerStrip() {
  const r = (() => { let s = 13; return () => { s = (s * 9301 + 49297) % 233280; return s / 233280; }; })();
  const days = Array.from({ length: 30 }, () => ({
    body:  0.3 + r() * 0.7,
    craft: 0.2 + r() * 0.8,
    mood:  0.4 + r() * 0.6,
  }));
  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(30, 1fr)', gap: 2, height: 60 }}>
        {days.map((d, i) => (
          <div key={i} style={{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', gap: 1 }}>
            <div style={{ height: `${d.craft * 100}%`, background: K.copper, opacity: 0.7, borderRadius: '1px 1px 0 0' }} />
            <div style={{ height: `${d.body * 30}%`,  background: K.ember,  opacity: 0.8 }} />
            <div style={{ height: `${d.mood * 30}%`,  background: K.sage,   opacity: 0.7, borderRadius: '0 0 1px 1px' }} />
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontFamily: K.fMono, fontSize: 9, color: K.inkSoft, letterSpacing: '0.1em' }}>
        <span>30 DAYS AGO</span>
        <span>TODAY</span>
      </div>
    </div>
  );
}

function JournalArtboard() {
  return (
    <Shell active="journal">
      <div style={{
        padding: 28, height: '100%', overflow: 'auto',
        display: 'flex', flexDirection: 'column', gap: 18,
      }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <div>
            <Kicker>Journal · the practice</Kicker>
            <div style={{ fontFamily: K.fSerif, fontStyle: 'italic', fontSize: 36, color: K.ink, lineHeight: 1, marginTop: 4 }}>
              Forty-two entries become a self-portrait.
            </div>
          </div>
          <div style={{ display: 'flex', gap: 4, background: K.bg2, border: `1px solid ${K.line}`, borderRadius: 999, padding: 4 }}>
            {['Write', 'Entries', 'Track', 'Patterns'].map((v, i) => (
              <div key={v} style={{
                fontFamily: K.fBody, fontSize: 12, padding: '6px 14px', borderRadius: 999,
                background: i === 0 ? `linear-gradient(180deg, ${K.copper}, ${K.brick})` : 'transparent',
                color: i === 0 ? K.bg : K.inkDim, fontWeight: i === 0 ? 600 : 400,
              }}>{v}</div>
            ))}
          </div>
        </div>

        {/* Two-column: composer + side stats */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 16 }}>
          {/* Composer */}
          <Frame tone="cocoa" padding={28} stars>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
              <Kicker color={K.copperHi}>Thursday, October 22 · Moon 14° ♏</Kicker>
              <div style={{ fontFamily: K.fMono, fontSize: 9.5, color: K.inkSoft }}>WK 43 · DAY 295</div>
            </div>
            <div style={{ fontFamily: K.fSerif, fontStyle: 'italic', fontSize: 26, color: K.ink, marginTop: 4, lineHeight: 1.2 }}>
              What did the day try to teach me?
            </div>
            <div style={{
              marginTop: 16, background: `linear-gradient(180deg, ${K.bg2}, ${K.bg})`,
              border: `1px solid ${K.line}`, borderRadius: 10, padding: 20,
              fontFamily: K.fSerif, fontSize: 16, color: K.ink, fontStyle: 'italic',
              lineHeight: 1.7, minHeight: 220,
            }}>
              <p style={{ margin: 0 }}>
                The Mercury square has me wanting to over-explain. I'm watching myself draft three versions of the same sentence at work and it's funny — I'm doing the gibbous-moon thing. <span style={{ color: K.copperHi, background: K.copper + '22', padding: '0 4px', borderRadius: 3 }}>Edit, don't add.</span>
              </p>
              <p style={{ marginTop: 12 }}>
                Body felt heavy this morning. Walked instead of ran. I think that was right — sacral didn't lean toward the run.
              </p>
              <p style={{ marginTop: 12, color: K.inkSoft }}>
                <span style={{ color: K.copperHi }}>|</span>
              </p>
            </div>

            {/* Composer footer */}
            <div style={{ marginTop: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {['craft', 'body', 'mercury-retro'].map(t => (
                  <span key={t} style={{ fontFamily: K.fMono, fontSize: 9.5, color: K.copperHi, border: `1px solid ${K.copper}55`, borderRadius: 999, padding: '4px 10px', letterSpacing: '0.1em', textTransform: 'uppercase' }}>{t}</span>
                ))}
                <span style={{ fontFamily: K.fMono, fontSize: 10, color: K.inkSoft, padding: '4px 6px' }}>+ tag</span>
              </div>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <label style={{ display: 'flex', gap: 6, alignItems: 'center', fontFamily: K.fMono, fontSize: 10, color: K.kairos, letterSpacing: '0.08em' }}>
                  <div style={{ width: 14, height: 14, borderRadius: 4, border: `1px solid ${K.kairos}`, background: K.kairos, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: K.bg }}>✓</div>
                  TEACH STELLOQUY
                </label>
                <button style={{
                  fontFamily: K.fBody, fontSize: 12, color: K.bg, background: K.copperHi, border: 'none',
                  borderRadius: 8, padding: '8px 18px', fontWeight: 500,
                }}>Save entry</button>
              </div>
            </div>
          </Frame>

          {/* Today's check-ins (tracker as journaling, not its own tab) */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <Frame tone="umber" padding={20}>
              <Kicker color={K.ember}>How's the body today?</Kicker>
              <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
                {[
                  { l: 'energy',  v: 6, max: 10, tone: K.copper },
                  { l: 'sleep',   v: 7, max: 10, tone: K.sage   },
                  { l: 'mood',    v: 5, max: 10, tone: K.ember  },
                  { l: 'movement', v: 3, max: 5,  tone: K.brickHi },
                ].map(m => (
                  <div key={m.l}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 }}>
                      <span style={{ fontFamily: K.fMono, fontSize: 9.5, color: K.inkSoft, letterSpacing: '0.16em', textTransform: 'uppercase' }}>{m.l}</span>
                      <span style={{ fontFamily: K.fSerif, fontStyle: 'italic', fontSize: 14, color: K.ink }}>{m.v} <span style={{ color: K.inkSoft }}>/ {m.max}</span></span>
                    </div>
                    <div style={{ display: 'flex', gap: 2 }}>
                      {Array.from({ length: m.max }).map((_, i) => (
                        <div key={i} style={{ flex: 1, height: 8, borderRadius: 2, background: i < m.v ? m.tone : K.bg3, border: `1px solid ${i < m.v ? m.tone : K.line}` }} />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </Frame>

            <Frame tone="umber" padding={20}>
              <Kicker>30-day shape</Kicker>
              <div style={{ marginTop: 12 }}>
                <TrackerStrip />
              </div>
              <div style={{ marginTop: 10, display: 'flex', gap: 14, fontFamily: K.fMono, fontSize: 9, letterSpacing: '0.1em' }}>
                <span><span style={{ color: K.copper }}>■</span> <span style={{ color: K.inkDim }}>CRAFT</span></span>
                <span><span style={{ color: K.ember }}>■</span> <span style={{ color: K.inkDim }}>BODY</span></span>
                <span><span style={{ color: K.sage }}>■</span> <span style={{ color: K.inkDim }}>MOOD</span></span>
              </div>
            </Frame>
          </div>
        </div>

        {/* Bottom: recent entries + patterns */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <Frame tone="umber" padding={20}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 12 }}>
              <Kicker>Recent entries</Kicker>
              <div style={{ fontFamily: K.fMono, fontSize: 10, color: K.inkSoft }}>42 TOTAL · 14 TEACHING STELLOQUY</div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <EntryCard
                date="OCT 21 · TUE"
                title="The 5/1 catches the projection again"
                body="Got pulled into someone's plan today, said yes too fast. Frustration arrived ten minutes later, on cue. The body knew before I did."
                mood="frustration ⤓"
                sky="Waxing gibbous · ♏ Moon · Mercury Rx"
              />
              <EntryCard
                date="OCT 19 · SUN"
                title="Full Moon prep — what gets to leave"
                body="Three things I'm tired of carrying: the freelance gig that pays late, the gym I never go to, the way I apologize before asking. Naming them on paper feels like the first edit."
                mood="clear ↑"
                sky="Waxing gibbous · ♑ Moon"
                ritual
              />
              <EntryCard
                date="OCT 17 · FRI"
                title="The Saturn lesson finally landed"
                body="It's not about working harder. It's that I keep choosing structures that can't hold what I'm actually making."
                mood="settled ↑"
                sky="Waxing crescent · ♐ Moon"
              />
            </div>
          </Frame>

          <Frame tone="cocoa" padding={20} stars style={{ borderColor: K.kairos + '44' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 }}>
              <Kicker color={K.kairos}>Patterns Stelloquy is learning</Kicker>
              <div style={{ fontFamily: K.fMono, fontSize: 10, color: K.inkSoft }}>FROM YOUR ENTRIES · NEVER YOUR DATA</div>
            </div>
            <div style={{ fontFamily: K.fSerif, fontStyle: 'italic', fontSize: 18, color: K.ink, marginTop: 6, marginBottom: 4, lineHeight: 1.3 }}>
              What you keep teaching me about yourself.
            </div>
            <PatternRow
              pattern="Scorpio Moons make you ruthless about editing your calendar."
              count={9}
              confidence={4}
              tone={K.brickHi}
              evidence="3 of the last 4 entries during Scorpio transits mention 'cutting,' 'releasing,' or 'saying no.'"
            />
            <PatternRow
              pattern="Mercury squares your natal Sun → over-revising at work."
              count={6}
              confidence={3}
              tone={K.copper}
              evidence="6 entries during this transit cluster mention writing or re-writing 3+ versions."
            />
            <PatternRow
              pattern="Your sacral says no to morning runs after gibbous nights."
              count={11}
              confidence={5}
              tone={K.ember}
              evidence="Body energy logs drop 2.1 points on average the day after waxing gibbous moons."
            />
            <PatternRow
              pattern="Saturn returns make this Generator want to start projects."
              count={4}
              confidence={2}
              tone={K.sage}
              evidence="Small sample. 4 entries note 'new idea' or 'starting' during Saturn transits this year."
            />
            <div style={{ marginTop: 14, padding: 12, background: K.bg, border: `1px dashed ${K.kairos}55`, borderRadius: 8 }}>
              <div style={{ fontFamily: K.fSerif, fontStyle: 'italic', fontSize: 14, color: K.kairosHi, lineHeight: 1.4 }}>
                Want me to fold these into tomorrow's daily focus?
              </div>
              <div style={{ marginTop: 8, display: 'flex', gap: 8 }}>
                <button style={{ fontFamily: K.fBody, fontSize: 11.5, color: K.bg, background: K.kairos, border: 'none', borderRadius: 6, padding: '5px 12px', fontWeight: 500, boxShadow: `0 0 12px ${K.kairos}66` }}>Yes, weave them in</button>
                <button style={{ fontFamily: K.fBody, fontSize: 11.5, color: K.inkDim, background: 'transparent', border: `1px solid ${K.line}`, borderRadius: 6, padding: '5px 12px' }}>Keep private</button>
              </div>
            </div>
          </Frame>
        </div>
      </div>
    </Shell>
  );
}

Object.assign(window, { JournalArtboard });

})();

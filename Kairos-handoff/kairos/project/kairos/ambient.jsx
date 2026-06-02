(function(){
// Ambient Stelloquy — how the oracle lives everywhere, not as a tab. Brand canon.
const { K, GLYPH, MoonGlyph, StarField, EphemerisWheel, Kicker, Stat, Seal, Divider, Frame } = window;

function Orb({ size = 64, glow = true, kind = 'speaking' }) {
  const grads = {
    speaking:  `radial-gradient(circle at 50% 38%, #ffffff 0%, ${K.kairosHi} 14%, ${K.kairos} 42%, ${K.prism} 78%, transparent 100%)`,
    listening: `radial-gradient(circle at 50% 38%, #ffffff 0%, #a8f5ff 14%, ${K.prism} 45%, #1A6AE8 82%, transparent 100%)`,
    thinking:  `radial-gradient(circle at 50% 38%, #ffffff 0%, #ffd090 14%, ${K.chronos} 45%, #CC5500 82%, transparent 100%)`,
  };
  const tones = { speaking: K.kairos, listening: K.prism, thinking: K.chronos };
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: grads[kind],
      boxShadow: glow ? `0 0 ${size * 0.5}px ${tones[kind]}66, 0 0 ${size * 0.9}px ${tones[kind]}22` : 'none',
      flexShrink: 0,
    }} />
  );
}

function ChatBubble({ role, children, sky }) {
  const isUser = role === 'user';
  return (
    <div style={{ display: 'flex', flexDirection: isUser ? 'row-reverse' : 'row', gap: 12, alignItems: 'flex-start' }}>
      {!isUser && <Orb size={30} glow={false} kind="speaking" />}
      <div style={{
        maxWidth: '78%', padding: '14px 18px',
        background: isUser ? K.bg3 : `linear-gradient(160deg, ${K.bg2} 0%, ${K.bg3} 100%)`,
        border: `1px solid ${isUser ? K.line : K.kairos + '44'}`,
        borderRadius: isUser ? '16px 16px 4px 16px' : '4px 16px 16px 16px',
      }}>
        <div style={{ fontFamily: isUser ? K.fBody : K.fSerif, fontSize: 14.5, color: K.ink, lineHeight: 1.65, fontStyle: isUser ? 'normal' : 'italic' }}>
          {children}
        </div>
        {sky && <div style={{ fontFamily: K.fMono, fontSize: 9, color: K.prism, letterSpacing: '0.18em', marginTop: 10 }}>{sky}</div>}
      </div>
    </div>
  );
}

function AmbientArtboard() {
  return (
    <div style={{
      background: K.bg, color: K.ink, fontFamily: K.fBody,
      padding: 36, height: '100%', overflow: 'auto',
      display: 'flex', flexDirection: 'column', gap: 26,
      position: 'relative',
    }}>
      <div style={{ position: 'absolute', inset: '-10%', background: `radial-gradient(ellipse 50% 40% at 15% 10%, ${K.kairos}55 0%, transparent 60%)`, mixBlendMode: 'screen', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', inset: '-10%', background: `radial-gradient(ellipse 50% 40% at 85% 90%, ${K.prism}44 0%, transparent 60%)`, mixBlendMode: 'screen', pointerEvents: 'none' }} />

      <div style={{ position: 'relative' }}>
        <Kicker color={K.prism}>Stelloquy · ambient, never a tab</Kicker>
        <div style={{ fontFamily: K.fSerif, fontStyle: 'italic', fontSize: 42, color: K.ink, lineHeight: 1.05, marginTop: 8, textShadow: `0 0 80px ${K.kairos}55`, maxWidth: 820 }}>
          The voice lives in the margins of every page.
        </div>
        <div style={{ fontFamily: K.fBody, fontSize: 14.5, color: K.inkDim, marginTop: 12, maxWidth: 800, lineHeight: 1.65 }}>
          Instead of asking the user to navigate to "the AI tab," Stelloquy hovers as a small orb. It expands into a side drawer when needed, embeds inline as a question prompt where context warrants it, and remembers what you've journaled — never your secrets.
        </div>
      </div>

      <div style={{ position: 'relative', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
        {/* Resting orb (collapsed) */}
        <Frame tone="umber" padding={28}>
          <Kicker color={K.prism}>1 · Resting state</Kicker>
          <div style={{ fontFamily: K.fSerif, fontStyle: 'italic', fontSize: 22, color: K.ink, marginTop: 8, marginBottom: 20 }}>
            A breathing orb, bottom-right of every screen.
          </div>
          <div style={{
            position: 'relative', height: 200, borderRadius: 12,
            background: `linear-gradient(135deg, ${K.bg3} 0%, ${K.bg} 100%)`,
            border: `1px solid ${K.line}`, overflow: 'hidden',
          }}>
            <StarField count={20} seed={2} opacity={0.35} />
            <div style={{ position: 'absolute', top: 14, left: 14, fontFamily: K.fMono, fontSize: 9, color: K.inkSoft, letterSpacing: '0.18em' }}>YOUR SCREEN</div>
            {/* the floating bar */}
            <div style={{
              position: 'absolute', bottom: 16, right: 16,
              display: 'flex', alignItems: 'center', gap: 12,
              background: `linear-gradient(135deg, ${K.bg3}, ${K.bg2})`,
              border: `1px solid ${K.kairos}55`, borderRadius: 999,
              padding: '8px 18px 8px 8px',
              boxShadow: `0 12px 32px rgba(0,0,0,0.5), 0 0 0 1px ${K.kairos}22, 0 0 28px ${K.kairos}33`,
            }}>
              <Orb size={32} kind="speaking" glow={false} />
              <div>
                <div style={{ fontFamily: K.fDisplay, fontWeight: 500, fontSize: 11, color: K.ink, lineHeight: 1, letterSpacing: '0.24em' }}>STELLOQUY</div>
                <div style={{ fontFamily: K.fMono, fontSize: 8.5, color: K.inkSoft, letterSpacing: '0.18em', marginTop: 5 }}>⌘ K · ANYWHERE</div>
              </div>
            </div>
          </div>
          <div style={{ fontFamily: K.fBody, fontSize: 13, color: K.inkDim, marginTop: 16, lineHeight: 1.6 }}>
            Pulse-breathes when there's something new to notice (a station, a tight orb, a pattern just landed). Otherwise: quiet, available, not loud.
          </div>
        </Frame>

        {/* Three states */}
        <Frame tone="umber" padding={28}>
          <Kicker color={K.prism}>2 · Three states · three hues</Kicker>
          <div style={{ fontFamily: K.fSerif, fontStyle: 'italic', fontSize: 22, color: K.ink, marginTop: 8, marginBottom: 20 }}>
            Speaking · Listening · Thinking.
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16 }}>
            {[
              { kind: 'speaking',  label: 'SPEAKING',  tone: K.kairos,  note: 'violet → cyan\nactive response' },
              { kind: 'listening', label: 'LISTENING', tone: K.prism,   note: 'cyan → blue\nreceiving input' },
              { kind: 'thinking',  label: 'THINKING',  tone: K.chronos, note: 'amber → deep\nsynthesizing' },
            ].map(s => (
              <div key={s.kind} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
                <Orb size={68} kind={s.kind} />
                <div style={{ fontFamily: K.fMono, fontSize: 9, padding: '3px 10px', borderRadius: 100, border: `1px solid ${s.tone}55`, color: s.tone, letterSpacing: '0.18em' }}>{s.label}</div>
                <div style={{ fontFamily: K.fMono, fontSize: 8.5, color: K.inkFaint, letterSpacing: '0.14em', textAlign: 'center', whiteSpace: 'pre-line', lineHeight: 1.7 }}>{s.note}</div>
              </div>
            ))}
          </div>
        </Frame>
      </div>

      {/* Inline prompts */}
      <Frame tone="umber" padding={28} style={{ position: 'relative' }}>
        <Kicker color={K.prism}>3 · Inline prompts · the voice meets you where you are</Kicker>
        <div style={{ fontFamily: K.fSerif, fontStyle: 'italic', fontSize: 22, color: K.ink, marginTop: 8, marginBottom: 18 }}>
          Stelloquy's questions show up where the context already is.
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          {[
            { ctx: 'ON TODAY · NEXT TO MERCURY SQUARE',          q: 'Why is this transit landing hard today?',     tone: K.brickHi /* amethyst */ },
            { ctx: 'ON YEAR · OCTOBER MONTH BRIEF',              q: 'What does this month want me to release?',    tone: K.kairos },
            { ctx: 'ON SELF · NEXT TO YOUR GENERATOR TYPE',      q: 'Why do I keep starting things?',              tone: K.prism },
            { ctx: 'ON JOURNAL · AT END OF AN ENTRY',            q: 'What pattern is this entry teaching me?',     tone: K.chronos },
          ].map((p, i) => (
            <div key={i} style={{
              padding: 14, borderRadius: 10, background: K.bg3,
              border: `1px solid ${p.tone}33`, borderLeft: `3px solid ${p.tone}`,
            }}>
              <div style={{ fontFamily: K.fMono, fontSize: 8.5, color: p.tone, letterSpacing: '0.2em', marginBottom: 6 }}>{p.ctx}</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
                <div style={{ fontFamily: K.fSerif, fontStyle: 'italic', fontSize: 15, color: K.ink, flex: 1 }}>"{p.q}"</div>
                <span style={{ fontFamily: K.fMono, fontSize: 9.5, color: p.tone, letterSpacing: '0.18em', flexShrink: 0 }}>ASK →</span>
              </div>
            </div>
          ))}
        </div>
      </Frame>

      {/* Expanded conversation drawer */}
      <Frame tone="cocoa" padding={32} stars style={{ borderColor: K.kairos + '44' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
          <Kicker color={K.prism}>4 · Expanded conversation</Kicker>
          <div style={{ fontFamily: K.fMono, fontSize: 9.5, color: K.inkFaint, letterSpacing: '0.18em' }}>RIGHT-SIDE DRAWER · DOESN'T LEAVE THE PAGE</div>
        </div>
        <div style={{ fontFamily: K.fSerif, fontStyle: 'italic', fontSize: 26, color: K.ink, marginTop: 6, marginBottom: 24, textShadow: `0 0 40px ${K.kairos}44` }}>
          A reflective conversation with the data you've taught it.
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, maxWidth: 920 }}>
          <ChatBubble role="user">Why does Mercury square my Sun feel so heavy this time?</ChatBubble>
          <ChatBubble role="oracle" sky="MERCURY ☿ □ NATAL ☉ · 0.8° APPLYING · 11 PRIOR ENTRIES MATCH">
            You've journaled through this transit six times in 2026, and the pattern is consistent: you start over-revising at work and lose ninety minutes to the third draft. Last March you wrote, <span style={{ color: K.kairosHi, fontStyle: 'normal', fontFamily: K.fBody }}>"the right version is in the second draft, I just don't trust it yet."</span>
            <br /><br />
            What's the second draft saying right now that you're not letting it say?
          </ChatBubble>
          <ChatBubble role="user">It's saying the launch isn't ready and we should push.</ChatBubble>
          <ChatBubble role="oracle" sky="DRAWING FROM YOUR YEAR THEME · 'EDIT THE ROOM'">
            That's not a Mercury problem then. That's a courage problem. Mercury is just making it louder. Your Q4 theme is <span style={{ color: K.kairosHi, fontStyle: 'normal', fontFamily: K.fBody }}>edit the room before you furnish it</span> — pushing the launch is the room-edit your sacral has been gesturing at since the new moon.
            <br /><br />
            Would you like me to draft a one-paragraph note to your team that you can revise into your own words?
          </ChatBubble>
        </div>

        {/* Input */}
        <div style={{
          marginTop: 24, display: 'flex', alignItems: 'center', gap: 12,
          background: K.bg2, border: `1px solid ${K.kairos}55`, borderRadius: 12, padding: '12px 16px',
          boxShadow: `0 0 24px ${K.kairos}22`,
        }}>
          <Orb size={28} kind="listening" glow={false} />
          <div style={{ flex: 1, fontFamily: K.fSerif, fontSize: 15, color: K.inkDim, fontStyle: 'italic' }}>
            Ask, or just sit with it...
          </div>
          <div style={{ fontFamily: K.fMono, fontSize: 9.5, color: K.inkFaint, letterSpacing: '0.18em' }}>↵ TO SEND</div>
        </div>
      </Frame>

      {/* Footer principles */}
      <Frame tone="umber" padding={26}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 28 }}>
          {[
            ['Memory is opt-in.', 'Only entries you mark "teach Stelloquy" become part of the conversation. Everything else stays private.'],
            ['Context comes first.', 'Stelloquy always answers with your transits, your design, your year theme, and your prior writing — not a generic horoscope.'],
            ['The voice is a mirror.', 'It returns your patterns to you. It does not predict; it does not prescribe. It asks better questions.'],
          ].map(([h, b]) => (
            <div key={h}>
              <div style={{ fontFamily: K.fSerif, fontStyle: 'italic', fontSize: 19, color: K.kairosHi, lineHeight: 1.2 }}>{h}</div>
              <div style={{ fontFamily: K.fBody, fontSize: 12.5, color: K.inkDim, marginTop: 8, lineHeight: 1.6 }}>{b}</div>
            </div>
          ))}
        </div>
      </Frame>
    </div>
  );
}

Object.assign(window, { AmbientArtboard, Orb });

})();

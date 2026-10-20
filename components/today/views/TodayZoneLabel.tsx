import { K } from '@/components/almanac'

type ZoneId = 'me-today' | 'plan' | 'sky' | 'bigger-picture'

// TODO(stella): zone labels for Today v2 (Me today, Plan, Sky, Bigger picture).
const ZONE_LABEL: Record<ZoneId, string> = {
  'me-today': 'Me today',
  plan: 'Plan',
  sky: 'Sky',
  'bigger-picture': 'Bigger picture',
}

const ZONE_COLOR: Record<ZoneId, string> = {
  'me-today': K.kairos,
  plan: K.copper,
  sky: K.plum,
  'bigger-picture': K.ember,
}

export function TodayZoneLabel({ zone, primary }: { zone: ZoneId; primary?: boolean }) {
  return (
    <div
      style={{
        fontFamily: K.fMono,
        fontSize: 11,
        letterSpacing: '0.2em',
        textTransform: 'uppercase',
        color: ZONE_COLOR[zone],
        marginBottom: primary ? 14 : 12,
        fontWeight: primary ? 600 : 500,
      }}
    >
      {ZONE_LABEL[zone]}
      {primary ? ' · primary' : null}
    </div>
  )
}

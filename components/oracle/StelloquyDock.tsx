'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { BRAND } from '@/lib/brand'
import { K } from '@/components/almanac/tokens'
import { StelloquyOrb } from './StelloquyOrb'

/**
 * Resting-state Stelloquy dock — pill-shaped chrome with the orb and the
 * keyboard hint. Mounted globally in the authed layout so it appears on
 * every screen but the Oracle page itself (where the full chat lives).
 *
 * Phase 1.A: click navigates to /oracle for the existing chat experience.
 * Phase 1.B replaces the Link with a right-side drawer that opens in place
 * and wraps OracleChat without leaving the current page.
 */
export function StelloquyDock() {
  const pathname = usePathname()
  // Don't render on the Oracle page itself — chat is already on screen.
  if (pathname?.startsWith('/oracle')) return null

  return (
    <Link
      href="/oracle"
      aria-label={`Open ${BRAND.oracle}`}
      style={{
        position: 'fixed',
        bottom: 22,
        right: 22,
        zIndex: 40,
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        background: `linear-gradient(135deg, ${K.bg3}, ${K.bg2})`,
        border: `1px solid ${K.kairos}55`,
        borderRadius: 999,
        padding: '8px 18px 8px 8px',
        boxShadow: `0 12px 32px rgba(0,0,0,0.6), 0 0 0 1px ${K.kairos}22, 0 0 32px ${K.kairos}33`,
        textDecoration: 'none',
        color: K.ink,
        fontFamily: K.fBody,
      }}
    >
      <StelloquyOrb size={34} state="speaking" />
      <div>
        <div
          style={{
            fontFamily: K.fDisplay,
            fontSize: 11,
            lineHeight: 1,
            letterSpacing: '0.24em',
            fontWeight: 500,
            color: K.ink,
            textTransform: 'uppercase',
          }}
        >
          {BRAND.oracle}
        </div>
        <div
          style={{
            fontFamily: K.fMono,
            fontSize: 8.5,
            color: K.inkSoft,
            letterSpacing: '0.18em',
            marginTop: 5,
          }}
        >
          ASK · ANYWHERE
        </div>
      </div>
    </Link>
  )
}

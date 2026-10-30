'use client'

import { usePathname, useRouter } from 'next/navigation'
import { K } from '@/components/almanac/tokens'
import { useMobileNavOpen } from '@/components/app/MobileNavOpenContext'
import { useStelloquy } from './StelloquyProvider'

/** IA overlays: mobile top bar Stelloquy entry (md:hidden). */
export function StelloquyMobileHeaderButton() {
  const pathname = usePathname()
  const router = useRouter()
  const { mobileNavOpen } = useMobileNavOpen()
  const { toggleDrawer, hasOracleAccess, open } = useStelloquy()

  if (pathname?.startsWith('/oracle') || mobileNavOpen) return null

  return (
    <button
      type="button"
      onClick={hasOracleAccess ? toggleDrawer : () => router.push('/oracle')}
      aria-label="Open Stelloquy"
      aria-expanded={hasOracleAccess ? open : undefined}
      aria-controls={hasOracleAccess ? 'stelloquy-drawer' : undefined}
      className="kiaros-ia-focus-ring flex shrink-0 items-center justify-center md:hidden"
      style={{
        width: 40,
        height: 40,
        borderRadius: 12,
        border: `1px solid ${K.line}`,
        background: K.bg,
        color: K.starlight,
        fontSize: 18,
        lineHeight: 1,
        cursor: 'pointer',
      }}
    >
      ✦
    </button>
  )
}

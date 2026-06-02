'use client'

import { usePathname } from 'next/navigation'
import { useEffect } from 'react'
import { X } from 'lucide-react'
import { BRAND } from '@/lib/brand'
import { K } from '@/components/almanac/tokens'
import { OracleConversation } from './OracleConversation'
import { StelloquyOrb } from './StelloquyOrb'
import { useStelloquy } from './StelloquyProvider'

interface Props {
  /** Localized date string to pass into OracleChat's header. */
  today: string
}

/**
 * Global Stelloquy chrome — the resting dock + the right-side drawer + the
 * ⌘K shortcut. Mounted once in (app)/layout.tsx so the orb appears on every
 * authed screen.
 *
 * Drawer open/close state lives in StelloquyProvider so feature surfaces
 * (SkyBanner, ActiveTransits, AskOracleButton) can call `openWith(prompt)`
 * to drop a preseeded question into the drawer. OracleConversation consumes
 * the preseed on mount.
 */
export function StelloquyShell({ today }: Props) {
  const pathname = usePathname()
  const { open, closeDrawer: close, toggleDrawer: toggle } = useStelloquy()

  // ⌘K / Ctrl+K from anywhere. Skip when an input is focused so we don't
  // hijack the journal composer.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const isMod = e.metaKey || e.ctrlKey
      if (!isMod || e.key.toLowerCase() !== 'k') return
      const target = e.target as HTMLElement | null
      const tag = target?.tagName?.toLowerCase()
      const editable =
        tag === 'input' ||
        tag === 'textarea' ||
        (target?.isContentEditable ?? false)
      if (editable) return
      e.preventDefault()
      toggle()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [toggle])

  // Esc closes the drawer.
  useEffect(() => {
    if (!open) return
    function onEsc(e: KeyboardEvent) {
      if (e.key === 'Escape') close()
    }
    window.addEventListener('keydown', onEsc)
    return () => window.removeEventListener('keydown', onEsc)
  }, [open, close])

  // Lock body scroll while drawer open.
  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [open])

  // On the legacy /oracle page the full chat is already on screen — don't
  // duplicate the dock there.
  const showDock = !pathname?.startsWith('/oracle')

  return (
    <>
      {showDock ? (
        <button
          type="button"
          onClick={toggle}
          aria-label={`Open ${BRAND.oracle}`}
          aria-expanded={open}
          aria-controls="stelloquy-drawer"
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
            color: K.ink,
            fontFamily: K.fBody,
            cursor: 'pointer',
          }}
        >
          <StelloquyOrb size={34} state="speaking" />
          <div style={{ textAlign: 'left' }}>
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
              ⌘ K · ANYWHERE
            </div>
          </div>
        </button>
      ) : null}

      {open ? (
        <>
          <div
            onClick={close}
            aria-hidden="true"
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0,0,0,0.55)',
              backdropFilter: 'blur(2px)',
              zIndex: 60,
            }}
          />
          <aside
            id="stelloquy-drawer"
            role="dialog"
            aria-modal="true"
            aria-label={BRAND.oracle}
            style={{
              position: 'fixed',
              top: 0,
              right: 0,
              bottom: 0,
              width: 'min(560px, 100vw)',
              background: K.bg,
              borderLeft: `1px solid ${K.kairos}44`,
              boxShadow: `-24px 0 60px rgba(0,0,0,0.5)`,
              zIndex: 70,
              display: 'flex',
              flexDirection: 'column',
              color: K.ink,
              fontFamily: K.fBody,
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '14px 18px',
                borderBottom: `1px solid ${K.line}`,
                background: K.bg2,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <StelloquyOrb size={28} state="listening" />
                <div>
                  <div
                    style={{
                      fontFamily: K.fDisplay,
                      fontSize: 12,
                      letterSpacing: '0.24em',
                      color: K.ink,
                      textTransform: 'uppercase',
                    }}
                  >
                    {BRAND.oracle}
                  </div>
                  <div
                    style={{
                      fontFamily: K.fMono,
                      fontSize: 9,
                      color: K.inkSoft,
                      letterSpacing: '0.16em',
                      marginTop: 3,
                    }}
                  >
                    {today.toUpperCase()}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={close}
                aria-label="Close"
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  border: `1px solid ${K.line}`,
                  background: 'transparent',
                  color: K.inkDim,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <X size={14} />
              </button>
            </div>
            <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
              <OracleConversation className="flex min-h-0 flex-1 flex-col px-4 py-4" />
            </div>
          </aside>
        </>
      ) : null}
    </>
  )
}

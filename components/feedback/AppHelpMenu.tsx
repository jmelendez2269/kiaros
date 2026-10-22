'use client'

import { CircleHelp, MessageSquareText } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { K } from '@/components/almanac/tokens'
import { FeedbackModal } from './FeedbackModal'

export function AppHelpMenu({ collapsed }: { collapsed: boolean }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [feedbackOpen, setFeedbackOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!menuOpen) return
    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setMenuOpen(false)
      }
    }
    window.addEventListener('mousedown', onPointerDown)
    return () => window.removeEventListener('mousedown', onPointerDown)
  }, [menuOpen])

  return (
    <div ref={rootRef} style={{ position: 'relative' }}>
      <button
        type="button"
        onClick={() => setMenuOpen((open) => !open)}
        aria-expanded={menuOpen}
        aria-haspopup="menu"
        title="Help"
        aria-label="Help"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 44,
          height: 44,
          color: menuOpen ? K.ink : K.inkSoft,
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
        }}
      >
        <CircleHelp size={16} />
      </button>

      {menuOpen ? (
        <div
          role="menu"
          style={{
            position: 'absolute',
            bottom: 'calc(100% + 8px)',
            right: collapsed ? -8 : 0,
            minWidth: 200,
            borderRadius: 12,
            border: `1px solid ${K.line}`,
            background: K.bg,
            boxShadow: '0 16px 40px rgba(0,0,0,0.45)',
            padding: 6,
            zIndex: 50,
          }}
        >
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setMenuOpen(false)
              setFeedbackOpen(true)
            }}
            style={{
              display: 'flex',
              width: '100%',
              alignItems: 'center',
              gap: 10,
              padding: '10px 12px',
              borderRadius: 8,
              border: 'none',
              background: 'transparent',
              color: K.ink,
              fontFamily: K.fBody,
              fontSize: 14,
              cursor: 'pointer',
              textAlign: 'left',
            }}
          >
            <MessageSquareText size={15} aria-hidden="true" />
            Give feedback
          </button>
        </div>
      ) : null}

      <FeedbackModal open={feedbackOpen} onOpenChange={setFeedbackOpen} />
    </div>
  )
}

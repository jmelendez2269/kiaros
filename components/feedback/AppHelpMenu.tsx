'use client'

import { CircleHelp, MessageSquareText } from 'lucide-react'
import { useEffect, useRef, useState, type RefObject } from 'react'
import { createPortal } from 'react-dom'
import { K } from '@/components/almanac/tokens'
import { FeedbackModal } from './FeedbackModal'

export function AppHelpMenu({
  menuAnchorRef,
}: {
  menuAnchorRef: RefObject<HTMLDivElement | null>
}) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [feedbackOpen, setFeedbackOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!menuOpen) return
    function onPointerDown(event: MouseEvent) {
      const target = event.target as Node
      if (rootRef.current?.contains(target)) return
      if (menuRef.current?.contains(target)) return
      setMenuOpen(false)
    }
    window.addEventListener('mousedown', onPointerDown)
    return () => window.removeEventListener('mousedown', onPointerDown)
  }, [menuOpen])

  const menuPanel =
    menuOpen && menuAnchorRef.current
      ? createPortal(
          <div
            ref={menuRef}
            role="menu"
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              bottom: '100%',
              marginBottom: 8,
              boxSizing: 'border-box',
              width: 'auto',
              maxWidth: '100%',
              minWidth: 0,
              borderRadius: 12,
              border: `1px solid ${K.borderStrong}`,
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
                alignItems: 'flex-start',
                gap: 10,
                padding: '10px 12px',
                borderRadius: 8,
                border: 'none',
                background: 'transparent',
                color: K.ink,
                fontFamily: K.fBody,
                fontSize: 14,
                lineHeight: 1.45,
                cursor: 'pointer',
                textAlign: 'left',
                whiteSpace: 'normal',
                wordBreak: 'break-word',
                boxSizing: 'border-box',
              }}
            >
              <MessageSquareText size={15} aria-hidden="true" style={{ flexShrink: 0, marginTop: 2 }} />
              Give feedback
            </button>
          </div>,
          menuAnchorRef.current,
        )
      : null

  return (
    <>
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
      </div>
      {menuPanel}
      <FeedbackModal open={feedbackOpen} onOpenChange={setFeedbackOpen} />
    </>
  )
}

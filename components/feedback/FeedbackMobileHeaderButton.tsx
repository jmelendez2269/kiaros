'use client'

import { MessageSquare } from 'lucide-react'
import { K } from '@/components/almanac/tokens'
import { useFeedback } from './FeedbackProvider'

/** IA overlays: mobile top bar feedback entry (md:hidden). */
export function FeedbackMobileHeaderButton() {
  const { openFeedback } = useFeedback()

  return (
    <button
      type="button"
      onClick={openFeedback}
      aria-label="Give feedback"
      className="kiaros-ia-focus-ring flex shrink-0 items-center justify-center md:hidden"
      style={{
        width: 40,
        height: 40,
        borderRadius: 12,
        border: `1px solid ${K.line}`,
        background: K.bg,
        color: K.inkSoft,
        cursor: 'pointer',
      }}
    >
      <MessageSquare aria-hidden size={16} />
    </button>
  )
}

'use client'

import { useEffect, useRef, useState } from 'react'

interface Props {
  onSend: (text: string) => void
  isLoading: boolean
}

export function OracleInput({ onSend, isLoading }: Props) {
  const [input, setInput] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 120) + 'px'
  }, [input])

  function submit() {
    const text = input.trim()
    if (!text || isLoading) return
    setInput('')
    onSend(text)
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      submit()
    }
  }

  const charCount = input.length
  const overLimit = charCount > 500

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        submit()
      }}
      className="border-t border-border/80 pt-4"
    >
      <div className="flex items-end gap-3">
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask Stelloquy…"
          disabled={isLoading}
          rows={1}
          className="min-h-[44px] max-h-[120px] flex-1 resize-none rounded-xl border border-border/80 bg-stone-950/80 px-4 py-3 text-sm text-bone placeholder:text-bone-muted/40 focus:outline-none focus:ring-1 focus:ring-leather-400 disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={isLoading || !input.trim() || overLimit}
          className="shrink-0 rounded-xl border border-leather-400/50 bg-leather-500/35 px-4 py-3 text-sm font-medium text-bone shadow-glow transition-colors hover:bg-leather-500/45 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isLoading ? '...' : 'Send'}
        </button>
      </div>
      <div className="mt-1 flex items-center justify-between text-xs">
        <span className="text-bone-muted/30">Enter to send - Shift+Enter for newline</span>
        {charCount > 400 && (
          <span className={overLimit ? 'text-red-400' : 'text-bone-muted'}>{charCount}/500</span>
        )}
      </div>
    </form>
  )
}

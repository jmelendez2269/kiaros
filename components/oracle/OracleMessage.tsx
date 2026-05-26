'use client'

import { BookmarkPlus, Check, MessageSquarePlus, X } from 'lucide-react'
import { useRef, useState } from 'react'
import type { UIMessage } from 'ai'
import { StelloquyOrb } from './StelloquyOrb'

interface Props {
  message: UIMessage
  precedingUserText?: string
  onCapture?: (capture: {
    capturedText: string
    sourceMessageId: string
    sourceRole: 'user' | 'assistant' | 'system'
    sourceExcerpt: string
    includeInInsights: boolean
    includeInPlanner: boolean
  }) => Promise<void>
}

function extractText(message: UIMessage): string {
  const parts = (message as unknown as { parts?: Array<{ type: string; text?: string }> }).parts
  if (Array.isArray(parts)) {
    return parts
      .filter((p) => p.type === 'text' && typeof p.text === 'string')
      .map((p) => p.text as string)
      .join('')
  }
  const content = (message as unknown as { content?: unknown }).content
  return typeof content === 'string' ? content : ''
}

type CaptureMode = 'save' | 'insights' | 'planner' | 'both'

const CAPTURE_OPTIONS: Array<{ mode: CaptureMode; label: string; insights: boolean; planner: boolean }> = [
  { mode: 'save', label: 'Just save', insights: false, planner: false },
  { mode: 'insights', label: 'Insights', insights: true, planner: false },
  { mode: 'planner', label: 'Planner', insights: false, planner: true },
  { mode: 'both', label: 'Both', insights: true, planner: true },
]

function truncate(value: string, max = 800) {
  const normalized = value.replace(/\s+/g, ' ').trim()
  return normalized.length <= max ? normalized : `${normalized.slice(0, max - 1)}...`
}

function getHighlightedText(container: HTMLDivElement | null, fullText: string): string | null {
  const selection = window.getSelection()
  const selectedText = selection?.toString().trim()
  if (!selection || !selectedText || !container) return null

  const anchorInside = selection.anchorNode ? container.contains(selection.anchorNode) : false
  const focusInside = selection.focusNode ? container.contains(selection.focusNode) : false
  if (!anchorInside || !focusInside) return null

  return fullText.includes(selectedText) ? selectedText : null
}

export function OracleMessage({ message, precedingUserText, onCapture }: Props) {
  const isUser = message.role === 'user'
  const text = extractText(message)
  const textRef = useRef<HTMLDivElement>(null)
  const [selectedText, setSelectedText] = useState('')
  const [showCapturePanel, setShowCapturePanel] = useState(false)
  const [showExchangePanel, setShowExchangePanel] = useState(false)
  const [hint, setHint] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [savedMode, setSavedMode] = useState<CaptureMode | null>(null)
  const [savedKind, setSavedKind] = useState<'highlight' | 'exchange' | null>(null)

  function openCapturePanel() {
    const highlighted = getHighlightedText(textRef.current, text)
    if (!highlighted) {
      setShowCapturePanel(false)
      setHint('Highlight the words you want to capture, then click Capture.')
      return
    }

    setSelectedText(highlighted)
    setShowCapturePanel(true)
    setShowExchangePanel(false)
    setHint(null)
    setSavedMode(null)
    setSavedKind(null)
  }

  function openExchangePanel() {
    setShowExchangePanel(true)
    setShowCapturePanel(false)
    setHint(null)
    setSavedMode(null)
    setSavedKind(null)
  }

  async function saveCapture(option: (typeof CAPTURE_OPTIONS)[number]) {
    if (!onCapture || !selectedText || isSaving) return

    setIsSaving(true)
    setHint(null)
    try {
      await onCapture({
        capturedText: selectedText,
        sourceMessageId: message.id,
        sourceRole: message.role,
        sourceExcerpt: truncate(text),
        includeInInsights: option.insights,
        includeInPlanner: option.planner,
      })
      setSavedMode(option.mode)
      setSavedKind('highlight')
      setShowCapturePanel(false)
      window.getSelection()?.removeAllRanges()
    } catch (error) {
      setHint(error instanceof Error ? error.message : 'Capture could not be saved.')
    } finally {
      setIsSaving(false)
    }
  }

  async function saveExchange(option: (typeof CAPTURE_OPTIONS)[number]) {
    if (!onCapture || isSaving) return

    setIsSaving(true)
    setHint(null)
    try {
      await onCapture({
        capturedText: truncate(text, 4000),
        sourceMessageId: message.id,
        sourceRole: message.role,
        sourceExcerpt: truncate(precedingUserText ?? '', 800),
        includeInInsights: option.insights,
        includeInPlanner: option.planner,
      })
      setSavedMode(option.mode)
      setSavedKind('exchange')
      setShowExchangePanel(false)
    } catch (error) {
      setHint(error instanceof Error ? error.message : 'Exchange could not be saved.')
    } finally {
      setIsSaving(false)
    }
  }

  if (isUser) {
    return (
      <div className="flex justify-end">
        <div className="max-w-[80%] space-y-2">
          <div
            ref={textRef}
            className="whitespace-pre-wrap rounded-2xl rounded-tr-sm border border-leather-400/30 bg-leather-500/20 px-4 py-3 text-[15px] leading-7 text-bone"
          >
            {text}
          </div>
          {onCapture ? (
            <div className="flex flex-col items-end gap-2">
              <button
                type="button"
                onMouseDown={(event) => event.preventDefault()}
                onClick={openCapturePanel}
                title="Highlight the words you want to capture, then click Capture."
                className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border/70 bg-stone-950/70 px-2.5 text-[0.72rem] font-medium text-bone-muted transition-colors hover:border-leather-400/45 hover:text-bone"
              >
                <BookmarkPlus className="h-3.5 w-3.5" aria-hidden="true" />
                Capture
              </button>
              {hint ? <p className="max-w-xs text-right text-xs leading-5 text-bone-muted">{hint}</p> : null}
              {savedMode ? (
                <p className="inline-flex items-center gap-1.5 text-xs text-moss-100">
                  <Check className="h-3.5 w-3.5" aria-hidden="true" />
                  {savedKind === 'exchange' ? 'Exchange saved' : 'Captured'}
                </p>
              ) : null}
              {showCapturePanel ? (
                <div className="w-full max-w-md rounded-xl border border-border/80 bg-stone-950 px-3 py-3 shadow-glow">
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-xs leading-5 text-bone-muted">Save highlighted text for later, insights, planner context, or both.</p>
                    <button
                      type="button"
                      onClick={() => setShowCapturePanel(false)}
                      className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-border/70 text-bone-muted hover:text-bone"
                      aria-label="Close capture options"
                    >
                      <X className="h-3.5 w-3.5" aria-hidden="true" />
                    </button>
                  </div>
                  <p className="mt-2 line-clamp-3 text-xs leading-5 text-bone">"{truncate(selectedText, 180)}"</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {CAPTURE_OPTIONS.map((option) => (
                      <button
                        key={option.mode}
                        type="button"
                        disabled={isSaving}
                        onClick={() => saveCapture(option)}
                        className="rounded-lg border border-leather-400/35 bg-leather-500/16 px-3 py-1.5 text-xs font-medium text-bone transition-colors hover:bg-leather-500/24 disabled:opacity-50"
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    )
  }

  return (
    <div className="flex justify-start gap-2.5">
      <StelloquyOrb size={28} state="speaking" ariaLabel="Stelloquy" className="mt-5" />
      <div className="max-w-[85%] space-y-1">
        <p className="pl-1 text-[10px] uppercase tracking-widest text-bone-muted/40">Stelloquy</p>
        <div
          ref={textRef}
          className="whitespace-pre-wrap rounded-2xl rounded-tl-sm border border-border/80 bg-stone-950/80 px-4 py-3 text-[15px] leading-7 text-bone-muted"
        >
          {text}
        </div>
        {onCapture ? (
          <div className="flex flex-col items-start gap-2 pl-1">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onMouseDown={(event) => event.preventDefault()}
                onClick={openCapturePanel}
                title="Highlight the words you want to capture, then click Capture."
                className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border/70 bg-stone-950/70 px-2.5 text-[0.72rem] font-medium text-bone-muted transition-colors hover:border-leather-400/45 hover:text-bone"
              >
                <BookmarkPlus className="h-3.5 w-3.5" aria-hidden="true" />
                Capture
              </button>
              {precedingUserText ? (
                <button
                  type="button"
                  onClick={openExchangePanel}
                  title="Save your prompt and Stelloquy's full reply together."
                  className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border/70 bg-stone-950/70 px-2.5 text-[0.72rem] font-medium text-bone-muted transition-colors hover:border-leather-400/45 hover:text-bone"
                >
                  <MessageSquarePlus className="h-3.5 w-3.5" aria-hidden="true" />
                  Save exchange
                </button>
              ) : null}
            </div>
            {hint ? <p className="max-w-xs text-xs leading-5 text-bone-muted">{hint}</p> : null}
            {savedMode ? (
              <p className="inline-flex items-center gap-1.5 text-xs text-moss-100">
                <Check className="h-3.5 w-3.5" aria-hidden="true" />
                {savedKind === 'exchange' ? 'Exchange saved' : 'Captured'}
              </p>
            ) : null}
            {showExchangePanel ? (
              <div className="w-full max-w-md rounded-xl border border-border/80 bg-stone-950 px-3 py-3 shadow-glow">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-xs leading-5 text-bone-muted">Save your prompt and Stelloquy&apos;s full reply together — for later, insights, planner context, or both.</p>
                  <button
                    type="button"
                    onClick={() => setShowExchangePanel(false)}
                    className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-border/70 text-bone-muted hover:text-bone"
                    aria-label="Close exchange options"
                  >
                    <X className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                </div>
                <div className="mt-2 space-y-1.5 text-xs leading-5">
                  <p className="line-clamp-2 text-bone-muted">
                    <span className="uppercase tracking-widest text-bone-muted/60">You:</span> {truncate(precedingUserText ?? '', 160)}
                  </p>
                  <p className="line-clamp-3 text-bone">
                    <span className="uppercase tracking-widest text-bone-muted/60">Stelloquy:</span> {truncate(text, 220)}
                  </p>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {CAPTURE_OPTIONS.map((option) => (
                    <button
                      key={option.mode}
                      type="button"
                      disabled={isSaving}
                      onClick={() => saveExchange(option)}
                      className="rounded-lg border border-leather-400/35 bg-leather-500/16 px-3 py-1.5 text-xs font-medium text-bone transition-colors hover:bg-leather-500/24 disabled:opacity-50"
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
            {showCapturePanel ? (
              <div className="w-full max-w-md rounded-xl border border-border/80 bg-stone-950 px-3 py-3 shadow-glow">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-xs leading-5 text-bone-muted">Save highlighted text for later, insights, planner context, or both.</p>
                  <button
                    type="button"
                    onClick={() => setShowCapturePanel(false)}
                    className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-border/70 text-bone-muted hover:text-bone"
                    aria-label="Close capture options"
                  >
                    <X className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                </div>
                <p className="mt-2 line-clamp-3 text-xs leading-5 text-bone">"{truncate(selectedText, 180)}"</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {CAPTURE_OPTIONS.map((option) => (
                    <button
                      key={option.mode}
                      type="button"
                      disabled={isSaving}
                      onClick={() => saveCapture(option)}
                      className="rounded-lg border border-leather-400/35 bg-leather-500/16 px-3 py-1.5 text-xs font-medium text-bone transition-colors hover:bg-leather-500/24 disabled:opacity-50"
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  )
}

import type { ReactNode } from 'react'
import Link from 'next/link'
import { cn } from '@/lib/utils'

type NarrativeTone = 'leather' | 'plum' | 'moss' | 'ember'

const HIGHLIGHT_STYLES: Record<NarrativeTone, string> = {
  leather:
    'text-leather-200 bg-leather-500/16 ring-1 ring-inset ring-leather-300/20 shadow-[0_0_22px_hsl(var(--leather-500)/0.12)]',
  plum:
    'text-plum-300 bg-plum-400/16 ring-1 ring-inset ring-plum-300/20 shadow-[0_0_22px_hsl(var(--plum-400)/0.12)]',
  moss:
    'text-moss-200 bg-moss-500/16 ring-1 ring-inset ring-moss-300/20 shadow-[0_0_22px_hsl(var(--moss-500)/0.12)]',
  ember:
    'text-ember-300 bg-ember-400/16 ring-1 ring-inset ring-ember-300/20 shadow-[0_0_22px_hsl(var(--ember-400)/0.12)]',
}

const PATTERNS = [
  /\b(?:Your\s+)?(?:Aries|Taurus|Gemini|Cancer|Leo|Virgo|Libra|Scorpio|Sagittarius|Capricorn|Aquarius|Pisces)(?:\s+\w+){0,4}\s+in\s+House\s+\d{1,2}\b/gi,
  /\b(?:rare\s+)?(?:Aries|Taurus|Gemini|Cancer|Leo|Virgo|Libra|Scorpio|Sagittarius|Capricorn|Aquarius|Pisces)\s+stellium(?:\s+\w+){0,4}\b/gi,
  /\b(?:Sun|Moon|Mercury|Venus|Mars|Jupiter|Saturn|Uranus|Neptune|Pluto|transiting Pluto)(?:\s+\w+){0,6}\s+(?:conjunction|conjunct|conjoining|trine|trining|square|squaring|sextile|opposition|opposing)(?:\s+\w+){0,8}\b/gi,
]

const PLANET_NAME_RE = /\b(Sun|Moon|Mercury|Venus|Mars|Jupiter|Saturn|Uranus|Neptune|Pluto)\b/

function selfLinkFor(segmentText: string): string {
  const planetMatch = segmentText.match(PLANET_NAME_RE)
  if (planetMatch) return `/self#${planetMatch[1].toLowerCase()}`
  if (/house/i.test(segmentText)) return '/self#houses'
  return '/self#identity'
}

function collectMatches(text: string) {
  const matches: { start: number; end: number }[] = []

  for (const pattern of PATTERNS) {
    for (const match of text.matchAll(pattern)) {
      if (match.index === undefined) continue
      matches.push({ start: match.index, end: match.index + match[0].length })
    }
  }

  matches.sort((a, b) => a.start - b.start || b.end - a.end)

  const merged: { start: number; end: number }[] = []
  for (const match of matches) {
    const last = merged.at(-1)
    if (!last || match.start > last.end) {
      merged.push(match)
      continue
    }

    last.end = Math.max(last.end, match.end)
  }

  return merged
}

interface BlueprintNarrativeProps {
  text: string
  tone?: NarrativeTone
  className?: string
}

export function BlueprintNarrative({
  text,
  tone = 'leather',
  className,
}: BlueprintNarrativeProps) {
  const segments = collectMatches(text)

  if (segments.length === 0) {
    return <p className={cn('text-bone-muted/92', className)}>{text}</p>
  }

  const parts: ReactNode[] = []
  let cursor = 0

  segments.forEach((segment, index) => {
    if (segment.start > cursor) {
      parts.push(
        <span key={`plain-${index}`}>{text.slice(cursor, segment.start)}</span>
      )
    }

    const segmentText = text.slice(segment.start, segment.end)

    parts.push(
      <Link
        key={`highlight-${index}`}
        href={selfLinkFor(segmentText)}
        className={cn('inline rounded-full px-2 py-0.5 font-medium', HIGHLIGHT_STYLES[tone])}
      >
        {segmentText}
      </Link>
    )

    cursor = segment.end
  })

  if (cursor < text.length) {
    parts.push(<span key="plain-tail">{text.slice(cursor)}</span>)
  }

  return <p className={cn('text-bone-muted/92', className)}>{parts}</p>
}

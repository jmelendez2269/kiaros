import { cn } from '@/lib/utils'

type AccentTone = 'leather' | 'plum' | 'moss' | 'ember'

const TONE_STYLES: Record<AccentTone, { lead: string; chip: string }> = {
  leather: {
    lead: 'text-leather-200',
    chip: 'bg-leather-500/18 ring-1 ring-inset ring-leather-300/20 shadow-[0_0_24px_hsl(var(--leather-500)/0.14)]',
  },
  plum: {
    lead: 'text-plum-300',
    chip: 'bg-plum-400/18 ring-1 ring-inset ring-plum-300/20 shadow-[0_0_24px_hsl(var(--plum-400)/0.14)]',
  },
  moss: {
    lead: 'text-moss-200',
    chip: 'bg-moss-500/18 ring-1 ring-inset ring-moss-300/20 shadow-[0_0_24px_hsl(var(--moss-500)/0.14)]',
  },
  ember: {
    lead: 'text-ember-300',
    chip: 'bg-ember-400/18 ring-1 ring-inset ring-ember-300/20 shadow-[0_0_24px_hsl(var(--ember-400)/0.14)]',
  },
}

function normalize(text: string) {
  return text.replace(/\s+/g, ' ').trim()
}

function splitAccentText(text: string) {
  const normalized = normalize(text)
  if (!normalized) return { lead: '', rest: '' }

  const separators = [' — ', ': ', '; ', '. ']
  for (const separator of separators) {
    const index = normalized.indexOf(separator)
    if (index >= 18 && index <= 110) {
      return {
        lead: normalized.slice(0, index + (separator === '. ' ? 1 : separator.length)).trim(),
        rest: normalized.slice(index + separator.length).trim(),
      }
    }
  }

  const words = normalized.split(' ')
  if (words.length <= 9) return { lead: normalized, rest: '' }

  return {
    lead: words.slice(0, 7).join(' '),
    rest: words.slice(7).join(' '),
  }
}

interface AccentCopyProps {
  text: string
  tone?: AccentTone
  className?: string
  leadClassName?: string
  restClassName?: string
  markerClassName?: string
  showMarker?: boolean
}

export function AccentCopy({
  text,
  tone = 'leather',
  className,
  leadClassName,
  restClassName,
  markerClassName,
  showMarker = false,
}: AccentCopyProps) {
  const { lead, rest } = splitAccentText(text)
  const toneStyles = TONE_STYLES[tone]

  if (!lead) return null

  return (
    <span className={className}>
      <span
        className={cn(
          'font-medium',
          toneStyles.lead,
          showMarker && ['inline rounded-full px-2.5 py-0.5', toneStyles.chip, markerClassName],
          leadClassName
        )}
      >
        {lead}
      </span>
      {rest ? <span className={cn('text-bone-muted', restClassName)}> {rest}</span> : null}
    </span>
  )
}

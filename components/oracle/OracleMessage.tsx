import type { UIMessage } from 'ai'

interface Props {
  message: UIMessage
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

export function OracleMessage({ message }: Props) {
  const isUser = message.role === 'user'
  const text = extractText(message)

  if (isUser) {
    return (
      <div className="flex justify-end">
        <div className="max-w-[80%] rounded-2xl rounded-tr-sm border border-leather-400/30 bg-leather-500/20 px-4 py-2.5 text-sm text-bone">
          {text}
        </div>
      </div>
    )
  }

  return (
    <div className="flex justify-start">
      <div className="max-w-[85%] space-y-1">
        <p className="pl-1 text-[10px] uppercase tracking-widest text-bone-muted/40">Oracle</p>
        <div className="whitespace-pre-wrap rounded-2xl rounded-tl-sm border border-border/80 bg-stone-950/80 px-4 py-3 text-sm leading-relaxed text-bone-muted">
          {text}
        </div>
      </div>
    </div>
  )
}

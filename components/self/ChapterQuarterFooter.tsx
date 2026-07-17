import Link from 'next/link'

interface ChapterQuarterFooterProps {
  quarter: { number: number; theme: string } | null
}

export function ChapterQuarterFooter({ quarter }: ChapterQuarterFooterProps) {
  if (!quarter) return null

  return (
    <p className="mt-6 text-xs text-bone-muted/70">
      This quarter:{' '}
      <Link href={`/blueprint#q${quarter.number}`} className="text-leather-200 underline underline-offset-2">
        {quarter.theme}
      </Link>
    </p>
  )
}

import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { extractFromText, extractFromUrl, extractFromPdf } from '@/lib/plan-import/extract'
import { parsePlanFromText } from '@/lib/ai/plan-import-generator'

export const runtime = 'nodejs'
export const maxDuration = 60

const MAX_PDF_BYTES = 8_000_000

export async function POST(req: Request) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const form = await req.formData().catch(() => null)
  if (!form) return NextResponse.json({ error: 'Expected multipart/form-data' }, { status: 400 })

  const source = form.get('source')
  if (source !== 'text' && source !== 'url' && source !== 'pdf') {
    return NextResponse.json({ error: 'source must be text, url, or pdf' }, { status: 400 })
  }

  let extractedText: string
  try {
    if (source === 'text') {
      const content = form.get('content')
      if (typeof content !== 'string' || !content.trim()) {
        return NextResponse.json({ error: 'content is required for source=text' }, { status: 400 })
      }
      extractedText = extractFromText(content)
    } else if (source === 'url') {
      const content = form.get('content')
      if (typeof content !== 'string' || !content.trim()) {
        return NextResponse.json({ error: 'content (the URL) is required for source=url' }, { status: 400 })
      }
      extractedText = await extractFromUrl(content.trim())
    } else {
      const file = form.get('file')
      if (!(file instanceof File)) {
        return NextResponse.json({ error: 'file is required for source=pdf' }, { status: 400 })
      }
      if (file.size > MAX_PDF_BYTES) {
        return NextResponse.json({ error: 'PDF is too large (max 8MB).' }, { status: 400 })
      }
      const buffer = Buffer.from(await file.arrayBuffer())
      extractedText = await extractFromPdf(buffer)
    }
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Could not read that input' },
      { status: 400 }
    )
  }

  if (!extractedText.trim()) {
    return NextResponse.json({ error: 'No readable text found in that input.' }, { status: 400 })
  }

  try {
    const parsed = await parsePlanFromText(extractedText)
    return NextResponse.json(parsed)
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Could not parse a plan from that input' },
      { status: 500 }
    )
  }
}

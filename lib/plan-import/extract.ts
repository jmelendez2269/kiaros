import 'server-only'
import { lookup } from 'node:dns/promises'
import * as cheerio from 'cheerio'

const MAX_EXTRACTED_CHARS = 20_000
const URL_FETCH_TIMEOUT_MS = 10_000
const URL_MAX_BYTES = 2_000_000

function truncate(text: string): string {
  return text.trim().slice(0, MAX_EXTRACTED_CHARS)
}

export function extractFromText(raw: string): string {
  return truncate(raw)
}

export async function extractFromPdf(buffer: Buffer): Promise<string> {
  const { PDFParse } = await import('pdf-parse')
  const parser = new PDFParse({ data: buffer })
  try {
    const result = await parser.getText()
    return truncate(result.text)
  } finally {
    await parser.destroy()
  }
}

/** IPv4 octets for a resolved address, or null if not IPv4-shaped. */
function ipv4Octets(address: string): number[] | null {
  const match = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(address)
  if (!match) return null
  const octets = match.slice(1, 5).map(Number)
  return octets.every((n) => n >= 0 && n <= 255) ? octets : null
}

/** Basic SSRF guard: blocks loopback, private, link-local, and metadata-style ranges. */
function isBlockedAddress(address: string): boolean {
  const v4 = ipv4Octets(address)
  if (v4) {
    const [a, b] = v4
    if (a === 127) return true // loopback
    if (a === 10) return true // private
    if (a === 172 && b >= 16 && b <= 31) return true // private
    if (a === 192 && b === 168) return true // private
    if (a === 169 && b === 254) return true // link-local / cloud metadata
    if (a === 0) return true
    return false
  }
  const lower = address.toLowerCase()
  if (lower === '::1') return true // loopback
  if (lower.startsWith('fe80:')) return true // link-local
  if (lower.startsWith('fc') || lower.startsWith('fd')) return true // unique local
  return false
}

export async function extractFromUrl(rawUrl: string): Promise<string> {
  let parsed: URL
  try {
    parsed = new URL(rawUrl)
  } catch {
    throw new Error('That doesn’t look like a valid URL.')
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error('Only http/https URLs are supported.')
  }

  const { address } = await lookup(parsed.hostname)
  if (isBlockedAddress(address)) {
    throw new Error('That URL points to a restricted address and can’t be fetched.')
  }

  const res = await fetch(parsed.toString(), {
    signal: AbortSignal.timeout(URL_FETCH_TIMEOUT_MS),
    redirect: 'follow',
  })
  if (!res.ok) {
    throw new Error(`Could not fetch that URL (status ${res.status}).`)
  }

  const reader = res.body?.getReader()
  if (!reader) throw new Error('Could not read a response from that URL.')
  const chunks: Uint8Array[] = []
  let total = 0
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    if (value) {
      total += value.byteLength
      if (total > URL_MAX_BYTES) {
        await reader.cancel()
        throw new Error('That page is too large to import.')
      }
      chunks.push(value)
    }
  }
  const html = Buffer.concat(chunks.map((c) => Buffer.from(c))).toString('utf-8')

  const $ = cheerio.load(html)
  $('script, style, nav, footer, header, noscript, svg').remove()
  const text = $('body').text().replace(/[ \t]+/g, ' ').replace(/\n{2,}/g, '\n').trim()
  return truncate(text)
}

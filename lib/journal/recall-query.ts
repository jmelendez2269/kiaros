/**
 * Build OR-based search query from natural language questions for journal recall.
 * Transforms questions into search terms that websearch_to_tsquery will treat as OR.
 */

// Common English stopwords that add little semantic value for recall
const STOPWORDS = new Set([
  'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'for', 'from',
  'has', 'he', 'in', 'is', 'it', 'its', 'of', 'on', 'that', 'the',
  'to', 'was', 'will', 'with', 'i', 'my', 'me', 'do', 'have', 'this',
  'why', 'what', 'when', 'where', 'who', 'how', 'can', 'could', 'would',
])

const MAX_TERMS = 8
const MIN_TERM_LENGTH = 3

/**
 * Builds an OR query from a natural language question.
 * 
 * Process:
 * - Lowercases
 * - Strips punctuation and quotes
 * - Removes stopwords and terms under 3 characters
 * - Deduplicates
 * - Caps at 8 terms
 * - Joins with ' or ' (websearch_to_tsquery interprets this as OR)
 * 
 * Returns empty string when no meaningful terms remain.
 * 
 * Example:
 *   "Why do I keep feeling stuck at work this month?"
 *   → "feeling stuck work month"
 */
export function buildRecallQuery(question: string): string {
  if (!question.trim()) return ''

  // Lowercase and strip punctuation/quotes
  const cleaned = question
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')

  // Split, filter, dedupe, cap
  const terms = [...new Set(
    cleaned
      .split(/\s+/)
      .filter(term => 
        term.length >= MIN_TERM_LENGTH && 
        !STOPWORDS.has(term)
      )
  )].slice(0, MAX_TERMS)

  if (terms.length === 0) return ''

  // Join with ' or ' which websearch_to_tsquery treats as OR
  return terms.join(' or ')
}

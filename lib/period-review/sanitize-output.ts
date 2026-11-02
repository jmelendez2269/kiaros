/** Post-process model output for period reviews. */
export function sanitizePeriodReviewOutput(text: string): string {
  return text
    .trim()
    .replace(/&/g, 'and')
    .replace(/\u2014/g, ', ')
    .replace(/\u2013/g, ', ')
    .replace(/—/g, ', ')
    .replace(/–/g, ', ')
    .replace(/,\s*,/g, ',')
}

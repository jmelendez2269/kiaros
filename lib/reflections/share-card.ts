export function reflectionShareCard(title: string, selectedText: string): string {
  const escape = (value: string) => value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;')
  const words = selectedText.slice(0, 450).split(/\s+/).flatMap(word => word.match(/.{1,42}/gu) ?? [])
  const lines: string[] = []
  let line = ''
  for (const word of words) { if ((line + ' ' + word).length > 42) { lines.push(line); line = word } else line += (line ? ' ' : '') + word }
  if (line) lines.push(line)
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1080" viewBox="0 0 1080 1080"><rect width="1080" height="1080" fill="#191b20"/><circle cx="930" cy="100" r="180" fill="#bc8d65" opacity=".12"/><text x="90" y="140" fill="#cfa880" font-family="Georgia,serif" font-size="30">KAIROS · MY YEAR</text><text x="90" y="255" fill="#f2eadc" font-family="Georgia,serif" font-size="60">${escape(title)}</text>${lines.slice(0, 12).map((text, i) => `<text x="90" y="${365+i*44}" fill="#e7ddce" font-family="Georgia,serif" font-size="32">${escape(text)}</text>`).join('')}<text x="90" y="990" fill="#b5b0a7" font-family="sans-serif" font-size="22">A moment I chose to carry forward.</text></svg>`
}

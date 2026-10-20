/**
 * Plain-text extraction for guide verbatim checks (not user-facing).
 * Mirrors visible copy: headings, paragraphs, lists, blockquotes, link labels.
 */

function stripInlineMarkdown(line: string): string {
  let text = line;
  text = text.replace(/\*\*([^*]+)\*\*/g, "$1");
  text = text.replace(/\*([^*]+)\*/g, "$1");
  text = text.replace(/`([^`]+)`/g, "$1");
  text = text.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");
  return text;
}

export function guideBodyMarkdownToPlainText(bodyMarkdown: string): string {
  const lines = bodyMarkdown.split(/\r?\n/);
  const blocks: string[] = [];

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();
    const trimmed = line.trim();

    if (trimmed === "") {
      blocks.push("");
      continue;
    }

    const heading = /^(#{1,6})\s+(.*)$/.exec(trimmed);
    if (heading) {
      blocks.push(stripInlineMarkdown(heading[2]));
      continue;
    }

    const blockquote = /^>\s?(.*)$/.exec(trimmed);
    if (blockquote) {
      blocks.push(stripInlineMarkdown(blockquote[1]));
      continue;
    }

    const listItem = /^[-*]\s+(.*)$/.exec(trimmed);
    if (listItem) {
      blocks.push(stripInlineMarkdown(listItem[1]));
      continue;
    }

    blocks.push(stripInlineMarkdown(trimmed));
  }

  return blocks
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

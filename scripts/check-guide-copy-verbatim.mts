/**
 * Ensures guide body markdown on disk matches parsed body and plain-text extraction is stable.
 * Run: npx tsx scripts/check-guide-copy-verbatim.mts
 */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { guideBodyMarkdownToPlainText } from "../lib/marketing/guide-markdown-plain-text.ts";
import { loadAllGuideMarkdown } from "../lib/marketing/load-guide-markdown.ts";
import { getAllGuides, GUIDE_SLUGS, parseGuideMarkdown } from "../lib/marketing/guides.ts";

const bundledSources = loadAllGuideMarkdown();

let checks = 0;

for (const slug of GUIDE_SLUGS) {
  const guide = getAllGuides().find((item) => item.slug === slug);
  assert.ok(guide, `guide loaded: ${slug}`);

  const rawOnDisk = readFileSync(join("content", "guides", `${slug}.md`), "utf8");
  assert.equal(guide.sourceMarkdown, rawOnDisk, `${slug}: source markdown matches file on disk`);
  assert.equal(bundledSources[slug], rawOnDisk, `${slug}: guide source matches file on disk`);
  assert.equal(
    parseGuideMarkdown(bundledSources[slug], slug).bodyMarkdown,
    guide.bodyMarkdown,
    `${slug}: parsed source matches getAllGuides`,
  );
  checks += 3;

  const dividerIndex = rawOnDisk.indexOf("\n---\n");
  assert.notEqual(dividerIndex, -1, `${slug}: divider present`);
  const bodyFromDisk = rawOnDisk.slice(dividerIndex + "\n---\n".length).replace(/^\n+/, "");
  assert.equal(guide.bodyMarkdown, bodyFromDisk, `${slug}: body markdown matches post-divider file content`);
  checks += 1;

  const plain = guideBodyMarkdownToPlainText(guide.bodyMarkdown);
  assert.ok(plain.length > 500, `${slug}: plain text length sanity`);
  assert.ok(!plain.includes("**SEO title:**"), `${slug}: SEO header not in body plain text`);
  checks += 2;

  console.log(`OK ${slug} — ${plain.length} chars plain text, body ${guide.bodyMarkdown.length} chars markdown`);
}

console.log(`\nGuide verbatim copy check passed (${checks} assertions per guide).`);

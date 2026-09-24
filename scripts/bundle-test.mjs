#!/usr/bin/env node
/**
 * Bundle a test entry with esbuild to resolve path aliases
 */
import { build } from 'esbuild';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { tmpdir } from 'node:os';
import { mkdtemp, rm } from 'node:fs/promises';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '..');

const entryFile = process.argv[2];
if (!entryFile) {
  console.error('Usage: node scripts/bundle-test.mjs <entry-file>');
  process.exit(1);
}

const tempDir = await mkdtemp(join(tmpdir(), 'kiaros-test-'));
const outFile = join(tempDir, 'test-bundle.mjs');

try {
  await build({
    entryPoints: [entryFile],
    bundle: true,
    platform: 'node',
    format: 'esm',
    outfile: outFile,
    external: ['node:*'],
    alias: {
      '@': join(rootDir),
    },
  });

  console.log(`Bundled to ${outFile}`);
  console.log(outFile);
} catch (error) {
  console.error('Build failed:', error);
  await rm(tempDir, { recursive: true, force: true });
  process.exit(1);
}

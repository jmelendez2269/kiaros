#!/usr/bin/env node
/**
 * Bundle and run planner year access tests
 */
import { build } from 'esbuild';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { tmpdir } from 'node:os';
import { mkdtemp, rm } from 'node:fs/promises';
import { spawn } from 'node:child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '..');

const tempDir = await mkdtemp(join(tmpdir(), 'kiaros-test-'));
const outFile = join(tempDir, 'test-bundle.mjs');

try {
  await build({
    entryPoints: [join(__dirname, 'check-planner-year-access.mts')],
    bundle: true,
    platform: 'node',
    format: 'esm',
    outfile: outFile,
    external: ['node:*'],
    alias: {
      '@': rootDir,
    },
  });

  // Run the bundled test
  const child = spawn('node', [outFile], { stdio: 'inherit' });
  
  child.on('exit', async (code) => {
    await rm(tempDir, { recursive: true, force: true });
    process.exit(code ?? 0);
  });
} catch (error) {
  console.error('Build failed:', error);
  await rm(tempDir, { recursive: true, force: true });
  process.exit(1);
}

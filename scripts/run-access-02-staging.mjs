#!/usr/bin/env node
/**
 * Bundle and run the ACCESS-02 staging check against local Docker Supabase.
 *
 * check-access-02-staging.mts imports app code (lib/blueprint/load.ts), which
 * plain Node can't run: extensionless relative imports, `import 'server-only'`
 * (throws outside Next's react-server build) and React's `cache()` (not in the
 * project's React 18; Next ships its own React 19). Bundling with the same
 * substitutions Next makes gets it running.
 *
 * Usage: set -a && . ./.env.staging.local && set +a && npm run test:access-02-staging
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
    entryPoints: [join(__dirname, 'check-access-02-staging.mts')],
    bundle: true,
    platform: 'node',
    format: 'esm',
    outfile: outFile,
    external: ['node:*'],
    alias: {
      '@': rootDir,
      'server-only': join(rootDir, 'node_modules/next/dist/compiled/server-only/empty.js'),
      react: join(rootDir, 'node_modules/next/dist/compiled/react'),
    },
    // Bundled CommonJS dependencies still call require() at runtime.
    banner: { js: "import { createRequire } from 'node:module'; const require = createRequire(import.meta.url);" },
    logLevel: 'warning',
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

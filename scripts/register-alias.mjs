/**
 * Preload for running app code directly under Node.
 *
 * Two things Next.js does for us that plain Node does not:
 *   1. resolves the "@/..." path alias  -> alias-loader.mjs
 *   2. allows require() inside modules  -> the shim below, needed because
 *      lib/ephemeris/astronomia-adapter.ts pulls the VSOP87 data files in via
 *      require() (they are CommonJS default exports).
 *
 * Loaded with:  node --import ./scripts/register-alias.mjs ...
 */

import { createRequire, register } from "node:module";

register("./alias-loader.mjs", import.meta.url);

if (typeof globalThis.require === "undefined") {
  globalThis.require = createRequire(import.meta.url);
}

/**
 * Resolves the project's "@/..." path alias for scripts run directly through
 * Node's type stripping. Next.js/tsconfig handle this in the app build; plain
 * Node does not, so anything importing "@/types/..." fails without this.
 */

import { existsSync } from "node:fs";
import { dirname, resolve as resolvePath } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = resolvePath(dirname(fileURLToPath(import.meta.url)), "..");
const EXTENSIONS = [".ts", ".tsx", ".mts", ".js", ".mjs", ".json"];

export async function resolve(specifier, context, nextResolve) {
  if (!specifier.startsWith("@/")) return nextResolve(specifier, context);

  const base = resolvePath(ROOT, specifier.slice(2));
  const candidates = [
    base,
    ...EXTENSIONS.map((ext) => base + ext),
    ...EXTENSIONS.map((ext) => resolvePath(base, "index" + ext)),
  ];

  for (const candidate of candidates) {
    if (existsSync(candidate)) {
      return nextResolve(pathToFileURL(candidate).href, context);
    }
  }

  return nextResolve(specifier, context);
}

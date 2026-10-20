#!/usr/bin/env bash
# Smoke test for scripts/vercel-ignore-build.sh using a temporary git repo.
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
IGNORE_SCRIPT="$REPO_ROOT/scripts/vercel-ignore-build.sh"

tmpdir="$(mktemp -d)"
trap 'rm -rf "$tmpdir"' EXIT

cd "$tmpdir"
git init -q
git config user.email "test@kiaros.test"
git config user.name "Kiaros Test"

echo "initial" > README.md
mkdir -p docs content/guides app
echo "guide" > content/guides/seed.md
echo "page" > app/page.tsx
git add .
git commit -q -m "seed"

run_ignore() {
  local previous="$1" current="$2"
  VERCEL_GIT_PREVIOUS_SHA="$previous" VERCEL_GIT_COMMIT_SHA="$current" bash "$IGNORE_SCRIPT"
}

assert_exit() {
  local expected="$1"
  local label="$2"
  shift 2
  set +e
  "$@"
  local code=$?
  set -e
  if [[ "$code" -ne "$expected" ]]; then
    echo "FAIL: $label (expected exit $expected, got $code)" >&2
    exit 1
  fi
  echo "OK: $label (exit $code)"
}

# Docs-only change should skip (exit 0).
echo "docs tweak" >> docs/planning.md
git add docs/planning.md
git commit -q -m "docs only"
docs_sha="$(git rev-parse HEAD)"
docs_parent="$(git rev-parse HEAD~1)"
assert_exit 0 "docs-only diff skips" run_ignore "$docs_parent" "$docs_sha"

# content/guides/*.md is app content — must build (exit 1).
echo "updated guide" >> content/guides/seed.md
git add content/guides/seed.md
git commit -q -m "guide content"
guide_sha="$(git rev-parse HEAD)"
guide_parent="$(git rev-parse HEAD~1)"
assert_exit 1 "content/guides change builds" run_ignore "$guide_parent" "$guide_sha"

# app/ change must build (exit 1).
echo "// touch" >> app/page.tsx
git add app/page.tsx
git commit -q -m "app change"
app_sha="$(git rev-parse HEAD)"
app_parent="$(git rev-parse HEAD~1)"
assert_exit 1 "app/ change builds" run_ignore "$app_parent" "$app_sha"

# Missing previous SHA falls back to build (exit 1).
assert_exit 1 "missing VERCEL_GIT_PREVIOUS_SHA builds" env -u VERCEL_GIT_PREVIOUS_SHA VERCEL_GIT_COMMIT_SHA="$app_sha" bash "$IGNORE_SCRIPT"

echo "All vercel-ignore-build checks passed."

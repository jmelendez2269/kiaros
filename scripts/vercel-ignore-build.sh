#!/usr/bin/env bash
# Vercel Ignored Build Step for Kiaros.
# Configured via vercel.json "ignoreCommand".
#
# Exit 0 — skip build (docs-only changes).
# Exit 1 — proceed with build.

set -euo pipefail

log() {
  echo "[vercel-ignore-build] $*"
}

# Returns 0 when the path is a config file that must trigger a build.
is_config_file() {
  local file="$1"
  local base="${file##*/}"

  case "$file" in
    supabase/* | .github/*)
      return 0
      ;;
  esac

  case "$base" in
    package.json | package-lock.json | pnpm-lock.yaml | yarn.lock | bun.lock | bun.lockb)
      return 0
      ;;
    vercel.json | components.json | middleware.ts | middleware.js | next-env.d.ts | skills-lock.json)
      return 0
      ;;
    postcss.config.js | postcss.config.mjs | postcss.config.cjs)
      return 0
      ;;
    playwright.config.ts | playwright.config.js | vitest.config.ts | vitest.config.mts)
      return 0
      ;;
    jest.config.js | jest.config.ts | jest.config.mjs)
      return 0
      ;;
    .env | .env.* | .nvmrc | .node-version | .npmrc | .yarnrc | .yarnrc.yml)
      return 0
      ;;
    .eslintrc | .eslintrc.js | .eslintrc.json | .eslintrc.cjs)
      return 0
      ;;
    eslint.config.js | eslint.config.mjs | eslint.config.cjs)
      return 0
      ;;
    .prettierrc | .prettierrc.js | .prettierrc.json | .prettierrc.yaml | .prettierrc.yml)
      return 0
      ;;
    prettier.config.js | prettier.config.mjs | prettier.config.cjs)
      return 0
      ;;
  esac

  if [[ "$base" == next.config.* ]] || [[ "$base" == tailwind.config.* ]] || [[ "$base" == tsconfig*.json ]]; then
    return 0
  fi

  return 1
}

# Returns 0 when this file alone would justify skipping the build.
is_docs_only_path() {
  local file="$1"

  case "$file" in
    content/* | app/* | lib/* | components/* | public/*)
      return 1
      ;;
  esac

  if is_config_file "$file"; then
    return 1
  fi

  case "$file" in
    docs/*)
      return 0
      ;;
  esac

  if [[ "$file" != */* ]] && [[ "$file" == *.md ]]; then
    return 0
  fi

  return 1
}

resolve_git_ref() {
  local ref="$1"
  if git rev-parse --verify "${ref}^{commit}" >/dev/null 2>&1; then
    printf '%s' "$(git rev-parse "${ref}^{commit}")"
    return 0
  fi
  return 1
}

main() {
  local current_sha previous_sha
  current_sha="${VERCEL_GIT_COMMIT_SHA:-HEAD}"

  if ! current_sha="$(resolve_git_ref "$current_sha")"; then
    log "Cannot resolve current commit (${VERCEL_GIT_COMMIT_SHA:-HEAD}); building."
    exit 1
  fi

  previous_sha="${VERCEL_GIT_PREVIOUS_SHA:-}"
  if [[ -z "$previous_sha" ]]; then
    log "VERCEL_GIT_PREVIOUS_SHA is unset (first deploy or unknown); building."
    exit 1
  fi

  if ! previous_sha="$(resolve_git_ref "$previous_sha")"; then
    log "Cannot resolve VERCEL_GIT_PREVIOUS_SHA=${VERCEL_GIT_PREVIOUS_SHA}; building."
    exit 1
  fi

  local changed_files
  if ! changed_files="$(git diff --name-only "$previous_sha" "$current_sha" 2>/dev/null)"; then
    log "git diff failed (shallow clone or missing history); building."
    exit 1
  fi

  if [[ -z "$changed_files" ]]; then
    log "No changed files between ${previous_sha:0:7} and ${current_sha:0:7}; skipping."
    exit 0
  fi

  local file
  while IFS= read -r file; do
    [[ -z "$file" ]] && continue
    if ! is_docs_only_path "$file"; then
      log "Non-docs change detected: $file — building."
      exit 1
    fi
  done <<< "$changed_files"

  log "Only docs/markdown documentation changed; skipping build."
  exit 0
}

main "$@"

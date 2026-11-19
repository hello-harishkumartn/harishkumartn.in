#!/usr/bin/env bash
# Builds the RecallX static demo into site/projects/recallx/app/.
# Usage: demos/recallx/build.sh            (any cwd)
# Env:   REPO_URL to build from another clone. COMMIT to pin another commit.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SITE_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
REPO_URL="${REPO_URL:-https://github.com/hello-harishkumartn/enterprise-knowledge-ai}"
COMMIT="${COMMIT:-c9db77391736d2bb05802e856ccc4ae8e4c7b4bc}"
BASE_PATH="/projects/recallx/app"
DEST="$SITE_ROOT/site/projects/recallx/app"

WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT

echo "==> Fetching $REPO_URL at $COMMIT"
git -C "$WORK" init -q src
if ! git -C "$WORK/src" fetch -q --depth 1 "$REPO_URL" "$COMMIT" 2>/dev/null; then
  git -C "$WORK/src" fetch -q "$REPO_URL"
fi
git -C "$WORK/src" -c advice.detachedHead=false checkout -q "$COMMIT"

FRONTEND="$WORK/src/frontend"
echo "==> Applying overlay"
rm -f "$FRONTEND"/next.config.js "$FRONTEND"/next.config.mjs "$FRONTEND"/next.config.ts
cp -R "$SCRIPT_DIR/overlay/." "$FRONTEND/"

echo "==> npm ci"
(cd "$FRONTEND" && npm ci --no-audit --no-fund --loglevel=error)

echo "==> next build (static export)"
(cd "$FRONTEND" && NEXT_TELEMETRY_DISABLED=1 NODE_OPTIONS="${NODE_OPTIONS:---max-old-space-size=1536}" npx next build)

OUT="$FRONTEND/out"
[ -f "$OUT/index.html" ] || { echo "export failed: $OUT/index.html missing" >&2; exit 1; }

echo "==> Checking for backend URLs in the export"
# Next's own URL polyfill mentions "localhost" as a parse base. It never
# makes a request, so that one framework file is exempt from the localhost
# check (the other patterns still apply to it).
if grep -rlE '127\.0\.0\.1|:8000|NEXT_PUBLIC_API' "$OUT" \
  || grep -rl --exclude='polyfills-*.js' 'localhost' "$OUT"; then
  echo "backend URL found in export (files listed above)" >&2
  exit 1
fi
grep -q "$BASE_PATH/_next/" "$OUT/index.html" || { echo "basePath missing from index.html" >&2; exit 1; }

echo "==> Copying to $DEST"
rm -rf "$DEST"
mkdir -p "$DEST"
cp -R "$OUT/." "$DEST/"

# Repo rule: no .map files, binaries stored as <file>.b64 (decoded at deploy).
find "$DEST" -type f -name '*.map' -delete
rm -f "$DEST/.gitkeep"
find "$DEST" -type f \
  ! -name '*.html' ! -name '*.js' ! -name '*.css' ! -name '*.json' ! -name '*.txt' \
  ! -name '*.svg' ! -name '*.xml' ! -name '*.webmanifest' ! -name '*.ico' ! -name '*.b64' \
  -print0 | while IFS= read -r -d '' f; do
    base64 -w0 "$f" > "$f.b64"
    rm -f "$f"
  done

echo "==> Done: $(find "$DEST" -type f | wc -l) files, $(du -sh "$DEST" | cut -f1)"

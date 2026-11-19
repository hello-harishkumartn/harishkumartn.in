#!/usr/bin/env bash
# Builds the SentinelX (AIRE) incident console as a static export backed by recorded fixtures
# and writes it to site/projects/sentinelx/app/.
# Usage: demos/sentinelx/build.sh   (SENTINELX_REPO_URL may point at a local clone)
set -euo pipefail

REPO_URL="${SENTINELX_REPO_URL:-https://github.com/hello-harishkumartn/autonomous-incident-response}"
COMMIT="${SENTINELX_COMMIT:-7aa525f01f6cbe4e58d3269a740c5aecae9b2627}"

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$HERE/../.." && pwd)"
DEST="$ROOT/site/projects/sentinelx/app"
export NODE_OPTIONS="${NODE_OPTIONS:---max-old-space-size=1536}"
export NEXT_TELEMETRY_DISABLED=1

WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT

echo "==> Fetching $REPO_URL at $COMMIT"
git init -q "$WORK/src"
git -C "$WORK/src" remote add origin "$REPO_URL"
if ! git -C "$WORK/src" fetch -q --depth 1 origin "$COMMIT"; then
  git -C "$WORK/src" fetch -q origin
fi
git -C "$WORK/src" -c advice.detachedHead=false checkout -q "$COMMIT"

WEB="$WORK/src/frontend"
echo "==> Applying overlay"
cp -R "$HERE/overlay/." "$WEB/"

echo "==> Installing and building"
(cd "$WEB" && npm ci --no-audit --no-fund && npx next build)
test -f "$WEB/out/index.html"

echo "==> Checking for backend references"
# A bare "localhost" literal exists in the URL parser bundled by Next. It is not a request,
# so the check looks for URL shapes instead.
if grep -rlE '//localhost|localhost:[0-9]|127\.0\.0\.1|:8000|NEXT_PUBLIC_API' "$WEB/out"; then
  grep -rohE '.{0,60}(//localhost|localhost:[0-9]|127\.0\.0\.1|:8000|NEXT_PUBLIC_API).{0,60}' "$WEB/out" | sort -u | head -20 >&2
  echo "error: export still references a backend" >&2
  exit 1
fi

echo "==> Writing $DEST"
rm -rf "$DEST"
mkdir -p "$DEST"
cp -R "$WEB/out/." "$DEST/"
find "$DEST" -type f -name '*.map' -delete

# Repo rule: binaries are stored as <file>.b64 and decoded by the deploy workflow.
find "$DEST" -type f \
  ! -name '*.html' ! -name '*.js' ! -name '*.css' ! -name '*.json' ! -name '*.txt' \
  ! -name '*.svg' ! -name '*.xml' ! -name '*.webmanifest' ! -name '*.ico' ! -name '*.b64' \
  -print0 | while IFS= read -r -d '' f; do
    base64 -w0 "$f" > "$f.b64"
    rm "$f"
    echo "    encoded ${f#"$DEST"/}"
  done

echo "==> Done: $(du -sh "$DEST" | cut -f1) in $DEST"

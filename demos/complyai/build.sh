#!/usr/bin/env bash
# Build the complyai static demo into site/projects/complyai/app/.
# Clones the public repo at a pinned commit, applies overlay/ to the frontend,
# runs a static Next export and copies out/ into the site.
set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$HERE/../.." && pwd)"
REPO_URL="${REPO_URL:-https://github.com/hello-harishkumartn/agentic-compliance-auditor.git}"
COMMIT="c3a89bdadfa8a0a3a653487ee23bac7a5d525393"
DEST="$ROOT/site/projects/complyai/app"
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

FE="$WORK/src/frontend"
echo "==> Applying overlay"
cp -R "$HERE/overlay/." "$FE/"

echo "==> Installing and building"
cd "$FE"
npm ci --no-audit --no-fund
npx next build
test -f out/index.html

echo "==> Copying export to $DEST"
find out -type f -name '*.map' -delete
rm -rf "$DEST"
mkdir -p "$DEST"
cp -R out/. "$DEST/"

# Binary files are stored as base64 (.b64); the deploy workflow decodes them.
find "$DEST" -type f \
  ! -name '*.html' ! -name '*.js' ! -name '*.css' ! -name '*.json' ! -name '*.txt' \
  ! -name '*.svg' ! -name '*.map' ! -name '*.xml' ! -name '*.webmanifest' ! -name '*.ico' \
  ! -name '*.b64' -print0 |
  while IFS= read -r -d '' f; do
    base64 -w0 "$f" > "$f.b64"
    rm "$f"
  done

echo "==> Done: $(find "$DEST" -type f | wc -l) files, $(du -sh "$DEST" | cut -f1)"

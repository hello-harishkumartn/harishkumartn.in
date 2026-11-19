#!/usr/bin/env bash
# Builds the AgentPlane (multi-agent-control) console as a static export with
# recorded fixtures and writes it to site/projects/agentmesh/app/.
set -euo pipefail

REPO_URL="${AGENTMESH_REPO_URL:-https://github.com/hello-harishkumartn/multi-agent-control}"
COMMIT="${AGENTMESH_COMMIT:-9ebb41320ee37a4f90a36beb7dc0c8a2dd617400}"

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$HERE/../.." && pwd)"
DEST="$ROOT/site/projects/agentmesh/app"
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

WEB="$WORK/src/apps/web"
echo "==> Applying overlay"
cp -R "$HERE/overlay/." "$WEB/"

echo "==> Installing and building"
(cd "$WEB" && npm ci --no-audit --no-fund && npx next build)
test -f "$WEB/out/index.html"

echo "==> Checking for backend references"
# A bare "localhost" string also appears inside the bundled WHATWG URL parser, so
# match URLs and the original API settings rather than the word itself.
if grep -rlE 'https?://localhost|127\.0\.0\.1|:8000|NEXT_PUBLIC_API|INTERNAL_API|local-dev-key' "$WEB/out"; then
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

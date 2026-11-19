#!/usr/bin/env bash
# Builds the forgeloop static demo into site/projects/forgeloop/app/.
# Usage: demos/forgeloop/build.sh   (REPO_URL may point at a local clone)
set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$HERE/../.." && pwd)"
REPO_URL="${REPO_URL:-https://github.com/hello-harishkumartn/autonomous-agent-harness.git}"
COMMIT="254c1f73510b39c7c52d7afd0d8cc0d9875ce172"
DEST="$ROOT/site/projects/forgeloop/app"

WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT

echo "==> cloning $REPO_URL at $COMMIT"
git clone --quiet "$REPO_URL" "$WORK/src"
git -C "$WORK/src" -c advice.detachedHead=false checkout --quiet "$COMMIT"

WEB="$WORK/src/web"
echo "==> applying overlay"
cp -R "$HERE/overlay/." "$WEB/"

echo "==> installing and building"
cd "$WEB"
export NEXT_TELEMETRY_DISABLED=1
npm ci --no-audit --no-fund
npx next build

[ -f "$WEB/out/index.html" ] || { echo "export failed: out/index.html missing" >&2; exit 1; }

echo "==> copying export to $DEST"
rm -rf "$DEST"
mkdir -p "$DEST"
cp -R "$WEB/out/." "$DEST/"

# Source maps are not needed at runtime.
find "$DEST" -type f -name '*.map' -delete

# Repo rule: binary files are stored as <file>.b64 and decoded by the deploy workflow.
find "$DEST" -type f \
  ! -name '*.html' ! -name '*.js' ! -name '*.css' ! -name '*.json' ! -name '*.txt' \
  ! -name '*.svg' ! -name '*.xml' ! -name '*.webmanifest' ! -name '*.ico' ! -name '*.b64' \
  -print0 | while IFS= read -r -d '' f; do
    base64 -w0 "$f" > "$f.b64"
    rm -f "$f"
    echo "encoded ${f#"$DEST"/}"
  done

echo "==> done: $(du -sh "$DEST" | cut -f1) in $DEST"

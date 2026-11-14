#!/usr/bin/env bash
# Materialize the EGM redo file tree from the split archive on this branch.
# Run from anywhere; operates on the repo root. Does not push, merge or deploy.
# Does not modify site/life/ except if a listed deletion names a file there
# (the archive should never do that).
set -euo pipefail
root="$(cd "$(dirname "$0")/.." && pwd)"
cd "$root"
archive_dir="$root/egm-src"
if ! ls "$archive_dir"/egm-redo-delta.tgz.b64.part-* >/dev/null 2>&1; then
  echo "apply-egm-redo: missing $archive_dir/egm-redo-delta.tgz.b64.part-*" >&2
  exit 1
fi
if [[ -f "$archive_dir/deletions.txt" ]]; then
  while IFS= read -r path || [[ -n "$path" ]]; do
    [[ -z "$path" ]] && continue
    case "$path" in
      site/life/*)
        echo "apply-egm-redo: refusing to delete protected path $path" >&2
        exit 1
        ;;
    esac
    rm -f "$path"
  done < "$archive_dir/deletions.txt"
fi
tmp="$(mktemp)"
cat "$archive_dir"/egm-redo-delta.tgz.b64.part-* | base64 -d > "$tmp"
tar -xzf "$tmp"
rm -f "$tmp"
echo "apply-egm-redo: tree materialized. site/life/ left in place."

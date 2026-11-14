# EGM redo archive

This folder holds the full `egm-redo` file tree as a split base64 tarball, because
the GitHub connector used to publish this branch can send at most four file
contents per request and the redo adds more than 250 files (including large
binaries).

After a clone of the `egm-redo` branch, from the repo root run:

    ./scripts/apply-egm-redo.sh

That writes the Vite source under `web/`, the new `site/` build (without
touching `site/life/`) and the EGM design documents, and removes stale hashed
chunks listed in `deletions.txt`. It does not push, merge or deploy.

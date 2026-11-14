# harishkumartn.in

Personal site of Harish Kumar T N ("The Court").

`site/` holds the built static site. Binary assets are stored as `.b64` text and decoded by the
GitHub Actions workflow, which publishes the result to the `gh-pages` branch served by GitHub Pages.

## EGM redo branch

This `egm-redo` branch holds a source and performance redo of The Court, produced
with Google's Elephant-Goldfish Model. The full file tree (Vite source under
`web/`, a cleaned `site/` build and EGM design docs) is stored as a split
archive in `egm-src/`. After cloning this branch, run:

    ./scripts/apply-egm-redo.sh

That writes the new tree and removes stale hashed chunks. It does not touch
`site/life/`, and it does not merge, push or deploy. The live site stays on
`main` / `gh-pages` until the owner approves a merge.

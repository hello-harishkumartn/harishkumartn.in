## docs/designs/egm-redo.md

- Build configuration in `web/vite.config.ts`: Omitted manual `manualChunks` grouping for `vendor-three` and `vendor-rapier`, keeping Vite default dynamic chunking with `chunkSizeWarningLimit: 2600` instead of the specified 1200. Rollup cross-chunk dependency analysis grouped shared React runtime helpers and Framer Motion primitives into `vendor-rapier` when manually split, which forced `index.html` to inject a 3.2 MB `<link rel="modulepreload">` for Rapier on initial page load. Vite native dynamic import splitting isolates `react-three-rapier` (2.25 MB) and Three.js runtime chunks without preloading them in `index.html`.
- Cache pruning in `.github/workflows/deploy.yml`: The workflow runs targeted file deletion (`rm -f /tmp/rest/site/assets/*.js /tmp/rest/site/assets/*.css /tmp/rest/site/assets/*.map /tmp/rest/site/assets/*.woff2`) instead of removing the entire directory (`rm -rf /tmp/rest/site/assets`), preserving extracted binary media and 3D assets needed by `cp -rn`.
- Pre-sync and post-sync assertions in `web/scripts/sync-site.mjs`: Pre-sync verifies `web/dist/index.html` and `site/life/index.html` (generating `site/CNAME` dynamically) rather than asserting `web/dist/CNAME`. Post-sync validates `site/life/index.html`, `site/CNAME`, `site/.nojekyll` and preview paths, omitting verification of `site/life/vendor/lg-vendor.min.js`.

## web/src/components/EGM.md

- Side effects in `Nav.tsx`: Lists `[Nav.tsx:addEventListener]` for listening to scroll changes, whereas `Nav.tsx` uses Framer Motion `useMotionValueEvent(scrollY, 'change', ...)` alongside `IntersectionObserver`.
- Side effects in `HeroCanvas.tsx`: Omits global test hook assignment `[HeroCanvas.tsx:window.__r3f]` present in `HeroCanvas.tsx` line 104.

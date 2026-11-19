SentinelX demo: the AIRE incident console from autonomous-incident-response, exported as a static site that replays recorded runs of the repo's own simulator in the browser (approve / reject works in memory).
Rebuild with `demos/sentinelx/build.sh` (clones the pinned commit, applies overlay/, writes site/projects/sentinelx/app/).
Fixtures in overlay/lib/demo/fixtures.js come from `python tools/record_fixtures.py <repo>/backend overlay/lib/demo/fixtures.js`.

# Social hub

* **Author:** Harish Kumar T N
* **Date:** 2026-11-16
* **Status:** Draft spec, awaiting fresh-context review and the author's go-ahead
* **Brief:** One place on harishkumartn.in that shows Harish's professional side (LinkedIn and X) next to his personal side (Instagram and YouTube), with live feeds wherever the platforms allow it.

## Decisions (made by the author on 2026-11-16)

| Question | Decision |
|---|---|
| Backend and database | Cloudflare Workers with D1 (SQLite) and Cron Triggers. The site itself stays on GitHub Pages. |
| API address | The `*.workers.dev` URL for now. DNS stays at GoDaddy. A custom domain is a later one-line change. |
| X | Curated by hand in the admin page. No paid X API. |
| Instagram | Live. Harish switches `@harish_kumar_tn` to a Creator account. |
| LinkedIn | Curated by hand in the admin page. |
| Admin protection | Cloudflare Access (Google or email one-time code) in front of `/admin/*`. The Worker also verifies the Access JWT. |

## Revision 3: a password instead of Cloudflare Access (2026-11-17, overrides everything below)

Setting up Zero Trust was too much work for a one-person admin, so Cloudflare Access is dropped. Every mention of Access, the JWT, `ACCESS_TEAM_DOMAIN`, `ACCESS_AUD` and `ADMIN_EMAIL` below is replaced by this.

- **One secret, `ADMIN_PASSWORD`.** A random 32-character password set with `wrangler secret put`. Never in git. If it is missing or shorter than 24 characters every admin API call gets a 403 (fails closed).
- **The API is locked, the page shell is not.** `/admin/api/*` needs `Authorization: Bearer <password>`, compared in constant time (SHA-256 of both, then `timingSafeEqual`). A wrong or missing password gets a 401. `/admin` and `/admin/share` serve the static page with no data in it, so the Android share target can open it.
- **The page remembers the password.** The first visit shows a password box. The page keeps the password in `localStorage` on that device and sends it as the bearer header. A 401 clears it and shows the box again. A "Forget on this device" button clears it by hand.
- **Rate limit.** A Workers rate limit binding (`ADMIN_LIMITER`, 30 requests a minute per `CF-Connecting-IP`) runs before the password check on `/admin/api/*`. Over the limit gets a 429.
- **Kept:** admin writes still require `Origin` to be the Worker's own origin, `no-store` and the strict CSP.
- **Removed:** `src/access.ts`, the `jose` dependency, the Access vars and the `ADMIN_EMAIL` secret.
- **Trade-off accepted:** no second factor. Whoever has the password can add, hide or delete posts on the feed and nothing else. Rotating it is one `wrangler secret put`.

## Revision 2: Instagram is curated, sharing from Android (2026-11-16, overrides everything below)

Harish does not want a professional Instagram account, so the Instagram API is dropped.

- **Instagram is curated** like LinkedIn and X. Accepted links: `instagram.com/p/<code>`, `/reel/<code>`, `/reels/<code>`, `/tv/<code>` and the same with a `/<username>/` prefix. Canonical form `https://www.instagram.com/p/<code>/` (or `/reel/<code>/`). `/p/` is kind `image`, reels and tv are `video`. Category personal.
- **YouTube stays live.** A pasted YouTube link is refused with a message that YouTube syncs on its own (Sync now forces it).
- **Text is optional** for every curated post (still at most 3000 characters). Sharing should be one tap plus an optional note.
- **Phase 3 is now "share and preview"**, replacing Instagram ingestion. No Meta app, no token table use, no R2, no `/media` route. The `tokens` table stays in the schema unused; `/health` reports YouTube only.
- **Android share sheet.** A public `GET /manifest.webmanifest` (no secrets in it) makes the admin installable, with `scope` and `start_url` `/admin`, an SVG icon at `/icon.svg` and a Web Share Target: `GET /admin/share?title=&text=&url=`. `/admin/share` is behind Access like the rest of `/admin` and opens the admin page with the add form prefilled from the first `https://` link found in `url`, `text` or `title` (apps such as Instagram put the link in `text`). iPhone has no Web Share Target; on any device the admin page itself still works by pasting.
- **Click-to-load previews.** Each public post carries `embedUrl`, derived from its URL: `https://www.instagram.com/p/<code>/embed` (or `/reel/`), `https://www.linkedin.com/embed/feed/update/urn:li:<type>:<id>`, `https://www.youtube-nocookie.com/embed/<id>` for YouTube, and `null` for X. The frontend (phase 4) shows the note plus a "Show post" button and only loads the iframe on click.

## Revision after the fresh-context review (2026-11-16, overrides the rest of this doc where they differ)

- **Removals are safe (phase 2 and 3).** They run only after a 200 response that parses to at least one entry. A live post is deleted only after it is missing from 3 good runs in a row (`missing_runs` column). There are tests for a 404, an empty feed and malformed XML.
- **Query budget (phase 2 and 3).** Free plan invocations allow 50 D1 queries. Each platform writes all its rows in one `db.batch()`. A test counts the queries per cron run.
- **No edge cache on workers.dev.** The Cache API is a no-op there. `/feed` sends `Cache-Control: public, max-age=300` and `Vary: Origin` so browsers cache it.
- **Instagram images go to R2 (phase 3).** At sync time each new image is copied into an R2 bucket (free tier 10 GB) and served from `/media/:key`. This fixes expiring signed CDN links and avoids live hotlinking. Only `scontent*.cdninstagram.com` and `*.fbcdn.net` are fetched, only `image/*`, at most 5 MB. YouTube thumbnails load straight from `i.ytimg.com`. `/media` only serves keys that exist in R2.
- **Instagram token recovery (phase 3).** The admin page accepts a pasted token. The cron prefers the `INSTAGRAM_TOKEN` secret whenever it differs from the value the D1 copy was seeded from.
- **Access is path scoped.** The setup guide creates a self-hosted Access application with two paths, `/admin` and `/admin/*`, never the one-click option that protects the whole Worker. The Worker verifies the JWT signature against the team's certs and checks `iss` (team domain), `aud`, `exp` and the email. Admin writes also require `Origin` to be the Worker's own origin.
- **Kinds.** `reel` is dropped (Instagram Login cannot tell Reels apart). Kinds are `video`, `image`, `carousel` and `text`.
- **Frontend (phase 4).** `vite.config.ts` gets `build.rollupOptions.input` for both entries. `missingChunks()` in `sync-site.mjs` walks every HTML entry, with a test. The social entry must not import `Hero` or the scene registry, and the bundle is checked for three.js. The page has its own title, canonical and OG tags. The home section makes one `/feed` call.
- **D1 limits.** The free plan allows 500 MB per database, 5M rows read and 100k rows written a day. That is far above this workload.
- **YouTube RSS outages.** Users report intermittent 404 and 500 responses since May 2026. The safe-removal rule above covers this. The health route shows the last good sync.

## Platform facts this design rests on (checked 2026-11-16)

- **YouTube:** public channel RSS at `https://www.youtube.com/feeds/videos.xml?channel_id=<id>` needs no key and no approval. It returns the latest 15 videos.
- **Instagram:** the Basic Display API (personal accounts) is retired. The Instagram API with Instagram Login reads `GET /me/media` for Business and Creator accounts. Long-lived tokens last 60 days and can be refreshed while still valid.
- **X:** no free tier for new developers since February 2026. Pay per use only. Ruled out by decision.
- **LinkedIn:** `r_member_social` (reading a member's own posts) is a closed permission. No API path exists for a personal profile feed.

## The problem

The site links to four social profiles but shows none of their content. The "Social highlights" section holds three placeholder cards. Visitors cannot see what Harish posts without leaving the site and visiting four apps.

## Goals

1. A `/social/` page with two tabs: **Professional** (LinkedIn, X) and **Personal** (Instagram, YouTube). Newest first, with a platform filter inside each tab.
2. YouTube and Instagram update on their own within 30 minutes of a new post.
3. Harish can add a LinkedIn or X post in under 30 seconds from a private admin page, and hide or delete any post.
4. The home page "Highlights" section shows the latest 3 professional and the latest 3 personal posts and links to `/social/`. The placeholders are removed.
5. If the API is down, both pages still render: the profile links stay and the feed shows a short "feed unavailable" note.
6. Runs on the Cloudflare free tier. No API token ever reaches the browser or the repo.

## Non-goals

- Posting to any platform. The system only reads.
- Comments, likes or follower counts.
- Paid X API access.
- Moving DNS to Cloudflare.
- Analytics or tracking scripts. No third-party embed scripts (no `widgets.js`, no Instagram `embed.js`).

## Architecture

```
                 Cron every 30 min                      Cloudflare Access (Google / OTP)
                        │                                          │
YouTube RSS ───┐        ▼                                          ▼
               ├──► Worker "harish-social" ◄──── /admin (HTML) + /admin/api/* ◄── Harish
Instagram API ─┘        │  ▲
                        ▼  │
                   D1 database (posts, tokens, sync_runs)
                        │
            GET /feed, GET /media/:id  (public, cached, CORS for harishkumartn.in)
                        │
       harishkumartn.in/social/  and  #social section on the home page (GitHub Pages)
```

### Repository layout

- `api/` (new): the Worker package with its own `package.json`, `wrangler.toml`, `migrations/` and `test/`. TypeScript. It shares nothing with `web/` at runtime.
- `web/social/index.html` (new): a second Vite entry point. It reuses the site's React components, fonts and tokens. `sync-site.mjs` already copies new root entries from `dist/`.
- `web/src/social/` (new): the feed client, the types shared by the page and the home section, and the card components.

### Data model (D1)

```sql
CREATE TABLE posts (
  id            TEXT PRIMARY KEY,          -- "<platform>:<native id>"
  platform      TEXT NOT NULL CHECK (platform IN ('linkedin','x','instagram','youtube')),
  category      TEXT NOT NULL CHECK (category IN ('professional','personal')),
  source        TEXT NOT NULL CHECK (source IN ('live','curated')),
  url           TEXT NOT NULL,
  kind          TEXT NOT NULL CHECK (kind IN ('video','image','carousel','text')),
  title         TEXT,
  text          TEXT,
  media_url     TEXT,                      -- origin URL; browsers load it through /media/:id
  published_at  TEXT NOT NULL,             -- ISO 8601 UTC
  hidden        INTEGER NOT NULL DEFAULT 0,
  missing_runs  INTEGER NOT NULL DEFAULT 0,   -- good syncs in a row without this live post
  created_at    TEXT NOT NULL,
  updated_at    TEXT NOT NULL
);
CREATE INDEX posts_feed ON posts (category, hidden, published_at DESC);

CREATE TABLE tokens (platform TEXT PRIMARY KEY, access_token TEXT NOT NULL, expires_at TEXT NOT NULL, updated_at TEXT NOT NULL);

CREATE TABLE sync_runs (id INTEGER PRIMARY KEY AUTOINCREMENT, platform TEXT NOT NULL, started_at TEXT NOT NULL,
  finished_at TEXT, ok INTEGER, items INTEGER, error TEXT);
```

Category is fixed by platform: LinkedIn and X are professional, Instagram and YouTube are personal.

### Ingestion (Cron Trigger, every 30 minutes)

- **YouTube:** fetch the RSS feed for the channel id in `YOUTUBE_CHANNEL_ID`. Upsert every entry (title, description, thumbnail, published date). Shorts are kept and marked `kind = 'video'`.
- **Instagram:** read the token from `tokens` (seeded once from the `INSTAGRAM_TOKEN` secret). Call `GET https://graph.instagram.com/me/media?fields=id,caption,media_type,media_url,thumbnail_url,permalink,timestamp&limit=25` and upsert. If the token expires within 15 days, call `refresh_access_token` and store the new one. If the token is invalid or expired, record the failure in `sync_runs` and show a banner in the admin page.
- **Removals:** a live post that is inside the fetched window but missing from the response is deleted. Older posts are kept.
- **Isolation:** each platform runs in its own `try` block, so one failure never blocks the other. Every run writes a `sync_runs` row. Rows older than 30 days are pruned.

### Public API

| Route | Behaviour |
|---|---|
| `GET /feed?category=professional\|personal&platform=&limit=&before=` | Visible posts, newest first. `limit` defaults to 12 (max 50). `before` is an ISO date cursor. Response: `{ posts, next }`. Cached at the edge for 5 minutes. |
| `GET /media/:id` | Streams the post's image or thumbnail from its origin and caches it for 1 day. This avoids hotlink and expiry problems with Instagram's signed CDN URLs. Only URLs stored in D1 can be fetched, so it is not an open proxy. |
| `GET /health` | `{ ok, lastSync: { youtube, instagram } }` |

CORS allows `https://harishkumartn.in` and `http://localhost:5173`. Every other origin gets no CORS headers.

### Admin (Cloudflare Access protects `/admin*`)

- `GET /admin`: a small HTML page served by the Worker on the same origin, so there are no CORS or cookie problems. It lists posts, adds a curated post, hides or deletes posts, shows the latest sync status and runs a sync on demand.
- `POST /admin/api/posts` `{ url, text, published_at? }`: the platform and native id come from the URL. Accepted forms are `linkedin.com/posts/...`, `linkedin.com/feed/update/urn:li:(activity|share|ugcPost):<id>` and `x.com|twitter.com/<user>/status/<id>`. Anything else returns a 400. `published_at` defaults to now. Duplicates return a 409.
- `PATCH /admin/api/posts/:id` `{ hidden?, text? }` and `DELETE /admin/api/posts/:id`.
- `POST /admin/api/sync`: runs the same ingestion as the cron.
- Every `/admin*` request must carry a `Cf-Access-Jwt-Assertion` header. The Worker verifies it against the team's public keys, the `ACCESS_AUD` tag and the allowed email `ADMIN_EMAIL`. A request that skips Access (for example a direct call to the Worker) gets a 403.

### Frontend

- **Cards:** platform logo (from `brandIcons.ts`), date, text clipped to 5 lines, image through `/media/:id` and a "View on <platform>" link. YouTube cards load a `youtube-nocookie.com` player only after a click. Curated LinkedIn and X posts with no image render as text cards.
- **`/social/` page:** a header with the four profile links (the same data as the Contact section), the two tabs, filter chips and a "Load more" button that uses the `before` cursor. The URL keeps the state (`/social/?tab=personal&platform=youtube`).
- **Home `#social` section:** two columns (Professional, Personal), 3 posts each, and an "Open the full feed" link. It loads in the existing lazy section chunk and fetches only when the section nears the viewport.
- **Failure:** a 6 second timeout. On error it shows "The live feed is unavailable right now" with the profile links.
- **Config:** `site.socialApi` in `content.ts` holds the Worker URL.

## Security and privacy

- The secrets (`INSTAGRAM_TOKEN`) and the `ACCESS_AUD`/`ADMIN_EMAIL` settings are Worker secrets or vars. None are in git. The refreshed Instagram token lives only in D1.
- The public API is read-only. The admin needs Access plus a valid JWT.
- Curated text is stored as plain text and rendered by React (escaped). The admin page escapes output too.
- No visitor data is stored. No cookies on the public routes.
- The media proxy only fetches URLs already stored in D1.

## Costs

The Workers free tier (100,000 requests a day), D1 free (5 GB) and Cron Triggers are all free. Cloudflare Access is free for up to 50 users. Expected cost: $0.

## Steps only Harish can do (I will guide each one)

1. Create a free Cloudflare account and run `npx wrangler login` once.
2. Switch Instagram to a Creator account, create a Meta developer app with "Instagram API with Instagram login" and generate a token for `@harish_kumar_tn`.
3. Create the Cloudflare Access application for `/admin*` on the workers.dev hostname and allow only his email.
4. Approve each deploy. I will not run `wrangler deploy` or push without an explicit go-ahead.

## Delivery in phases

1. **API core:** `api/` scaffold, D1 migration, `/feed`, `/health`, admin routes with JWT checks, curated posts. Tests against a local D1.
2. **YouTube ingestion:** RSS parser plus cron.
3. **Instagram ingestion:** media sync, token refresh, `/media/:id`.
4. **Frontend:** `/social/` page, the new home section, failure states.
5. **Go-live:** the setup guide, deploy (with approval), then a browser smoke test against the live Worker.

## Tests

| Layer | What | Tool |
|---|---|---|
| Parsers | YouTube RSS fixture to posts, Instagram JSON fixture to posts, URL parser for LinkedIn and X (valid, invalid, tracking parameters) | Vitest |
| Worker plus D1 | migrations apply; `/feed` ordering, filters, cursor and hidden posts; CORS allow and deny; admin 403 without a JWT and with a wrong audience or email; curated add, 409 on duplicate, hide, delete; cron upsert and removal inside the window; Instagram token refresh at 15 days; one platform failing does not block the other | `@cloudflare/vitest-pool-workers` (runs in the real Workers runtime with a local D1) |
| Web | feed client timeout and error fallback; tab and filter URL state | `node:test` (the existing suite) |
| Browser | `/social/` and the home section against `wrangler dev` with seeded data, desktop and phone, no failed requests | the headless Chrome smoke script |

## Alternatives considered

- **GitHub Action writing `feed.json`:** simplest, but it has no admin page, no database and only hourly updates. Rejected by author.
- **Node server with Postgres:** more flexible, but about $5 to $15 a month plus patching. Rejected by author.
- **Official embeds (LinkedIn iframe, X `widgets.js`, Instagram `embed.js`):** they load third-party trackers and heavy scripts and look inconsistent. Rejected in favour of native cards.
- **Scraping LinkedIn or X:** against both platforms' terms and fragile. Rejected.

## Open issues

- **YouTube channel id:** the handle `@harishkumar_tn` must be resolved to a channel id (`UC...`) once.
- **Instagram Shorts or Reels with no thumbnail:** the card falls back to a plain video card.
- **Workers free tier CPU limit (10 ms per request):** fine for `/feed`. The media proxy streams without buffering. If the cron runs over the limit it may need batching.
- **Existing `SocialPost` placeholders in `content.ts`:** removed in phase 4. Their README section is rewritten.

## Drift report: phase 1 (2026-11-16, spec vs code in `api/`)

- **Test tooling.** `@cloudflare/vitest-pool-workers` is deprecated and renamed to `@cloudflare/vitest-plugin` (pinned at 1.4.12 with Vitest 4.1.12). Storage is not isolated per test in this version, so `test/apply-migrations.ts` empties the three tables before each test.
- **Pinned versions.** wrangler 4.156.1, jose 6.2.15 and the plugin are each at least two weeks old. The `esbuild` and `workerd` install scripts were left unapproved; the toolchain works without them.
- **Feed cursor.** `next` and `before` are `<published_at>~<id>`, not a bare ISO date, so posts that share a timestamp are never skipped. `category` is optional, so the home section can make one call.
- **Delete rules.** `DELETE` only works on curated posts. A live post returns 409 because the next sync would restore it, so it must be hidden instead. `PATCH text` is likewise curated only.
- **Small additions.** `/health` is cacheable for 60 seconds. The admin page sends a strict CSP and `no-store`. `published_at` may be at most 10 minutes in the future. The Worker refuses every admin request while `ACCESS_TEAM_DOMAIN` or `ACCESS_AUD` is empty.
- **Not yet built (later phases as planned).** Cron, YouTube and Instagram ingestion, R2 media, the token paste form and the frontend.

## Drift report: phase 2 (2026-11-16, spec vs code in `api/`)

- **Channel.** `YOUTUBE_CHANNEL_ID` is `UC1LVB92eIBvXml8xUFmm0HQ`, read from the canonical link of youtube.com/@harishkumar_tn. The channel has no public videos yet, so the live feed is valid but empty. The feed reports the id without its `UC` prefix, so the parser accepts both forms.
- **What counts as a good sync.** The review said removals need a response with at least one entry. That would leave a deleted last video in the feed forever, so instead a good sync is any complete feed for this channel, empty or not. HTTP errors, HTML error pages, another channel's feed, garbage and network errors all record a failed run and touch no posts.
- **Removal window.** The feed holds the newest 15 videos. With fewer than 15 entries the feed is the whole channel and every live YouTube post is in the window. With 15, only posts at least as new as the oldest fetched one are. A post is deleted after 3 good syncs in a row without it; one reappearance resets the count.
- **Parser.** Workers have no XML parser, so `src/youtube.ts` is a strict extractor for this Atom format with one-pass entity decoding. Bad entries are skipped. Thumbnails are rebuilt as `https://i.ytimg.com/vi/<id>/hqdefault.jpg` instead of trusting the feed.
- **Query budget.** A sync is one `db.batch()` of 5 statements (upsert through `json_each`, bump missing, delete, record the run, prune runs older than 30 days), well inside the 50 query limit. A test counts them.
- **Triggers.** Cron `*/30 * * * *` plus `POST /admin/api/sync` and a "Sync now" button on the admin page.
- **`ADMIN_EMAIL` is now a secret.** It was a plain var in `wrangler.jsonc`. It moves out of the repo and is set with `npx wrangler secret put ADMIN_EMAIL` at go-live. `src/secrets.d.ts` declares it, tests use `owner@example.com`, and `wrangler types` runs with `--strict-vars=false`.
- **Verified for real.** With `wrangler dev`, the scheduled handler fetched the live channel feed (ok, 0 items) and a seeded fake video was removed on the third run while a curated LinkedIn post stayed.

## Drift report: phase 3, share and preview (2026-11-16, revision 2 vs code in `api/`)

- **Instagram links.** `parseCuratedUrl` accepts `/p/`, `/reel/`, `/reels/` and `/tv/`, with or without a `/<username>/` prefix, and drops `igsh` and other tracking. `/reel/`, `/reels/` and `/tv/` all map to one id `reel:<code>`, so the same reel pasted two ways is a 409. Ids carry the type (`p:` or `reel:`) so the preview URL can be rebuilt.
- **Kinds.** Curated LinkedIn and X posts are `text`, Instagram posts `image` and reels `video`. A post that is really a carousel still shows as `image`; the preview shows the real thing.
- **Notes.** Optional everywhere. Missing, null or blank all store `null`, and an empty edit clears a note.
- **YouTube links** are refused with "YouTube videos are added automatically. Use Sync now if one is missing."
- **`embedUrl`** is computed on read by `embedUrlFor()` from the canonical URL, so no column was added. X gets `null`.
- **Share target.** Public `/manifest.webmanifest` and `/icon.svg` (an SVG shuttlecock, sizes `any`, also marked maskable). `/admin/share` serves the admin page behind Access; its script reuses `firstLink()` from `src/share.ts` by inlining `toString()`, so the page and the tests share one implementation. The admin CSP gained `img-src 'self'` and `manifest-src 'self'`.
- **Unused schema.** The `tokens` table from phase 1 stays but nothing uses it. `/health` reports YouTube only.
- **Test gap found and closed.** A shell quoting slip broke the share prefill while all 60 Worker tests still passed, because nothing ran the page's own script. The page was then checked in headless Chrome at phone size against a stub API: Instagram style share text, the add flow and a share with no link.
- **Not verified yet.** Installing on a real Android phone. Chrome accepts SVG manifest icons, but if the install option does not appear, PNG icons at 192 and 512 px are the fix. Checked at go-live.

## Drift report: phase 4, frontend (2026-11-16, spec vs code in `web/`)

- **Where things live.** `web/src/social/` holds `feed.ts` (pure client and URL state, tested with `node:test`), `PostCard`, `ProfileLinks`, `BrandIcon`, `SocialPage` and the `/social/` entry `main.tsx`. `web/social/index.html` is the second Vite entry with its own title, canonical and Open Graph tags. `vite.config.ts` lists both inputs.
- **No three.js on /social/.** The page loads 6 files (about 350 KB with React and the CSS) and none contain three.js, React Three Fiber or Rapier. It also skips framer-motion; cards are plain elements.
- **Config.** `social.api` in `content.ts` is empty until go-live; `VITE_SOCIAL_API` overrides it in development. With no API, both places show the profile links and make no request. The old `SocialPost` placeholders and types are gone, and the README describes the new flow.
- **Home section.** One `/feed?limit=24` call when the section comes within 600 px of the viewport, split into 3 per side by `splitHome`. If one side has fewer than 3 recent posts in those 24, it shows fewer.
- **Previews.** YouTube shows its i.ytimg.com thumbnail with a play button and loads `youtube-nocookie.com` with autoplay on click. Instagram and LinkedIn show a "Show post" button and load their embed on click (fixed heights of 540 and 480 px). X is a text card. Verified: no request leaves the site before a click, apart from YouTube thumbnails.
- **Sync.** `missingChunks()` walks every HTML entry the build owns (now `index.html` and `social/index.html`), skipping `life/` and `projects/`.
- **Bugs found in the browser, not by tests.** (1) The home section stayed on skeletons forever: its effect depended on the status it set, so React's cleanup aborted the fetch it had just started. Fixed by running the effect once and aborting only on unmount. Nothing in the Node suite renders React, so only the headless Chrome run caught it. (2) "Show post" stretched to the card width; now `w-fit`.
- **Checked in headless Chrome** against the real Worker with seeded posts, at 1366 and 390 px: both tabs, arrow key tab switching, platform filter, deep link restore, click-to-load, home columns, one feed call, no horizontal scroll, no failed requests or console errors. Also with the API down and with no API configured: both pages fall back to the four profile links.
- **Not done in this phase.** `site/` is not rebuilt, so the live site still shows the old Highlights placeholders until go-live sets `social.api` and runs `npm run build:all`.

## Drift report: revision 3, password admin (2026-11-17, revision 3 vs code in `api/`)

- **As specified.** `src/auth.ts` holds `requirePassword` (fail closed under 24 characters, rate limit, SHA-256 plus `timingSafeEqual`) and `requireSameOrigin`. `/admin/api/*` needs the bearer password; `/admin` and `/admin/share` serve the data-free page. `src/access.ts`, `jose` and the Access vars are gone; `ADMIN_PASSWORD` replaces `ADMIN_EMAIL` in `secrets.d.ts`.
- **Small additions.** Admin error responses (401, 403, 429) also carry `no-store`. When a share arrives while the page is locked the link is kept and the page asks for the password first. The tests give every call its own `CF-Connecting-IP` so the rate limit never spills between tests.
- **Tested.** 60 Worker tests, including the 401 cases (missing, wrong, prefix, longer, no scheme, Basic, empty), fail closed with a missing or short secret, and a 429 after 30 calls a minute from one address. A headless Chrome run against `wrangler dev` covered: locked first visit, wrong password, unlock, add a post, reload stays unlocked, share while unlocked, forget, share while locked then unlock. Every `/admin/api` request carried the header and the page threw no errors.

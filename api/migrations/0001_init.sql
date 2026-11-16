-- Social hub schema. See docs/egm/2026-11-16_social-hub.md.
CREATE TABLE posts (
  id            TEXT PRIMARY KEY,
  platform      TEXT NOT NULL CHECK (platform IN ('linkedin', 'x', 'instagram', 'youtube')),
  category      TEXT NOT NULL CHECK (category IN ('professional', 'personal')),
  source        TEXT NOT NULL CHECK (source IN ('live', 'curated')),
  url           TEXT NOT NULL,
  kind          TEXT NOT NULL CHECK (kind IN ('video', 'image', 'carousel', 'text')),
  title         TEXT,
  text          TEXT,
  media_url     TEXT,
  published_at  TEXT NOT NULL,
  hidden        INTEGER NOT NULL DEFAULT 0,
  missing_runs  INTEGER NOT NULL DEFAULT 0,
  created_at    TEXT NOT NULL,
  updated_at    TEXT NOT NULL
);
CREATE INDEX posts_feed ON posts (hidden, category, published_at DESC, id DESC);

CREATE TABLE tokens (
  platform      TEXT PRIMARY KEY,
  access_token  TEXT NOT NULL,
  seeded_from   TEXT,
  expires_at    TEXT NOT NULL,
  updated_at    TEXT NOT NULL
);

CREATE TABLE sync_runs (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  platform     TEXT NOT NULL,
  started_at   TEXT NOT NULL,
  finished_at  TEXT,
  ok           INTEGER,
  items        INTEGER,
  error        TEXT
);
CREATE INDEX sync_runs_latest ON sync_runs (platform, started_at DESC);

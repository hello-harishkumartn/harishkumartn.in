-- Automatic previews (docs/egm/2026-11-16_social-hub.md, revision 5). Images live in KV, not here.
ALTER TABLE posts ADD COLUMN caption TEXT;
ALTER TABLE posts ADD COLUMN preview_status TEXT NOT NULL DEFAULT 'none' CHECK (preview_status IN ('none', 'pending', 'ok', 'failed'));
ALTER TABLE posts ADD COLUMN preview_attempts INTEGER NOT NULL DEFAULT 0;
ALTER TABLE posts ADD COLUMN date_from_user INTEGER NOT NULL DEFAULT 0;

-- A date more than a minute away from the moment the post was added was typed in by Harish: never replace it.
UPDATE posts SET date_from_user = 1
  WHERE source = 'curated' AND abs(julianday(published_at) - julianday(created_at)) * 86400 > 60;
-- Backfill previews for every curated post already in the feed.
UPDATE posts SET preview_status = 'pending' WHERE source = 'curated';

CREATE INDEX posts_preview_queue ON posts (preview_status, preview_attempts) WHERE source = 'curated';

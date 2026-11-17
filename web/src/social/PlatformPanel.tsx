import { ArrowUpRight } from 'lucide-react';
import type { CSSProperties } from 'react';
import { contact } from '../content';
import { BrandIcon } from './BrandIcon';
import { PLATFORM_NAMES, type FeedPost, type Platform } from './feed';
import { PostCard, PostCardSkeleton } from './PostCard';

export interface PanelProps {
  platform: Platform;
  /** null while loading. */
  posts: FeedPost[] | null;
  failed?: boolean;
  skeletons: number;
  /** Heading level: h2 on the /social/ page, h3 inside the home section. */
  as?: 'h2' | 'h3';
  onLoadMore?: () => void;
  loadingMore?: boolean;
}

/** Each platform's tint, tuned to read on the dark background. Used for the glow, the icon tile and card hovers. */
export const BRAND_TINT: Record<Platform, string> = {
  linkedin: '#3a8ee6',
  x: '#d9dde1',
  instagram: '#e4407b',
  youtube: '#ff4545',
};

const EMPTY_INVITE: Record<Platform, { line: string; cta: string }> = {
  linkedin: { line: 'No posts shared here yet.', cta: 'Connect on LinkedIn' },
  x: { line: 'No posts shared here yet.', cta: 'Follow on X' },
  instagram: { line: 'No posts shared here yet.', cta: 'Follow on Instagram' },
  youtube: { line: 'No videos yet. The first one is on its way.', cta: 'Subscribe on YouTube' },
};

const profileUrl = (platform: Platform) => contact.links.find((l) => l.icon === platform)?.href;

/** One platform's posts, newest first, with a link to the profile. Used on the /social/ page and on home. */
export function PlatformPanel({ platform, posts, failed, skeletons, as: Heading = 'h2', onLoadMore, loadingMore }: PanelProps) {
  const name = PLATFORM_NAMES[platform];
  const profile = profileUrl(platform);
  const invite = EMPTY_INVITE[platform];

  return (
    <section
      id={platform}
      aria-labelledby={`panel-${platform}`}
      style={{ '--brand': BRAND_TINT[platform] } as CSSProperties}
      className="relative min-w-0 scroll-mt-6"
    >
      <div aria-hidden className="pointer-events-none absolute -left-10 -top-16 h-48 w-72 rounded-full bg-[var(--brand)] opacity-[0.13] blur-3xl" />
      <div className="relative flex items-center justify-between gap-3">
        <Heading id={`panel-${platform}`} className="flex items-center gap-3 font-display text-2xl font-semibold">
          <span className="grid size-10 place-items-center rounded-xl border border-[color-mix(in_oklab,var(--brand)_35%,transparent)] bg-[color-mix(in_oklab,var(--brand)_14%,transparent)]">
            <BrandIcon name={platform} className="size-5 text-[var(--brand)]" />
          </span>
          {name}
        </Heading>
        {profile && (
          <a
            href={profile}
            target="_blank"
            rel="noreferrer"
            className="inline-flex min-h-11 cursor-pointer items-center gap-1 rounded-full px-3 text-sm text-muted-foreground transition-colors hover:bg-white/[0.04] hover:text-foreground"
          >
            Profile <ArrowUpRight className="size-3.5" aria-hidden />
            <span className="sr-only">: {name} (opens in a new tab)</span>
          </a>
        )}
      </div>

      <div className="relative mt-5 grid gap-5" aria-busy={posts === null && !failed}>
        {failed ? (
          <p className="rounded-3xl border border-dashed border-white/10 p-6 text-muted-foreground">Couldn't load {name} posts right now.</p>
        ) : posts === null ? (
          Array.from({ length: skeletons }, (_, i) => <PostCardSkeleton key={i} />)
        ) : posts.length ? (
          posts.map((p, i) => <PostCard key={p.id} post={p} index={i} />)
        ) : (
          <div className="feed-in flex flex-col items-start gap-4 rounded-3xl border border-dashed border-[color-mix(in_oklab,var(--brand)_30%,transparent)] bg-[color-mix(in_oklab,var(--brand)_5%,transparent)] p-6">
            <BrandIcon name={platform} className="size-9 text-[var(--brand)] opacity-80" />
            <p className="text-muted-foreground">{invite.line}</p>
            {profile && (
              <a
                href={profile}
                target="_blank"
                rel="noreferrer"
                className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-full bg-[var(--brand)] px-5 text-sm font-medium text-black transition-transform duration-200 hover:-translate-y-0.5"
              >
                {invite.cta} <ArrowUpRight className="size-4" aria-hidden />
                <span className="sr-only"> (opens in a new tab)</span>
              </a>
            )}
          </div>
        )}
      </div>

      {onLoadMore && (
        <button
          type="button"
          onClick={onLoadMore}
          disabled={loadingMore}
          className="relative mt-5 inline-flex min-h-11 cursor-pointer items-center rounded-full border border-white/10 px-5 text-sm transition-colors duration-200 hover:border-[color-mix(in_oklab,var(--brand)_50%,transparent)] hover:text-foreground disabled:cursor-wait disabled:opacity-60"
        >
          {loadingMore ? 'Loading...' : `More from ${name}`}
        </button>
      )}
    </section>
  );
}

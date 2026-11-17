import { ArrowUpRight } from 'lucide-react';
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

const profileUrl = (platform: Platform) => contact.links.find((l) => l.icon === platform)?.href;

/** One platform's posts, newest first, with a link to the profile. Used on the /social/ page and on home. */
export function PlatformPanel({ platform, posts, failed, skeletons, as: Heading = 'h2', onLoadMore, loadingMore }: PanelProps) {
  const name = PLATFORM_NAMES[platform];
  const profile = profileUrl(platform);
  const note = (text: string) => <p className="rounded-3xl border border-dashed border-white/10 p-6 text-muted-foreground">{text}</p>;

  return (
    <section id={platform} aria-labelledby={`panel-${platform}`} className="min-w-0 scroll-mt-6">
      <div className="flex items-center justify-between gap-3">
        <Heading id={`panel-${platform}`} className="flex items-center gap-2.5 font-display text-2xl font-semibold">
          <BrandIcon name={platform} className="size-5 text-primary" />
          {name}
        </Heading>
        {profile && (
          <a
            href={profile}
            target="_blank"
            rel="noreferrer"
            className="inline-flex min-h-11 cursor-pointer items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-primary"
          >
            Profile <ArrowUpRight className="size-3.5" aria-hidden />
            <span className="sr-only">: {name} (opens in a new tab)</span>
          </a>
        )}
      </div>
      <div className="mt-4 grid gap-4" aria-busy={posts === null && !failed}>
        {failed
          ? note(`Couldn't load ${name} posts right now.`)
          : posts === null
            ? Array.from({ length: skeletons }, (_, i) => <PostCardSkeleton key={i} />)
            : posts.length
              ? posts.map((p) => <PostCard key={p.id} post={p} />)
              : note('Nothing here yet.')}
      </div>
      {onLoadMore && (
        <button
          type="button"
          onClick={onLoadMore}
          disabled={loadingMore}
          className="mt-4 inline-flex min-h-11 cursor-pointer items-center rounded-full border border-white/10 px-5 text-sm transition-colors duration-200 hover:border-primary/40 hover:text-primary disabled:cursor-wait disabled:opacity-60"
        >
          {loadingMore ? 'Loading...' : `More from ${name}`}
        </button>
      )}
    </section>
  );
}

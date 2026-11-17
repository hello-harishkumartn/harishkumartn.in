import { ArrowLeft } from 'lucide-react';
import { useEffect, useState } from 'react';
import { site, social } from '../content';
import { SOCIAL_API } from './config';
import { fetchFeed, PLATFORM_ORDER, type FeedPost, type Platform } from './feed';
import { PlatformPanel } from './PlatformPanel';

const PAGE_SIZE = 6;

interface Panel {
  posts: FeedPost[] | null;
  next: string | null;
  status: 'loading' | 'ready' | 'error' | 'more';
}

const initial = () => Object.fromEntries(PLATFORM_ORDER.map((p) => [p, { posts: null, next: null, status: 'loading' }])) as Record<Platform, Panel>;

/** /social/: every platform on one screen, one panel each. Each panel loads and pages on its own. */
export function SocialPage() {
  const [panels, setPanels] = useState<Record<Platform, Panel>>(initial);
  const update = (platform: Platform, change: (p: Panel) => Panel) => setPanels((all) => ({ ...all, [platform]: change(all[platform]) }));

  useEffect(() => {
    const controller = new AbortController();
    for (const platform of PLATFORM_ORDER) {
      fetchFeed(SOCIAL_API, { platform, limit: PAGE_SIZE }, { signal: controller.signal })
        .then(({ posts, next }) => update(platform, () => ({ posts, next, status: 'ready' })))
        .catch(() => { if (!controller.signal.aborted) update(platform, () => ({ posts: null, next: null, status: 'error' })); });
    }
    return () => controller.abort();
  }, []);

  const loadMore = (platform: Platform) => {
    const before = panels[platform].next;
    if (!before) return;
    update(platform, (p) => ({ ...p, status: 'more' }));
    fetchFeed(SOCIAL_API, { platform, limit: PAGE_SIZE, before })
      .then(({ posts, next }) => update(platform, (p) => ({ posts: [...(p.posts ?? []), ...posts], next, status: 'ready' })))
      .catch(() => update(platform, (p) => ({ ...p, status: 'ready' })));
  };

  return (
    <>
      <a className="skip-link" href="#feed">Skip to the feed</a>
      <main className="mx-auto max-w-6xl px-[max(1.25rem,env(safe-area-inset-left))] pb-24 pt-10 md:px-10 md:pt-16">
        <a href={import.meta.env.BASE_URL} className="inline-flex min-h-11 cursor-pointer items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-primary">
          <ArrowLeft className="size-4" aria-hidden /> {site.domain}
        </a>
        <p className="mt-8 flex items-center gap-3 font-mono text-xs uppercase tracking-[0.3em] text-primary">
          <span className="h-px w-8 bg-primary/60" aria-hidden /> Social
        </p>
        <h1 className="mt-4 max-w-3xl text-balance font-display text-4xl font-semibold leading-[1.05] tracking-[-0.03em] md:text-6xl">{social.page.title}</h1>
        <p className="mt-5 max-w-2xl text-pretty text-lg leading-relaxed text-muted-foreground">{social.page.intro}</p>

        <div id="feed" tabIndex={-1} className="mt-12 grid items-start gap-x-8 gap-y-12 scroll-mt-6 md:grid-cols-2">
          {PLATFORM_ORDER.map((platform) => {
            const panel = panels[platform];
            return (
              <PlatformPanel
                key={platform}
                platform={platform}
                posts={panel.posts}
                failed={panel.status === 'error'}
                skeletons={2}
                onLoadMore={panel.next && panel.status !== 'error' ? () => loadMore(platform) : undefined}
                loadingMore={panel.status === 'more'}
              />
            );
          })}
        </div>
      </main>
    </>
  );
}

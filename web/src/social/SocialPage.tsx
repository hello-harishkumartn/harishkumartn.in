import { ArrowLeft } from 'lucide-react';
import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { site, social } from '../content';
import { cn } from '../lib/utils';
import { SOCIAL_API } from './config';
import { fetchFeed, parseState, PLATFORM_NAMES, PLATFORMS_BY_TAB, toSearch, type FeedPost, type PageState, type Platform, type Tab } from './feed';
import { PostCard, PostCardSkeleton } from './PostCard';
import { ProfileLinks } from './ProfileLinks';

const TABS: { tab: Tab; label: string }[] = [
  { tab: 'professional', label: 'Professional' },
  { tab: 'personal', label: 'Personal' },
];
const PAGE_SIZE = 12;

interface Feed {
  posts: FeedPost[];
  next: string | null;
  status: 'loading' | 'ready' | 'error' | 'more';
}

/** /social/: every post, split into Professional and Personal tabs with a platform filter. State lives in the URL. */
export function SocialPage() {
  const [state, setState] = useState<PageState>(() => parseState(location.search));
  const [feed, setFeed] = useState<Feed>({ posts: [], next: null, status: 'loading' });
  const tabRefs = useRef<Record<Tab, HTMLButtonElement | null>>({ professional: null, personal: null });

  useEffect(() => {
    history.replaceState(null, '', `${location.pathname}${toSearch(state)}`);
    const controller = new AbortController();
    setFeed({ posts: [], next: null, status: 'loading' });
    fetchFeed(SOCIAL_API, { category: state.tab, platform: state.platform ?? undefined, limit: PAGE_SIZE }, { signal: controller.signal })
      .then(({ posts, next }) => setFeed({ posts, next, status: 'ready' }))
      .catch(() => { if (!controller.signal.aborted) setFeed({ posts: [], next: null, status: 'error' }); });
    return () => controller.abort();
  }, [state]);

  const loadMore = () => {
    if (!feed.next) return;
    setFeed((f) => ({ ...f, status: 'more' }));
    fetchFeed(SOCIAL_API, { category: state.tab, platform: state.platform ?? undefined, limit: PAGE_SIZE, before: feed.next })
      .then(({ posts, next }) => setFeed((f) => ({ posts: [...f.posts, ...posts], next, status: 'ready' })))
      .catch(() => setFeed((f) => ({ ...f, status: 'ready' })));
  };

  const selectTab = (tab: Tab) => setState({ tab, platform: null });
  const onTabKey = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight' && e.key !== 'Home' && e.key !== 'End') return;
    e.preventDefault();
    const next: Tab = state.tab === 'professional' ? 'personal' : 'professional';
    const target = e.key === 'Home' ? 'professional' : e.key === 'End' ? 'personal' : next;
    selectTab(target);
    tabRefs.current[target]?.focus();
  };
  const setPlatform = (platform: Platform | null) => setState((s) => ({ ...s, platform }));

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
        <div className="mt-6"><ProfileLinks /></div>

        <div role="tablist" aria-label="Which side" className="mt-12 inline-flex rounded-full border border-white/10 bg-white/[0.03] p-1">
          {TABS.map(({ tab, label }) => (
            <button
              key={tab}
              ref={(el) => { tabRefs.current[tab] = el; }}
              type="button"
              role="tab"
              id={`tab-${tab}`}
              aria-selected={state.tab === tab}
              aria-controls="feed"
              tabIndex={state.tab === tab ? 0 : -1}
              onClick={() => selectTab(tab)}
              onKeyDown={onTabKey}
              className={cn(
                'min-h-11 cursor-pointer rounded-full px-5 text-sm font-medium transition-colors duration-200',
                state.tab === tab ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {label}
            </button>
          ))}
        </div>

        <div id="feed" role="tabpanel" aria-labelledby={`tab-${state.tab}`} tabIndex={-1} className="mt-6 scroll-mt-6">
          <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by platform">
            {[null, ...PLATFORMS_BY_TAB[state.tab]].map((p) => (
              <button
                key={p ?? 'all'}
                type="button"
                aria-pressed={state.platform === p}
                onClick={() => setPlatform(p)}
                className={cn(
                  'min-h-11 cursor-pointer rounded-full border px-4 text-sm transition-colors duration-200',
                  state.platform === p ? 'border-primary/50 bg-primary/10 text-primary' : 'border-white/10 text-muted-foreground hover:text-foreground',
                )}
              >
                {p ? PLATFORM_NAMES[p] : 'All'}
              </button>
            ))}
          </div>

          <div className="mt-8" aria-live="polite" aria-busy={feed.status === 'loading'}>
            {feed.status === 'error' ? (
              <div className="rounded-3xl border border-white/[0.08] bg-card p-6 md:p-8">
                <p className="text-muted-foreground">The live feed is unavailable right now. You can find me here:</p>
                <div className="mt-5"><ProfileLinks /></div>
              </div>
            ) : feed.status === 'loading' ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {Array.from({ length: 6 }, (_, i) => <PostCardSkeleton key={i} />)}
              </div>
            ) : feed.posts.length === 0 ? (
              <p className="rounded-3xl border border-dashed border-white/10 p-6 text-muted-foreground">Nothing here yet.</p>
            ) : (
              <div className="grid items-start gap-4 md:grid-cols-2 lg:grid-cols-3">
                {feed.posts.map((p) => <PostCard key={p.id} post={p} />)}
              </div>
            )}
          </div>

          {feed.next && feed.status !== 'error' && feed.status !== 'loading' && (
            <button
              type="button"
              onClick={loadMore}
              disabled={feed.status === 'more'}
              className="mt-8 inline-flex min-h-11 cursor-pointer items-center rounded-full border border-white/10 px-5 text-sm transition-colors duration-200 hover:border-primary/40 hover:text-primary disabled:cursor-wait disabled:opacity-60"
            >
              {feed.status === 'more' ? 'Loading...' : 'Load more'}
            </button>
          )}
        </div>
      </main>
    </>
  );
}

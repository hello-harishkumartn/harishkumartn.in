import { m } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { social } from '../content';
import { revealItem, Section } from '../components/Section';
import { SOCIAL_API, SOCIAL_PAGE } from '../social/config';
import { fetchFeed, PLATFORM_NAMES, PLATFORMS_BY_TAB, splitHome, type FeedPost, type Tab } from '../social/feed';
import { PostCard, PostCardSkeleton } from '../social/PostCard';
import { ProfileLinks } from '../social/ProfileLinks';

type State = { status: 'idle' | 'loading' | 'error' } | { status: 'ready'; sides: Record<Tab, FeedPost[]> };

const SIDES: { tab: Tab; heading: string }[] = [
  { tab: 'professional', heading: 'Professional' },
  { tab: 'personal', heading: 'Personal' },
];

/** Latest posts from both sides. Fetches once, when the section is about to scroll into view. */
export function Social() {
  const [state, setState] = useState<State>({ status: SOCIAL_API ? 'idle' : 'error' });
  const sentinel = useRef<HTMLDivElement>(null);

  // Runs once. Its cleanup (unmount only) is the one place that aborts the request; tying this
  // effect to the status would abort the fetch the moment it switches to "loading".
  useEffect(() => {
    if (!SOCIAL_API || !sentinel.current) return;
    const controller = new AbortController();
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        observer.disconnect();
        setState({ status: 'loading' });
        fetchFeed(SOCIAL_API, { limit: 24 }, { signal: controller.signal })
          .then(({ posts }) => setState({ status: 'ready', sides: splitHome(posts, social.homeCount) }))
          .catch(() => { if (!controller.signal.aborted) setState({ status: 'error' }); });
      },
      { rootMargin: '600px 0px' },
    );
    observer.observe(sentinel.current);
    return () => { observer.disconnect(); controller.abort(); };
  }, []);

  return (
    <Section id="social" kicker={social.kicker} title={social.title} intro={social.intro}>
      <div ref={sentinel} />
      {state.status === 'error' ? (
        <m.div variants={revealItem} className="rounded-3xl border border-white/[0.08] bg-card p-6 md:p-8">
          <p className="text-base text-muted-foreground">The live feed is unavailable right now. You can find me here:</p>
          <div className="mt-5"><ProfileLinks /></div>
        </m.div>
      ) : (
        <div className="grid gap-10 lg:grid-cols-2 lg:gap-8">
          {SIDES.map(({ tab, heading }) => {
            const posts = state.status === 'ready' ? state.sides[tab] : null;
            const platforms = PLATFORMS_BY_TAB[tab].map((p) => PLATFORM_NAMES[p]).join(' and ');
            return (
              <m.section key={tab} variants={revealItem} aria-labelledby={`social-${tab}`} className="min-w-0">
                <h3 id={`social-${tab}`} className="flex items-baseline gap-3 font-display text-2xl font-semibold">
                  {heading}
                  <span className="font-mono text-xs font-normal uppercase tracking-[0.2em] text-muted-foreground">{platforms}</span>
                </h3>
                <div className="mt-5 grid gap-4" aria-busy={posts === null}>
                  {posts === null
                    ? Array.from({ length: social.homeCount }, (_, i) => <PostCardSkeleton key={i} />)
                    : posts.length
                      ? posts.map((p) => <PostCard key={p.id} post={p} />)
                      : <p className="rounded-3xl border border-dashed border-white/10 p-6 text-muted-foreground">Nothing here yet.</p>}
                </div>
              </m.section>
            );
          })}
        </div>
      )}
      <m.a
        variants={revealItem}
        href={SOCIAL_PAGE}
        className="mt-10 inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-full bg-primary px-5 font-medium text-primary-foreground transition-transform duration-200 hover:-translate-y-0.5"
      >
        Open the full feed <ArrowRight className="size-4" aria-hidden />
      </m.a>
    </Section>
  );
}

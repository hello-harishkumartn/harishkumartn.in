import { m } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { social } from '../content';
import { revealItem, Section } from '../components/Section';
import { SOCIAL_API, SOCIAL_PAGE } from '../social/config';
import { fetchFeed, groupByPlatform, PLATFORM_ORDER, type FeedPost, type Platform } from '../social/feed';
import { PlatformPanel } from '../social/PlatformPanel';
import { ProfileLinks } from '../social/ProfileLinks';

type State = { status: 'idle' | 'loading' | 'error' } | { status: 'ready'; groups: Record<Platform, FeedPost[]> };

/** Latest posts from every platform. Fetches once, when the section is about to scroll into view. */
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
        fetchFeed(SOCIAL_API, { limit: 50 }, { signal: controller.signal })
          .then(({ posts }) => setState({ status: 'ready', groups: groupByPlatform(posts, social.homeCount) }))
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
        <div className="grid items-start gap-x-8 gap-y-12 md:grid-cols-2">
          {PLATFORM_ORDER.map((platform) => (
            <m.div key={platform} variants={revealItem} className="min-w-0">
              <PlatformPanel
                platform={platform}
                as="h3"
                posts={state.status === 'ready' ? state.groups[platform] : null}
                skeletons={social.homeCount}
              />
            </m.div>
          ))}
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

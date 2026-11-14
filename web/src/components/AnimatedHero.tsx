/**
 * Adapted from "Animated Hero" by Tommy Jepsen on 21st.dev
 * (https://21st.dev/@tommyjepsen/components/animated-hero, source: tommyjepsen/twblocks
 * blocks/hero/hero5.tsx, MIT). Kept: the badge → headline with a spring-rotating word →
 * lead → button row structure and its motion. Changed: left-aligned over the 3D scene,
 * copy from content.ts, rotating words = hero.words (cycling over the court), a
 * "Play a rally" action for playable scenes, reduced-motion aware, fades out as the
 * cinematic scroll begins.
 */
import { m, useReducedMotion } from 'framer-motion';
import { Box, Gamepad2, MousePointerClick } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { hero } from '../content';
import { hotspotIcons } from '../lib/icons';
import type { SceneSignals } from '../scenes/types';
import { Button } from './ui/button';

interface Props {
  onPick: (id: string) => void;
  /** Scenes with a mini-game: start it. */
  onPlay?: () => void;
  toggle3D?: () => void;
  is3DOff: boolean;
  /** When set, the block fades out over the first slice of scroll progress. */
  fade?: SceneSignals;
}

const ease = [0.22, 1, 0.36, 1] as const;

export function AnimatedHero({ onPick, onPlay, toggle3D, is3DOff, fade }: Props) {
  const reduce = useReducedMotion();
  const [titleNumber, setTitleNumber] = useState(0);
  const titles = useMemo(() => hero.words, []);
  const root = useRef<HTMLDivElement>(null);
  const touch = useMemo(() => window.matchMedia('(pointer: coarse)').matches, []);

  useEffect(() => {
    if (reduce) return;
    const id = setTimeout(() => setTitleNumber((n) => (n + 1) % titles.length), 2200);
    return () => clearTimeout(id);
  }, [titleNumber, titles, reduce]);

  // Fade with scroll without re-rendering.
  useEffect(() => {
    if (!fade) return;
    let raf = 0;
    const tick = () => {
      const el = root.current;
      if (el) {
        const o = 1 - Math.min(fade.progress / 0.07, 1);
        el.style.opacity = String(o);
        el.style.transform = `translateY(${(1 - o) * -30}px)`;
        el.style.visibility = o < 0.01 ? 'hidden' : 'visible';
      }
      raf = requestAnimationFrame(tick);
    };
    tick();
    return () => cancelAnimationFrame(raf);
  }, [fade]);

  const item = (i: number) => ({
    initial: reduce ? false : { opacity: 0, y: 18, filter: 'blur(6px)' },
    animate: { opacity: 1, y: 0, filter: 'blur(0px)' },
    transition: { duration: 0.8, delay: 0.15 + i * 0.1, ease },
  });

  return (
    <m.div
      exit={{ opacity: 0, transition: { duration: 0.25 } }}
      className="pointer-events-none absolute inset-0 z-10 flex items-start md:items-center short:items-start"
    >
      <div ref={root} className="pointer-events-auto ml-[max(1.5rem,env(safe-area-inset-left))] mr-6 mt-[13svh] flex min-w-0 max-w-xl flex-col gap-6 md:ml-[max(3rem,env(safe-area-inset-left))] md:mr-12 md:mt-0 lg:ml-20 short:mt-20 short:max-w-2xl short:gap-3">
        <m.div {...item(0)} className="short:hidden">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3.5 py-1.5 text-[13px] text-muted-foreground backdrop-blur-md">
            <MousePointerClick className="size-3.5 text-primary" aria-hidden />
            {is3DOff ? hero.hintOff : touch ? hero.hintTouch : hero.hint}
          </span>
        </m.div>

        <div className="flex flex-col gap-4">
          <m.h1 {...item(1)} className="font-display text-[clamp(2.4rem,5.2vw,4.6rem)] font-semibold short:text-[2.1rem] leading-[0.98] tracking-[-0.035em]">
            <span className="block text-foreground md:whitespace-nowrap">{hero.greeting}</span>
            <span className="relative mt-1 flex h-[1.1em] w-full overflow-hidden" aria-hidden>
              {titles.map((title, index) => (
                <m.span
                  key={title}
                  className="absolute left-0 bg-gradient-to-r from-primary via-amber-300 to-orange-200 bg-clip-text font-light italic text-transparent"
                  initial={{ opacity: 0, y: '-100%' }}
                  transition={{ type: 'spring', stiffness: 50 }}
                  animate={
                    titleNumber === index
                      ? { y: 0, opacity: 1 }
                      : { y: titleNumber > index ? '-150%' : '150%', opacity: 0 }
                  }
                >
                  {title.toLowerCase()}.
                </m.span>
              ))}
            </span>
          </m.h1>
          <m.p {...item(2)} className="max-w-md text-lg leading-relaxed text-muted-foreground md:text-xl short:line-clamp-2 short:max-w-xl short:text-base">
            {hero.intro}
          </m.p>
        </div>

        <m.ul {...item(3)} className="-mx-6 flex flex-wrap gap-2.5 px-6 max-md:flex-nowrap max-md:overflow-x-auto md:mx-0 md:px-0 short:flex-nowrap short:overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden [&>*]:shrink-0" role="list" aria-label="Jump to a section">
          {hero.hotspots.map((h, i) => {
            const Icon = hotspotIcons[h.id] ?? Box;
            return (
              <li key={h.id} className="shrink-0">
                <Button size="sm" variant={i === 0 ? 'default' : 'outline'} onClick={() => onPick(h.id)}>
                  <Icon aria-hidden /> {h.label}
                </Button>
              </li>
            );
          })}
        </m.ul>

        {(toggle3D || onPlay) && (
          <m.div {...item(4)} className="flex flex-wrap items-center gap-5">
            {onPlay && (
              <Button size="sm" variant="secondary" onClick={onPlay}>
                <Gamepad2 aria-hidden /> Play a rally
              </Button>
            )}
            {toggle3D && (
            <button
              onClick={toggle3D}
              className="cursor-pointer text-sm text-muted-foreground underline decoration-white/20 underline-offset-4 transition-colors hover:text-foreground hover:decoration-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {is3DOff ? `Turn 3D ${hero.place} on` : 'Turn 3D off'}
            </button>
            )}
          </m.div>
        )}
      </div>
    </m.div>
  );
}

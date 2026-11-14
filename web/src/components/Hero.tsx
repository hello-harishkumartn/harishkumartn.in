import { AnimatePresence, m } from 'framer-motion';
import { ArrowDown, ArrowRight, Box, ChevronDown, Gamepad2, X } from 'lucide-react';
import { Component, lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { about, badminton, education, hero, ideas, markets, site, travel, work, type SectionId } from '../content';
import { hotspotIcons } from '../lib/icons';
import { scrollToSection } from '../lib/scroll';
import { hasWebGL, useDeviceProfile } from '../lib/useDevice';
import { scenes } from '../scenes';
import type { SceneSignals } from '../scenes/types';
import { AnimatedHero } from './AnimatedHero';
import { Loader } from './Loader';
import { Button } from './ui/button';

const STORAGE_KEY = 'hk:3d-off';
const loadCanvas = () => import('./HeroCanvas');
const HeroCanvas = lazy(loadCanvas);

const SCENE = scenes[site.scene];
const PATH_ORDER = SCENE.pathOrder;
const PLAYABLE = 'playable' in SCENE && SCENE.playable;

declare global {
  interface Window {
    /** Test hook: focus a hotspot by id (see content.ts → hero.hotspots), or null to clear. */
    __focus?: (id: string | null) => void;
    /** Test hook: start/stop the scene's mini-game (The Court's rally). */
    __play?: (on: boolean) => void;
  }
}

/** What the focus panel says for each hotspot, pulled straight from content.ts. */
const focusCopy: Record<SectionId, { kicker: string; title: string; body: string; extra?: string[] }> = {
  about: { kicker: about.kicker, title: about.title, body: about.paragraphs[0], extra: about.quickFacts.map((f) => `${f.label}: ${f.value}`) },
  ideas: { kicker: ideas.kicker, title: ideas.title, body: ideas.intro, extra: [...new Set(ideas.entries.flatMap((e) => e.tags ?? []))] },
  work: { kicker: work.kicker, title: work.title, body: work.items.map((w) => `${w.role} · ${w.org}`).join('\n') },
  markets: { kicker: markets.kicker, title: markets.title, body: markets.intro, extra: [markets.disclaimer] },
  badminton: { kicker: badminton.kicker, title: badminton.title, body: badminton.intro, extra: [PLAYABLE ? 'Tip: play a rally against the court.' : 'Tip: flick the shuttlecock on the desk.'] },
  travel: { kicker: travel.kicker, title: travel.title, body: travel.intro, extra: ['Bengaluru', 'Chennai · IIT Madras', 'London · UCL'] },
  education: {
    kicker: education.kicker,
    title: education.title,
    body: education.items.map((e) => `${e.degree} · ${e.school}`).join('\n'),
    extra: [education.dream.body],
  },
} as Record<SectionId, { kicker: string; title: string; body: string; extra?: string[] }>;

export function Hero() {
  const { tier, reducedMotion } = useDeviceProfile();
  const [webgl] = useState(hasWebGL);
  const [off, setOff] = useState(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored !== null) return stored === '1';
    return false;
  });
  const [focusId, setFocusId] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [chapter, setChapter] = useState(-1);
  const [playing, setPlaying] = useState(false);
  // Mount the WebGL stage after the first paint so the copy shows (and animates) first.
  const [mount3D, setMount3D] = useState(false);
  const signals = useRef<SceneSignals>({ progress: 0 }).current;
  const section = useRef<HTMLElement>(null);
  const focusScrollY = useRef(0);
  const show3D = webgl && !off;
  const cinematic = show3D && !reducedMotion;

  useEffect(() => {
    if (!show3D) return;
    // Fetch three.js as soon as the first frame is painted; mount the canvas once idle.
    const kick = requestAnimationFrame(() => window.setTimeout(() => void loadCanvas()));
    const w = window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number; cancelIdleCallback?: (id: number) => void };
    if (w.requestIdleCallback) {
      const id = w.requestIdleCallback(() => setMount3D(true), { timeout: 600 });
      return () => {
        cancelAnimationFrame(kick);
        w.cancelIdleCallback?.(id);
      };
    }
    const id = window.setTimeout(() => setMount3D(true), 200);
    return () => {
      cancelAnimationFrame(kick);
      window.clearTimeout(id);
    };
  }, [show3D]);

  const toggle3D = () => {
    const next = !off;
    setOff(next);
    setReady(false);
    if (!next) {
      void loadCanvas();
      setMount3D(true);
    }
    localStorage.setItem(STORAGE_KEY, next ? '1' : '0');
  };

  const focus = useCallback(
    (id: string | null) => {
      const h = hero.hotspots.find((x) => x.id === id);
      if (id && !h) return;
      if (id && !show3D) {
        scrollToSection(h!.section, !reducedMotion);
        return;
      }
      focusScrollY.current = window.scrollY;
      setPlaying(false);
      setFocusId(id);
    },
    [show3D, reducedMotion],
  );

  const play = useCallback(
    (on: boolean) => {
      if (on && !(show3D && PLAYABLE)) return;
      focusScrollY.current = window.scrollY;
      setFocusId(null);
      setPlaying(on);
    },
    [show3D],
  );

  // Test hooks: window.__focus('globe') and URL hash #focus=globe.
  useEffect(() => {
    window.__focus = focus;
    window.__play = play;
    const fromHash = () => {
      const m = /focus=([a-z]+)/.exec(location.hash);
      if (m) focus(m[1]);
    };
    fromHash();
    window.addEventListener('hashchange', fromHash);
    return () => window.removeEventListener('hashchange', fromHash);
  }, [focus, play]);

  // Esc leaves focus (or the rally).
  useEffect(() => {
    if (!focusId && !playing) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      setFocusId(null);
      setPlaying(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [focusId, playing]);

  // Scroll progress through the tall hero drives the camera path and the chapter captions.
  useEffect(() => {
    let raf = 0;
    const update = () => {
      raf = 0;
      const el = section.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const span = Math.max(r.height - window.innerHeight, 1);
      const p = Math.min(Math.max(-r.top / span, 0), 1);
      signals.progress = p;
      const t = p * (PATH_ORDER.length + 1);
      const i = Math.round(t) - 1;
      setChapter(i >= 0 && i < PATH_ORDER.length && Math.abs(t - Math.round(t)) < 0.32 ? i : -1);
      if (focusScrollY.current >= 0 && Math.abs(window.scrollY - focusScrollY.current) > 120) {
        setFocusId(null);
        setPlaying(false);
        focusScrollY.current = -1;
      }
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      cancelAnimationFrame(raf);
    };
  }, [signals]);

  const focused = hero.hotspots.find((h) => h.id === focusId) ?? null;
  const chapterSpot = chapter >= 0 ? hero.hotspots.find((h) => h.id === PATH_ORDER[chapter]) : undefined;

  return (
    <section
      id="home"
      ref={section}
      aria-label="Home"
      className="relative"
      style={{ height: cinematic ? `${(PATH_ORDER.length + 2) * 75}svh` : '100svh' }}
    >
      <div className={`sticky top-0 h-svh w-full overflow-hidden ${playing ? 'touch-none' : 'touch-pan-y'}`}>
        {show3D ? (
          <CanvasBoundary fallback={<StaticScene onPick={focus} />}>
            {/* Backdrop while the scene streams in; the canvas fades in over it. */}
            {!ready && <StaticScene onPick={focus} bare />}
            <Suspense fallback={<Loader progress={0} done={false} />}>
              {mount3D ? (
              <HeroCanvas
                tier={tier}
                reducedMotion={reducedMotion}
                focusId={focusId}
                onFocus={focus}
                signals={signals}
                ready={ready}
                onReady={() => setReady(true)}
                playing={playing}
              />
              ) : (
                <Loader progress={0} done={false} />
              )}
            </Suspense>
          </CanvasBoundary>
        ) : (
          <StaticScene onPick={focus} />
        )}

        {/* Legibility scrims (lifted while playing so the whole court is visible) */}
        <div className={`pointer-events-none absolute inset-0 transition-opacity duration-500 ${playing ? 'opacity-0' : ''} bg-[radial-gradient(120%_80%_at_0%_50%,rgba(13,11,9,0.85)_0%,rgba(13,11,9,0.35)_45%,transparent_70%)] max-md:bg-[linear-gradient(180deg,rgba(13,11,9,0.88)_0%,rgba(13,11,9,0.4)_38%,transparent_60%)]`} />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-background to-transparent" />

        <AnimatePresence>
          {!focused && !playing && chapter < 0 && (
            <AnimatedHero
              key="copy"
              onPick={focus}
              onPlay={show3D && PLAYABLE ? () => play(true) : undefined}
              toggle3D={webgl ? toggle3D : undefined}
              is3DOff={off}
              fade={cinematic ? signals : undefined}
            />
          )}
        </AnimatePresence>

        {/* Scroll chapter caption */}
        <AnimatePresence mode="wait">
          {!focused && !playing && chapterSpot && (
            <ChapterCaption key={chapterSpot.id} index={chapter} id={chapterSpot.id} label={chapterSpot.label} onOpen={() => focus(chapterSpot.id)} />
          )}
        </AnimatePresence>

        <AnimatePresence>
          {focused && (
            <FocusPanel
              key={focused.id}
              id={focused.id}
              section={focused.section}
              onClose={() => setFocusId(null)}
              onPlay={focused.section === 'badminton' && show3D && PLAYABLE ? () => play(true) : undefined}
              onOpen={() => {
                setFocusId(null);
                scrollToSection(focused.section, !reducedMotion);
              }}
            />
          )}
        </AnimatePresence>

        <AnimatePresence>{playing && <RallyHud key="hud" score={signals} onExit={() => play(false)} />}</AnimatePresence>

        {cinematic && ready && !focused && !playing && (
          <ScrollCue progress={signals} />
        )}
      </div>
    </section>
  );
}

function ChapterCaption({ index, id, label, onOpen }: { index: number; id: string; label: string; onOpen: () => void }) {
  const Icon = hotspotIcons[id] ?? Box;
  return (
    <m.div
      className="absolute bottom-[12svh] left-[max(1.5rem,env(safe-area-inset-left))] z-20 md:bottom-auto md:left-[max(3rem,env(safe-area-inset-left))] md:top-1/2 md:-translate-y-1/2"
      initial={{ opacity: 0, y: 24, filter: 'blur(8px)' }}
      animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
      exit={{ opacity: 0, y: -16, filter: 'blur(6px)' }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
    >
      <p className="font-mono text-xs tracking-[0.3em] text-primary">
        {String(index + 1).padStart(2, '0')} / {String(PATH_ORDER.length).padStart(2, '0')}
      </p>
      <h2 className="mt-3 font-display text-5xl font-semibold tracking-tight text-foreground md:text-7xl">{label}</h2>
      <Button variant="outline" size="sm" className="mt-6" onClick={onOpen}>
        <Icon aria-hidden /> Take a closer look <ArrowRight aria-hidden />
      </Button>
    </m.div>
  );
}

function FocusPanel({
  id,
  section,
  onClose,
  onOpen,
  onPlay,
}: {
  id: string;
  section: SectionId;
  onClose: () => void;
  onOpen: () => void;
  onPlay?: () => void;
}) {
  const copy = focusCopy[section];
  const Icon = hotspotIcons[id] ?? Box;
  if (!copy) return null;
  return (
    <m.aside
      className="absolute z-20 max-md:bottom-[max(0.75rem,env(safe-area-inset-bottom))] max-md:left-[max(0.75rem,env(safe-area-inset-left))] max-md:right-[max(0.75rem,env(safe-area-inset-right))] md:left-[max(2.5rem,env(safe-area-inset-left))] md:top-1/2 md:w-[400px] md:-translate-y-1/2"
      initial={{ opacity: 0, x: -24, y: 0 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -16, transition: { duration: 0.25 } }}
      transition={{ duration: 0.6, delay: 0.25, ease: [0.22, 1, 0.36, 1] }}
      aria-label={`${copy.kicker} details`}
    >
      <div className="rounded-3xl border border-white/10 bg-[#14110e]/75 p-6 shadow-2xl shadow-black/50 backdrop-blur-xl md:p-7">
        <div className="flex items-center justify-between">
          <p className="flex items-center gap-2 font-mono text-xs uppercase tracking-[0.25em] text-primary">
            <Icon aria-hidden className="size-4" /> {copy.kicker}
          </p>
          <button
            onClick={onClose}
            className="grid size-11 cursor-pointer place-items-center rounded-full text-muted-foreground transition-colors hover:bg-white/10 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label={`Back to the ${hero.place}`}
          >
            <X className="size-4" />
          </button>
        </div>
        <h2 className="mt-2 font-display text-2xl font-semibold leading-tight tracking-tight md:text-3xl">{copy.title}</h2>
        <p className="mt-3 whitespace-pre-line text-base leading-relaxed text-muted-foreground">{copy.body}</p>
        {copy.extra && (
          <ul className="mt-4 flex flex-wrap gap-2">
            {copy.extra.map((x) => (
              <li key={x} className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-foreground/80">
                {x}
              </li>
            ))}
          </ul>
        )}
        <div className="mt-6 flex flex-wrap gap-3">
          <Button onClick={onOpen}>
            Open {copy.kicker} <ArrowDown aria-hidden />
          </Button>
          {onPlay && (
            <Button variant="outline" onClick={onPlay}>
              <Gamepad2 aria-hidden /> Play a rally
            </Button>
          )}
          <Button variant="ghost" onClick={onClose}>
            Back to {hero.place} <kbd className="ml-1 rounded border border-white/15 px-1.5 font-mono text-[10px]">Esc</kbd>
          </Button>
        </div>
      </div>
    </m.aside>
  );
}

function ScrollCue({ progress }: { progress: SceneSignals }) {
  const bar = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let raf = 0;
    const tick = () => {
      if (bar.current) bar.current.style.transform = `scaleY(${progress.progress})`;
      raf = requestAnimationFrame(tick);
    };
    tick();
    return () => cancelAnimationFrame(raf);
  }, [progress]);
  return (
    <div className="pointer-events-none absolute right-6 top-1/2 z-10 hidden -translate-y-1/2 flex-col items-center gap-3 md:flex" aria-hidden>
      <div className="relative h-40 w-px bg-white/15">
        <div ref={bar} className="absolute inset-0 origin-top bg-primary" style={{ transform: 'scaleY(0)' }} />
      </div>
      <ChevronDown className="size-4 animate-bounce text-muted-foreground" />
    </div>
  );
}

/** Live rally score while playing, read from the scene's signals without re-rendering. */
function RallyHud({ score, onExit }: { score: SceneSignals; onExit: () => void }) {
  const count = useRef<HTMLSpanElement>(null);
  const best = useRef<HTMLSpanElement>(null);
  const note = useRef<HTMLParagraphElement>(null);
  const touch = useMemo(() => window.matchMedia('(pointer: coarse)').matches, []);
  useEffect(() => {
    let raf = 0;
    const shown = { count: -1, best: -1, state: '' };
    const tick = () => {
      const r = score.rally;
      // Touch the DOM only when the score changes (a write per frame re-lays out the blurred HUD).
      const changed = r && (r.count !== shown.count || r.best !== shown.best || r.state !== shown.state);
      if (r && changed && count.current && best.current && note.current) {
        Object.assign(shown, r);
        count.current.textContent = String(r.count);
        best.current.textContent = String(r.best);
        note.current.textContent =
          r.state === 'over' ? (r.count ? `Rally over at ${r.count}. Next serve coming…` : 'Missed it! Next serve coming…') : r.state === 'idle' ? 'Serve incoming…' : touch ? 'Drag to move the racket' : 'Move your mouse to swing';
      }
      raf = requestAnimationFrame(tick);
    };
    tick();
    return () => cancelAnimationFrame(raf);
  }, [score, touch]);
  return (
    <m.div
      className="pointer-events-none absolute inset-x-0 top-20 z-20 flex justify-center px-4 md:top-24"
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="pointer-events-auto flex items-center gap-5 rounded-2xl border border-white/10 bg-[#14110e]/70 px-5 py-3 shadow-2xl shadow-black/40 backdrop-blur-xl">
        <div className="text-center">
          <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground">Rally</p>
          <span ref={count} className="font-display text-3xl font-semibold tabular-nums text-primary" aria-live="polite">
            0
          </span>
        </div>
        <div className="text-center">
          <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground">Best</p>
          <span ref={best} className="font-display text-3xl font-semibold tabular-nums">
            0
          </span>
        </div>
        <p ref={note} className="hidden max-w-44 text-sm text-muted-foreground sm:block" />
        <Button variant="outline" size="sm" onClick={onExit}>
          <X aria-hidden /> Exit <kbd className="ml-1 hidden rounded border border-white/15 px-1.5 font-mono text-[10px] md:inline">Esc</kbd>
        </Button>
      </div>
    </m.div>
  );
}

/** Lightweight 2D fallback when WebGL is unavailable or 3D is switched off. */
function StaticScene({ onPick, bare = false }: { onPick: (id: string) => void; bare?: boolean }) {
  const picks = useMemo(() => hero.hotspots, []);
  const glow = site.scene === 'court' ? 'bg-[radial-gradient(80%_60%_at_70%_60%,#123a2e_0%,#0b0d0c_70%)]' : 'bg-[radial-gradient(80%_60%_at_70%_60%,#3a2414_0%,#0d0b09_70%)]';
  return (
    <div className={`absolute inset-0 ${glow}`}>
      {!bare && (
      <div className="absolute hidden md:left-auto md:grid md:grid-cols-2 md:gap-3 md:right-12 md:top-1/2 md:bottom-auto md:w-[420px] md:-translate-y-1/2">
        {picks.map((h, i) => {
          const Icon = hotspotIcons[h.id] ?? Box;
          return (
            <m.button
              key={h.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + i * 0.07 }}
              onClick={() => onPick(h.id)}
              className="flex min-h-24 cursor-pointer flex-col items-start justify-between rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-left transition-colors hover:border-primary/50 hover:bg-white/[0.07] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Icon className="size-5 text-primary" aria-hidden />
              <span className="font-display text-lg font-medium">{h.label}</span>
            </m.button>
          );
        })}
      </div>
      )}
    </div>
  );
}

/** If WebGL blows up at runtime (lost context, driver bugs), fall back to 2D. */
class CanvasBoundary extends Component<{ fallback: ReactNode; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

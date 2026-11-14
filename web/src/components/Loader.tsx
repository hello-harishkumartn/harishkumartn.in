import { AnimatePresence, m } from 'framer-motion';
import { TextShimmer } from '@/components/ui/text-shimmer';
import { hero } from '../content';

/**
 * Small loading chip over the 3D stage, with real asset progress. It doesn't cover
 * the page: the hero copy is readable (and clickable) while the scene streams in.
 */
export function Loader({ progress, done }: { progress: number; done: boolean }) {
  const pct = Math.round(progress);
  return (
    <AnimatePresence>
      {!done && (
        <m.div
          key="loader"
          data-loader="chip"
          className="pointer-events-none absolute bottom-[max(1.25rem,env(safe-area-inset-bottom))] right-4 z-30 md:bottom-8 md:right-8"
          initial={false}
          exit={{ opacity: 0, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] } }}
          role="status"
          aria-live="polite"
        >
          <div className="flex w-52 flex-col gap-2 rounded-2xl border border-white/10 bg-[#14110e]/70 px-4 py-3 backdrop-blur-md">
            <div className="flex items-baseline justify-between gap-3">
              <TextShimmer className="font-mono text-[11px] uppercase tracking-[0.2em]" duration={1.6}>
                {`Setting up the ${hero.place}`}
              </TextShimmer>
              <span className="font-mono text-xs tabular-nums text-foreground/80">{pct}%</span>
            </div>
            <div className="h-px w-full overflow-hidden bg-white/10">
              <div
                className="h-full origin-left bg-gradient-to-r from-primary/40 via-primary to-amber-200 transition-transform duration-500 ease-out"
                style={{ transform: `scaleX(${Math.max(pct, 4) / 100})` }}
              />
            </div>
          </div>
        </m.div>
      )}
    </AnimatePresence>
  );
}

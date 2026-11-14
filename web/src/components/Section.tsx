import { m, useReducedMotion, type Variants } from 'framer-motion';
import type { ReactNode } from 'react';
import type { SectionId } from '../content';
import { cn } from '../lib/utils';

interface Props {
  id: SectionId;
  kicker: string;
  title: string;
  intro?: string;
  index?: number;
  children: ReactNode;
}

const ease = [0.22, 1, 0.36, 1] as const;

/** Container whose children with `variants={revealItem}` stagger in on scroll. */
export const revealGroup: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08, delayChildren: 0.05 } },
};
export const revealItem: Variants = {
  hidden: { opacity: 0, y: 28, filter: 'blur(6px)' },
  show: { opacity: 1, y: 0, filter: 'blur(0px)', transition: { duration: 0.7, ease } },
};

export function Section({ id, kicker, title, intro, children }: Props) {
  const reduce = useReducedMotion();
  return (
    <section id={id} aria-labelledby={`${id}-title`} className="relative scroll-mt-20 py-24 pl-[max(1.25rem,env(safe-area-inset-left))] pr-[max(1.25rem,env(safe-area-inset-right))] md:py-32 md:pl-[max(2.5rem,env(safe-area-inset-left))] md:pr-[max(2.5rem,env(safe-area-inset-right))]">
      <m.div
        className="mx-auto max-w-6xl"
        initial={reduce ? false : 'hidden'}
        whileInView="show"
        viewport={{ once: true, margin: '-12% 0px' }}
        variants={revealGroup}
      >
        <m.p variants={revealItem} className="flex items-center gap-3 font-mono text-xs uppercase tracking-[0.3em] text-primary">
          <span className="h-px w-8 bg-primary/60" aria-hidden />
          {kicker}
        </m.p>
        <m.h2
          variants={revealItem}
          id={`${id}-title`}
          className="mt-4 max-w-3xl text-balance font-display text-4xl font-semibold leading-[1.05] tracking-[-0.03em] md:text-6xl"
        >
          {title}
        </m.h2>
        {intro && (
          <m.p variants={revealItem} className="mt-5 max-w-2xl text-pretty text-lg leading-relaxed text-muted-foreground">
            {intro}
          </m.p>
        )}
        <div className="mt-12 md:mt-16">{children}</div>
      </m.div>
    </section>
  );
}

/** Card with a soft cursor-following highlight on hover. */
export function Card({ className, children, as: Tag = 'article' }: { className?: string; children: ReactNode; as?: 'article' | 'li' | 'aside' | 'div' }) {
  const M = m[Tag];
  return (
    <M
      variants={revealItem}
      onPointerMove={(e: React.PointerEvent<HTMLElement>) => {
        const r = e.currentTarget.getBoundingClientRect();
        e.currentTarget.style.setProperty('--mx', `${e.clientX - r.left}px`);
        e.currentTarget.style.setProperty('--my', `${e.clientY - r.top}px`);
      }}
      className={cn(
        'group relative overflow-hidden rounded-3xl border border-white/[0.08] bg-card p-6 transition-[border-color,transform] duration-300 hover:-translate-y-0.5 hover:border-white/15 md:p-7',
        'before:pointer-events-none before:absolute before:inset-0 before:opacity-0 before:transition-opacity before:duration-300 hover:before:opacity-100',
        'before:bg-[radial-gradient(420px_circle_at_var(--mx,50%)_var(--my,50%),rgba(251,146,60,0.09),transparent_60%)]',
        className,
      )}
    >
      {children}
    </M>
  );
}

export function Pill({ live, children }: { live?: boolean; children: ReactNode }) {
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 font-mono text-[11px]',
        live ? 'border-up/30 bg-up/10 text-up' : 'border-white/10 bg-white/5 text-muted-foreground',
      )}
    >
      {live && <span className="size-1.5 animate-pulse rounded-full bg-up" aria-hidden />}
      {children}
    </span>
  );
}

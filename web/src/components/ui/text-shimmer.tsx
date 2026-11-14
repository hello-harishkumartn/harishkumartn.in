/**
 * Text Shimmer by ibelick (motion-primitives, MIT), via 21st.dev:
 * https://21st.dev/@ibelick/components/text-shimmer
 * Adapted: framer-motion `m` (works inside LazyMotion strict), tuned for the dark theme,
 * and static under reduced motion.
 */
import { m, useReducedMotion } from 'framer-motion';
import { useMemo, type CSSProperties, type ElementType } from 'react';
import { cn } from '@/lib/utils';

export type TextShimmerProps = {
  children: string;
  as?: ElementType;
  className?: string;
  duration?: number;
  spread?: number;
};

export function TextShimmer({ children, as: Component = 'p', className, duration = 2, spread = 2 }: TextShimmerProps) {
  const reduce = useReducedMotion();
  const MotionComponent = useMemo(() => m.create(Component as 'p'), [Component]);
  const dynamicSpread = useMemo(() => children.length * spread, [children, spread]);

  return (
    <MotionComponent
      className={cn(
        'relative inline-block bg-[length:250%_100%,auto] bg-clip-text text-transparent',
        '[--base-color:#78716c] [--base-gradient-color:#fff7ed]',
        '[background-repeat:no-repeat,padding-box] [--bg:linear-gradient(90deg,#0000_calc(50%-var(--spread)),var(--base-gradient-color),#0000_calc(50%+var(--spread)))]',
        className,
      )}
      initial={{ backgroundPosition: '100% center' }}
      animate={reduce ? undefined : { backgroundPosition: '0% center' }}
      transition={{ repeat: Infinity, duration, ease: 'linear' }}
      style={
        {
          '--spread': `${dynamicSpread}px`,
          backgroundImage: 'var(--bg), linear-gradient(var(--base-color), var(--base-color))',
        } as CSSProperties
      }
    >
      {children}
    </MotionComponent>
  );
}

import { m, useReducedMotion, useScroll, useMotionValueEvent } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import { nav, site, type SectionId } from '../content';
import { scrollToSection } from '../lib/scroll';
import { cn } from '../lib/utils';

export function Nav() {
  const [active, setActive] = useState<SectionId>('home');
  const [solid, setSolid] = useState(false);
  const listRef = useRef<HTMLUListElement>(null);
  const reduce = useReducedMotion();
  const { scrollY } = useScroll();
  useMotionValueEvent(scrollY, 'change', (y) => setSolid(y > 40));

  // Highlight whichever section is crossing the upper third of the viewport.
  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting) setActive(e.target.id as SectionId);
      },
      { rootMargin: '-30% 0px -65% 0px' },
    );
    nav.forEach(({ id }) => {
      const el = document.getElementById(id);
      if (el) io.observe(el);
    });
    return () => io.disconnect();
  }, []);

  // Keep the active tab visible in the horizontally scrolling mobile nav.
  useEffect(() => {
    const list = listRef.current;
    const el = list?.querySelector<HTMLElement>(`[data-id="${active}"]`);
    if (!list || !el) return;
    list.scrollTo({ left: el.offsetLeft - list.clientWidth / 2 + el.offsetWidth / 2 });
  }, [active]);

  return (
    <m.header
      initial={reduce ? false : { y: -24, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.7, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
      className="fixed inset-x-0 top-0 z-50 flex justify-center pl-[max(0.75rem,env(safe-area-inset-left))] pr-[max(0.75rem,env(safe-area-inset-right))] pt-[max(0.75rem,env(safe-area-inset-top))]"
    >
      <div
        className={cn(
          'flex max-w-full items-center gap-1 rounded-full border p-1.5 transition-colors duration-300',
          solid ? 'border-white/10 bg-[#14110e]/75 shadow-xl shadow-black/30 backdrop-blur-xl' : 'border-white/5 bg-[#14110e]/35 backdrop-blur-md',
        )}
      >
        <a
          className="grid size-11 shrink-0 cursor-pointer place-items-center rounded-full bg-primary font-display text-[13px] font-bold text-primary-foreground md:size-9"
          href="#home"
          onClick={(e) => {
            e.preventDefault();
            scrollToSection('home', !reduce);
          }}
          aria-label={`${site.monogram}: ${site.name}, back to top`}
        >
          {site.monogram}
        </a>
        <nav aria-label="Sections" className="min-w-0">
          <ul ref={listRef} className="flex overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {nav
              .filter((n) => n.id !== 'home')
              .map((item) => {
                const on = active === item.id;
                return (
                  <li key={item.id} className="relative">
                    <a
                      href={`#${item.id}`}
                      data-id={item.id}
                      aria-current={on ? 'true' : undefined}
                      onClick={(e) => {
                        e.preventDefault();
                        scrollToSection(item.id, !reduce);
                      }}
                      className={cn(
                        'relative z-10 flex min-h-11 cursor-pointer items-center whitespace-nowrap rounded-full px-3 text-sm font-medium transition-colors duration-200 md:min-h-9 md:text-[13px]',
                        on ? 'text-foreground' : 'text-muted-foreground hover:text-foreground',
                      )}
                    >
                      {item.label}
                    </a>
                    {on && (
                      <m.span
                        layoutId="nav-pill"
                        className="absolute inset-0 rounded-full bg-white/10"
                        transition={{ type: 'spring', stiffness: 380, damping: 32 }}
                      />
                    )}
                  </li>
                );
              })}
          </ul>
        </nav>
      </div>
    </m.header>
  );
}

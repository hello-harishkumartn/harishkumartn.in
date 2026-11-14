import { m } from 'framer-motion';
import { TriangleAlert } from 'lucide-react';
import { markets } from '../content';
import { revealItem, Section } from '../components/Section';
import { EntryList } from './EntryList';

export function Markets() {
  return (
    <Section id="markets" kicker={markets.kicker} title={markets.title} intro={markets.intro}>
      <m.p
        variants={revealItem}
        role="note"
        className="mb-8 flex items-start gap-3 rounded-2xl border border-amber-300/20 bg-amber-300/[0.06] p-4 text-base text-amber-100/90 md:text-sm"
      >
        <TriangleAlert className="mt-0.5 size-4 shrink-0 text-amber-300" aria-hidden />
        <span>
          <strong className="font-semibold">Heads up:</strong> {markets.disclaimer}
        </span>
      </m.p>
      <EntryList entries={markets.learnings} />
    </Section>
  );
}

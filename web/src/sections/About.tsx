import { m } from 'framer-motion';
import { about } from '../content';
import { PlaceholderArt, PlaceholderBadge } from '../components/Placeholder';
import { revealItem, Section } from '../components/Section';
import { media } from '../lib/media';

export function About() {
  const { photo } = about;
  return (
    <Section id="about" kicker={about.kicker} title={about.title}>
      <div className="grid items-start gap-10 md:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] md:gap-16">
        <m.figure variants={revealItem} className="relative aspect-[4/5] overflow-hidden rounded-3xl border border-white/10">
          {photo.src ? (
            <img src={media(photo.src)} alt={photo.alt} loading="lazy" className="h-full w-full object-cover" />
          ) : (
            <PlaceholderArt palette={['#7c4a1e', '#2a1a10']} variant="portrait" label={photo.alt} />
          )}
          {photo.placeholder && (
            <figcaption className="absolute bottom-3 left-3 flex items-center gap-2 rounded-full bg-black/50 px-3 py-1.5 text-xs backdrop-blur-md">
              <PlaceholderBadge /> Photo coming soon
            </figcaption>
          )}
        </m.figure>
        <div>
          {about.paragraphs.map((p, i) => (
            <m.p key={i} variants={revealItem} className={i === 0 ? 'text-pretty text-xl leading-relaxed md:text-2xl' : 'mt-5 text-pretty text-lg leading-relaxed text-muted-foreground'}>
              {p}
            </m.p>
          ))}
          <dl className="mt-10 grid gap-3 sm:grid-cols-3">
            {about.quickFacts.map((f) => (
              <m.div key={f.label} variants={revealItem} className="rounded-2xl border border-white/[0.08] bg-card p-4">
                <dt className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">{f.label}</dt>
                <dd className="mt-2 font-display text-base font-medium">{f.value}</dd>
              </m.div>
            ))}
          </dl>
        </div>
      </div>
    </Section>
  );
}

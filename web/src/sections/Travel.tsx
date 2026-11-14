import { MapPin } from 'lucide-react';
import { travel } from '../content';
import { PlaceholderArt, PlaceholderBadge } from '../components/Placeholder';
import { Card, Section } from '../components/Section';
import { media } from '../lib/media';

export function Travel() {
  return (
    <Section id="travel" kicker={travel.kicker} title={travel.title} intro={travel.intro}>
      <div className="grid gap-5 sm:grid-cols-2">
        {travel.stories.map((s, i) => (
          <Card key={i} className="p-3 md:p-3">
            <div className="relative aspect-[16/10] overflow-hidden rounded-2xl">
              <div className="h-full w-full transition-transform duration-700 group-hover:scale-[1.04]">
                {s.image ? (
                  <img src={media(s.image)} alt={`${s.title}, ${s.place}`} loading="lazy" className="h-full w-full object-cover" />
                ) : (
                  <PlaceholderArt palette={s.palette} seed={i + 1} label={`Placeholder for ${s.title}`} />
                )}
              </div>
              <span className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-black/45 px-2.5 py-1 text-xs backdrop-blur-md">
                <MapPin className="size-3.5" aria-hidden /> {s.place}
              </span>
            </div>
            <div className="px-3 pb-3 pt-4">
              <div className="flex items-start justify-between gap-3">
                <h3 className="font-display text-lg font-semibold">{s.title}</h3>
                <PlaceholderBadge show={!!s.placeholder} />
              </div>
              {s.date && <time className="text-sm text-muted-foreground">{s.date}</time>}
              <p className="mt-2 text-base text-muted-foreground">{s.caption}</p>
            </div>
          </Card>
        ))}
      </div>
    </Section>
  );
}

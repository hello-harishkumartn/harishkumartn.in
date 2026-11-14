import { ArrowUpRight, AtSign, BriefcaseBusiness, Camera, type LucideIcon } from 'lucide-react';
import { social, type SocialPlatform } from '../content';
import { PlaceholderBadge } from '../components/Placeholder';
import { Card, Section } from '../components/Section';

const platformMeta: Record<SocialPlatform, { name: string; Icon: LucideIcon }> = {
  instagram: { name: 'Instagram', Icon: Camera },
  linkedin: { name: 'LinkedIn', Icon: BriefcaseBusiness },
  x: { name: 'X', Icon: AtSign },
};

export function Social() {
  return (
    <Section id="social" kicker={social.kicker} title={social.title} intro={social.intro}>
      <div className="grid gap-5 md:grid-cols-3">
        {social.posts.map((p, i) => {
          const { name, Icon } = platformMeta[p.platform];
          return (
            <Card key={i}>
              <div className="flex items-start justify-between gap-3">
                <h3 className="flex items-center gap-2 font-display text-lg font-semibold">
                  <Icon className="size-4 text-primary" aria-hidden /> {name}
                </h3>
                <PlaceholderBadge show={!!p.placeholder} />
              </div>
              {p.embedUrl ? (
                <div className="mt-4 aspect-[4/5] overflow-hidden rounded-2xl bg-white">
                  <iframe className="h-full w-full" src={p.embedUrl} title={`${name} post`} loading="lazy" />
                </div>
              ) : (
                <div className="mt-4 grid aspect-[4/3] place-items-center rounded-2xl border border-dashed border-white/10 font-mono text-xs text-muted-foreground">
                  Embed slot
                </div>
              )}
              <p className="mt-4 text-base text-muted-foreground">{p.caption}</p>
              {p.url && (
                <a href={p.url} target="_blank" rel="noreferrer" className="mt-1 inline-flex min-h-11 cursor-pointer items-center gap-1 text-sm text-primary hover:underline">
                  View on {name} <ArrowUpRight className="size-3.5" aria-hidden />
                </a>
              )}
            </Card>
          );
        })}
      </div>
    </Section>
  );
}

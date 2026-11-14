import { work } from '../content';
import { Card, Pill, Section } from '../components/Section';

export function Work() {
  return (
    <Section id="work" kicker={work.kicker} title={work.title}>
      <ol className="relative space-y-5 before:absolute before:bottom-4 before:left-[7px] before:top-4 before:w-px before:bg-gradient-to-b before:from-primary/70 before:via-white/10 before:to-transparent md:pl-0">
        {work.items.map((item) => (
          <li key={item.org} className="relative pl-9">
            <span
              className={`absolute left-0 top-8 size-[15px] rounded-full border-2 ${item.current ? 'border-primary bg-primary/30' : 'border-white/25 bg-background'}`}
              aria-hidden
            />
            <Card as="div">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <h3 className="font-display text-2xl font-semibold tracking-tight">{item.org}</h3>
                <Pill live={item.current}>{item.period}</Pill>
              </div>
              <p className="mt-1 font-medium text-primary">{item.role}</p>
              <p className="mt-3 text-muted-foreground">{item.summary}</p>
              {item.highlights.length > 0 && (
                <ul className="mt-4 space-y-2">
                  {item.highlights.map((h) => (
                    <li key={h} className="flex gap-3 text-base text-foreground/85">
                      <span className="mt-2.5 size-1 shrink-0 rounded-full bg-primary" aria-hidden />
                      {h}
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </li>
        ))}
      </ol>
    </Section>
  );
}

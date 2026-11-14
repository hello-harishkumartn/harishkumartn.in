import { GraduationCap, Target } from 'lucide-react';
import { education } from '../content';
import { Card, Pill, Section } from '../components/Section';

export function Education() {
  return (
    <Section id="education" kicker={education.kicker} title={education.title}>
      <div className="grid gap-5 md:grid-cols-2">
        {education.items.map((e) => (
          <Card key={e.degree}>
            <div className="flex items-start justify-between gap-3">
              <GraduationCap className="size-6 text-primary" aria-hidden />
              <Pill live={e.current}>{e.period}</Pill>
            </div>
            <h3 className="mt-5 font-display text-2xl font-semibold tracking-tight">{e.degree}</h3>
            <p className="mt-1 text-muted-foreground">{e.school}</p>
            {e.note && <p className="mt-3">{e.note}</p>}
          </Card>
        ))}
      </div>
      <Card as="aside" className="mt-5 border-primary/25 bg-[linear-gradient(135deg,rgba(251,146,60,0.12),rgba(21,18,15,1)_60%)]">
        <div className="flex items-center gap-3">
          <Target className="size-5 text-primary" aria-hidden />
          <h3 className="font-display text-xl font-semibold">{education.dream.title}</h3>
        </div>
        <p className="mt-3 text-lg text-foreground/85">{education.dream.body}</p>
      </Card>
    </Section>
  );
}

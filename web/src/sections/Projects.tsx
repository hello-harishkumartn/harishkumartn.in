import { projects, projectsSection } from '../projects';
import { Card, Pill, Section } from '../components/Section';

const link =
  'inline-flex min-h-11 cursor-pointer items-center rounded-full border px-4 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary';

export function Projects() {
  return (
    <Section id="projects" kicker={projectsSection.kicker} title={projectsSection.title} intro={projectsSection.intro}>
      <ul className="grid gap-5 md:grid-cols-2">
        {projects.map((p) => (
          <Card key={p.slug} as="li" className="flex flex-col">
            <h3 className="font-display text-2xl font-semibold tracking-tight">{p.title}</h3>
            <p className="mt-3 flex-1 text-muted-foreground">{p.description}</p>
            <ul className="mt-4 flex flex-wrap gap-2" aria-label={`${p.title} tech stack`}>
              {p.tags.map((t) => (
                <li key={t}>
                  <Pill>{t}</Pill>
                </li>
              ))}
            </ul>
            <div className="mt-5 flex flex-wrap gap-3">
              <a href={p.href} target="_blank" rel="noreferrer" className={`${link} border-primary/60 text-primary hover:bg-primary/10`}>
                Open<span className="sr-only"> {p.title}, opens in a new tab</span>
              </a>
              <a href={p.codeUrl} target="_blank" rel="noreferrer" className={`${link} border-white/15 text-foreground hover:border-white/30`}>
                Code<span className="sr-only"> for {p.title} on GitHub, opens in a new tab</span>
              </a>
            </div>
          </Card>
        ))}
      </ul>
    </Section>
  );
}

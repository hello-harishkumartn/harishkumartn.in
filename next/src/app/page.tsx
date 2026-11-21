import Link from 'next/link';
import { getEducation, getExperience, getLinks, getProfile, getProjects } from '@/lib/content';

export const revalidate = 300;

export default async function Home() {
  const [profile, experience, education, projects, links] = await Promise.all([
    getProfile(), getExperience(), getEducation(), getProjects(), getLinks(),
  ]);
  if (!profile) return <main className="p-10">Content is not set up yet.</main>;

  return (
    <main className="mx-auto max-w-4xl px-5 py-14 sm:py-20">
      <header className="mb-16">
        <p className="mb-3 text-sm uppercase tracking-[0.2em] text-shuttle">harishkumartn.in</p>
        <h1 className="text-4xl font-bold sm:text-5xl">{profile.name}</h1>
        <p className="mt-4 max-w-2xl text-lg text-muted">{profile.description}</p>
        {profile.quick_facts.length > 0 && (
          <dl className="mt-8 grid gap-3 sm:grid-cols-3">
            {profile.quick_facts.map((f) => (
              <div key={f.label} className="rounded-lg border border-white/10 bg-panel p-4">
                <dt className="text-xs uppercase tracking-wide text-muted">{f.label}</dt>
                <dd className="mt-1 font-medium">{f.value}</dd>
              </div>
            ))}
          </dl>
        )}
      </header>

      <Section id="about" title="About">
        <div className="space-y-4 text-line/90">{profile.about.map((p, i) => <p key={i}>{p}</p>)}</div>
      </Section>

      <Section id="work" title="Work">
        <ol className="space-y-6">
          {experience.map((w) => (
            <li key={w.id} className="border-l-2 border-court pl-4">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h3 className="font-semibold">{w.role} <span className="text-muted">at {w.org}</span></h3>
                <span className="text-sm text-muted">{w.period}</span>
              </div>
              {w.summary && <p className="mt-1 text-line/85">{w.summary}</p>}
              {w.highlights.length > 0 && (
                <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-line/80">
                  {w.highlights.map((h, i) => <li key={i}>{h}</li>)}
                </ul>
              )}
            </li>
          ))}
        </ol>
      </Section>

      <Section id="projects" title="Projects">
        <div className="grid gap-4 sm:grid-cols-2">
          {projects.map((p) => (
            <Link key={p.slug} href={`/projects/${p.slug}`}
              className="group rounded-lg border border-white/10 bg-panel p-5 transition hover:border-shuttle/60">
              <h3 className="font-semibold group-hover:text-shuttle">{p.title}</h3>
              <p className="mt-2 text-sm text-line/80">{p.description}</p>
              <ul className="mt-3 flex flex-wrap gap-1.5">
                {p.tags.map((t) => <li key={t} className="rounded bg-white/5 px-2 py-0.5 text-xs text-muted">{t}</li>)}
              </ul>
            </Link>
          ))}
        </div>
      </Section>

      <Section id="education" title="Education">
        <ul className="space-y-4">
          {education.map((e) => (
            <li key={e.id} className="flex flex-wrap items-baseline justify-between gap-2">
              <div><h3 className="font-semibold">{e.degree}</h3><p className="text-muted">{e.school}</p></div>
              <span className="text-sm text-muted">{e.period}</span>
            </li>
          ))}
        </ul>
        {profile.dream && <p className="mt-6 rounded-lg border border-shuttle/30 bg-shuttle/5 p-4 text-sm">🎯 {profile.dream}</p>}
      </Section>

      <Section id="contact" title="Contact">
        <ul className="flex flex-wrap gap-3">
          {links.map((l) => (
            <li key={l.id}><a className="btn-ghost" href={l.href} rel="me noopener">{l.label}: {l.display}</a></li>
          ))}
        </ul>
      </Section>
    </main>
  );
}

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="mb-16 scroll-mt-10">
      <h2 className="mb-6 text-sm font-semibold uppercase tracking-[0.2em] text-shuttle">{title}</h2>
      {children}
    </section>
  );
}

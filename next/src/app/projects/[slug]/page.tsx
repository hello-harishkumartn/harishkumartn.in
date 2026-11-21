import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getProject, getProjects } from '@/lib/content';

export const revalidate = 300;
export const dynamicParams = true;

export async function generateStaticParams() {
  return (await getProjects()).map((p) => ({ slug: p.slug }));
}

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const p = await getProject((await params).slug);
  return p ? { title: p.title, description: p.description } : {};
}

export default async function ProjectPage({ params }: Props) {
  const p = await getProject((await params).slug);
  if (!p) notFound();
  return (
    <main className="mx-auto max-w-3xl px-5 py-14">
      <Link href="/#projects" className="text-sm text-muted hover:text-line">← Back to harishkumartn.in</Link>
      <p className="mt-8 text-sm uppercase tracking-[0.2em] text-shuttle">Project</p>
      <h1 className="mt-2 text-4xl font-bold">{p.title}</h1>
      <p className="mt-4 text-lg text-line/85">{p.description}</p>
      <ul className="mt-5 flex flex-wrap gap-1.5">
        {p.tags.map((t) => <li key={t} className="rounded bg-white/5 px-2 py-0.5 text-xs text-muted">{t}</li>)}
      </ul>
      <div className="mt-8 flex flex-wrap gap-3">
        <a className="btn-ghost" href={`https://github.com/hello-harishkumartn/${p.repo}`}>Code on GitHub</a>
        {p.demo_url && <a className="btn" href={p.demo_url}>Open the demo</a>}
      </div>
      {p.demo_note && <p className="mt-3 text-sm text-muted">{p.demo_note}</p>}
    </main>
  );
}

// One-off: turn the current web/src content into db/seed.json for the portfolio schema.
// Run: node scripts/export-seed.ts
import { writeFileSync } from 'node:fs';
import { site, about, work, education, contact } from '../../web/src/content.ts';
import { projects } from '../../web/src/projects.ts';

const seed = {
  profile: {
    name: site.name,
    short_name: site.shortName,
    headline: site.title,
    description: site.description,
    about: about.paragraphs,
    quick_facts: about.quickFacts,
    dream: education.dream.body,
  },
  experience: work.items.map((w, i) => ({
    org: w.org, role: w.role, period: w.period, is_current: !!w.current,
    summary: w.summary, highlights: w.highlights, sort: i,
  })),
  education: education.items.map((e, i) => ({
    school: e.school, degree: e.degree, period: e.period, is_current: !!e.current,
    note: e.note ?? null, sort: i,
  })),
  projects: projects.map((p, i) => {
    const link = p.links?.[0];
    const demo = p.demoUrl?.startsWith('/') ? `https://harishkumartn.in${p.demoUrl}` : p.demoUrl;
    return {
      slug: p.slug, title: p.title, description: p.description, tags: p.tags, repo: p.repo,
      demo_url: demo ?? null, demo_note: link?.note ?? null, sort: i,
    };
  }),
  links: contact.links.map((l, i) => ({ ...l, sort: i })),
};
writeFileSync(new URL('../db/seed.json', import.meta.url), JSON.stringify(seed, null, 2) + '\n');
console.log('wrote db/seed.json:', seed.projects.length, 'projects,', seed.experience.length, 'jobs');

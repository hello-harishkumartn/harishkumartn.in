'use server';
import { headers } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { getAdmin, getAuth } from '@/lib/auth';
import { getPool } from '@/lib/pool';

const str = (f: FormData, k: string) => String(f.get(k) ?? '').trim();
const lines = (s: string) => s.split('\n').map((l) => l.trim()).filter(Boolean);
const num = (f: FormData, k: string) => Number.parseInt(str(f, k) || '0', 10) || 0;

async function guard() {
  if (!(await getAdmin())) redirect('/admin/login');
}
function done(tab: string) {
  revalidatePath('/', 'layout');
  redirect(`/admin?saved=${tab}#${tab}`);
}

export async function signIn(_: unknown, form: FormData) {
  try {
    await getAuth().api.signInEmail({ body: { email: str(form, 'email'), password: String(form.get('password') ?? '') }, headers: await headers() });
  } catch {
    return { error: 'Wrong email or password.' };
  }
  redirect('/admin');
}

export async function signOut() {
  await getAuth().api.signOut({ headers: await headers() });
  redirect('/admin/login');
}

export async function saveProfile(form: FormData) {
  await guard();
  const facts = lines(str(form, 'quick_facts')).map((l) => {
    const [label, ...rest] = l.split('|');
    return { label: label.trim(), value: rest.join('|').trim() };
  }).filter((f) => f.label && f.value);
  const about = str(form, 'about').split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
  await getPool().query(
    `update portfolio.profile set name=$1, short_name=$2, headline=$3, description=$4, about=$5, quick_facts=$6, dream=$7, updated_at=now() where id=1`,
    [str(form, 'name'), str(form, 'short_name'), str(form, 'headline'), str(form, 'description'),
      JSON.stringify(about), JSON.stringify(facts), str(form, 'dream') || null],
  );
  done('profile');
}

export async function saveExperience(form: FormData) {
  await guard();
  const id = str(form, 'id');
  const v = [str(form, 'org'), str(form, 'role'), str(form, 'period'), form.get('is_current') === 'on',
    str(form, 'summary'), JSON.stringify(lines(str(form, 'highlights'))), num(form, 'sort')];
  if (id) await getPool().query('update portfolio.experience set org=$1, role=$2, period=$3, is_current=$4, summary=$5, highlights=$6, sort=$7 where id=$8', [...v, id]);
  else await getPool().query('insert into portfolio.experience (org, role, period, is_current, summary, highlights, sort) values ($1,$2,$3,$4,$5,$6,$7)', v);
  done('experience');
}

export async function saveEducation(form: FormData) {
  await guard();
  const id = str(form, 'id');
  const v = [str(form, 'school'), str(form, 'degree'), str(form, 'period'), form.get('is_current') === 'on', str(form, 'note') || null, num(form, 'sort')];
  if (id) await getPool().query('update portfolio.education set school=$1, degree=$2, period=$3, is_current=$4, note=$5, sort=$6 where id=$7', [...v, id]);
  else await getPool().query('insert into portfolio.education (school, degree, period, is_current, note, sort) values ($1,$2,$3,$4,$5,$6)', v);
  done('education');
}

export async function saveProject(form: FormData) {
  await guard();
  const slug = str(form, 'slug').toLowerCase().replace(/[^a-z0-9-]/g, '-');
  if (!slug) done('projects');
  const tags = str(form, 'tags').split(',').map((t) => t.trim()).filter(Boolean);
  await getPool().query(
    `insert into portfolio.projects (slug, title, description, tags, repo, demo_url, demo_note, is_published, sort)
     values ($1,$2,$3,$4,$5,$6,$7,$8,$9)
     on conflict (slug) do update set title=excluded.title, description=excluded.description, tags=excluded.tags, repo=excluded.repo,
       demo_url=excluded.demo_url, demo_note=excluded.demo_note, is_published=excluded.is_published, sort=excluded.sort, updated_at=now()`,
    [slug, str(form, 'title'), str(form, 'description'), JSON.stringify(tags), str(form, 'repo'),
      str(form, 'demo_url') || null, str(form, 'demo_note') || null, form.get('is_published') === 'on', num(form, 'sort')],
  );
  done('projects');
}

export async function saveLink(form: FormData) {
  await guard();
  const id = str(form, 'id');
  const v = [str(form, 'icon'), str(form, 'label'), str(form, 'href'), str(form, 'display'), num(form, 'sort')];
  if (id) await getPool().query('update portfolio.links set icon=$1, label=$2, href=$3, display=$4, sort=$5 where id=$6', [...v, id]);
  else await getPool().query('insert into portfolio.links (icon, label, href, display, sort) values ($1,$2,$3,$4,$5)', v);
  done('links');
}

const deletable = { experience: 'id', education: 'id', links: 'id', projects: 'slug' } as const;
export async function deleteRow(form: FormData) {
  await guard();
  const table = str(form, 'table') as keyof typeof deletable;
  if (!(table in deletable)) return;
  await getPool().query(`delete from portfolio.${table} where ${deletable[table]} = $1`, [str(form, 'key')]);
  done(table);
}

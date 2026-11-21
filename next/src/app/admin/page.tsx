import { redirect } from 'next/navigation';
import { getAdmin } from '@/lib/auth';
import { getEducation, getExperience, getLinks, getProfile, getProjects } from '@/lib/content';
import { deleteRow, saveEducation, saveExperience, saveLink, saveProfile, saveProject, signOut } from './actions';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Admin' };

type SP = { searchParams: Promise<{ saved?: string }> };

export default async function Admin({ searchParams }: SP) {
  const admin = await getAdmin();
  if (!admin) redirect('/admin/login');
  const { saved } = await searchParams;
  const [profile, experience, education, projects, links] = await Promise.all([
    getProfile(), getExperience(), getEducation(), getProjects(true), getLinks(),
  ]);

  return (
    <main className="mx-auto max-w-4xl px-5 py-10">
      <div className="mb-8 flex items-center justify-between">
        <div><h1 className="text-2xl font-bold">Edit portfolio</h1><p className="text-sm text-muted">Signed in as {admin.email}. Changes go live on the site right away.</p></div>
        <div className="flex gap-2"><a className="btn-ghost" href="/">View site</a><form action={signOut}><button className="btn-ghost">Sign out</button></form></div>
      </div>
      {saved && <p className="mb-6 rounded-md border border-court bg-court/20 px-4 py-2 text-sm">Saved {saved}.</p>}

      <Block id="profile" title="Profile">
        {profile && (
          <form action={saveProfile} className="grid gap-4 sm:grid-cols-2">
            <F label="Name" name="name" value={profile.name} />
            <F label="Short name" name="short_name" value={profile.short_name} />
            <F label="Page title" name="headline" value={profile.headline} wide />
            <F label="Intro line" name="description" value={profile.description} area wide />
            <F label="About (blank line between paragraphs)" name="about" value={profile.about.join('\n\n')} area rows={8} wide />
            <F label="Quick facts (one per line: label | value)" name="quick_facts" value={profile.quick_facts.map((f) => `${f.label} | ${f.value}`).join('\n')} area wide />
            <F label="Dream" name="dream" value={profile.dream ?? ''} wide />
            <div><button className="btn">Save profile</button></div>
          </form>
        )}
      </Block>

      <Block id="experience" title="Work experience">
        {[...experience, null].map((w) => (
          <Item key={w?.id ?? 'new'} isNew={!w} del={w && { table: 'experience', key: String(w.id) }}>
            <form action={saveExperience} className="grid gap-3 sm:grid-cols-2">
              <input type="hidden" name="id" value={w?.id ?? ''} />
              <F label="Organisation" name="org" value={w?.org} />
              <F label="Role" name="role" value={w?.role} />
              <F label="Period" name="period" value={w?.period} />
              <F label="Order" name="sort" value={String(w?.sort ?? experience.length)} />
              <F label="Summary" name="summary" value={w?.summary} area wide />
              <F label="Highlights (one per line)" name="highlights" value={w?.highlights.join('\n')} area wide />
              <Check name="is_current" label="Current role" on={w?.is_current} />
              <div><button className="btn">{w ? 'Save' : 'Add role'}</button></div>
            </form>
          </Item>
        ))}
      </Block>

      <Block id="education" title="Education">
        {[...education, null].map((e) => (
          <Item key={e?.id ?? 'new'} isNew={!e} del={e && { table: 'education', key: String(e.id) }}>
            <form action={saveEducation} className="grid gap-3 sm:grid-cols-2">
              <input type="hidden" name="id" value={e?.id ?? ''} />
              <F label="School" name="school" value={e?.school} />
              <F label="Degree" name="degree" value={e?.degree} />
              <F label="Period" name="period" value={e?.period} />
              <F label="Order" name="sort" value={String(e?.sort ?? education.length)} />
              <F label="Note" name="note" value={e?.note ?? ''} wide />
              <Check name="is_current" label="Studying now" on={e?.is_current} />
              <div><button className="btn">{e ? 'Save' : 'Add school'}</button></div>
            </form>
          </Item>
        ))}
      </Block>

      <Block id="projects" title="Projects">
        {[...projects, null].map((p) => (
          <Item key={p?.slug ?? 'new'} isNew={!p} del={p && { table: 'projects', key: p.slug }}>
            <form action={saveProject} className="grid gap-3 sm:grid-cols-2">
              {p ? <input type="hidden" name="slug" value={p.slug} /> : <F label="Slug (URL: /projects/slug)" name="slug" value="" />}
              <F label="Title" name="title" value={p?.title} />
              <F label="GitHub repo name" name="repo" value={p?.repo} />
              <F label="Order" name="sort" value={String(p?.sort ?? projects.length)} />
              <F label="Description" name="description" value={p?.description} area wide />
              <F label="Tags (comma separated)" name="tags" value={p?.tags.join(', ')} wide />
              <F label="Demo URL" name="demo_url" value={p?.demo_url ?? ''} wide />
              <F label="Demo note" name="demo_note" value={p?.demo_note ?? ''} wide />
              <Check name="is_published" label="Show on site" on={p ? p.is_published : true} />
              <div><button className="btn">{p ? `Save ${p.title}` : 'Add project'}</button></div>
            </form>
          </Item>
        ))}
      </Block>

      <Block id="links" title="Contact links">
        {[...links, null].map((l) => (
          <Item key={l?.id ?? 'new'} isNew={!l} del={l && { table: 'links', key: String(l.id) }}>
            <form action={saveLink} className="grid gap-3 sm:grid-cols-2">
              <input type="hidden" name="id" value={l?.id ?? ''} />
              <F label="Label" name="label" value={l?.label} />
              <F label="Icon (mail, linkedin, instagram, x, youtube)" name="icon" value={l?.icon} />
              <F label="Link" name="href" value={l?.href} />
              <F label="Shown as" name="display" value={l?.display} />
              <F label="Order" name="sort" value={String(l?.sort ?? links.length)} />
              <div className="self-end"><button className="btn">{l ? 'Save' : 'Add link'}</button></div>
            </form>
          </Item>
        ))}
      </Block>
    </main>
  );
}

function Block({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return <section id={id} className="mb-12 scroll-mt-6"><h2 className="mb-4 text-lg font-semibold text-shuttle">{title}</h2><div className="space-y-4">{children}</div></section>;
}
function Item({ isNew, del, children }: { isNew: boolean; del: { table: string; key: string } | null; children: React.ReactNode }) {
  return (
    <div className={`rounded-lg border p-4 ${isNew ? 'border-dashed border-white/20' : 'border-white/10 bg-panel'}`}>
      {isNew && <p className="mb-3 text-xs uppercase tracking-wide text-muted">Add new</p>}
      {children}
      {del && (
        <form action={deleteRow} className="mt-3 text-right">
          <input type="hidden" name="table" value={del.table} /><input type="hidden" name="key" value={del.key} />
          <button className="text-xs text-red-300 hover:underline">Delete</button>
        </form>
      )}
    </div>
  );
}
function F({ label, name, value, area, wide, rows = 3 }: { label: string; name: string; value?: string; area?: boolean; wide?: boolean; rows?: number }) {
  return (
    <div className={wide ? 'sm:col-span-2' : ''}>
      <label className="label">{label}</label>
      {area ? <textarea className="input" name={name} defaultValue={value ?? ''} rows={rows} /> : <input className="input" name={name} defaultValue={value ?? ''} />}
    </div>
  );
}
function Check({ name, label, on }: { name: string; label: string; on?: boolean }) {
  return <label className="flex items-center gap-2 text-sm"><input type="checkbox" name={name} defaultChecked={!!on} /> {label}</label>;
}

import 'server-only';
import { getPool } from './pool';

export interface Profile {
  name: string; short_name: string; headline: string; description: string;
  about: string[]; quick_facts: { label: string; value: string }[]; dream: string | null;
}
export interface Experience { id: number; org: string; role: string; period: string; is_current: boolean; summary: string; highlights: string[]; sort: number }
export interface Education { id: number; school: string; degree: string; period: string; is_current: boolean; note: string | null; sort: number }
export interface Project { slug: string; title: string; description: string; tags: string[]; repo: string; demo_url: string | null; demo_note: string | null; is_published: boolean; sort: number }
export interface Link { id: number; icon: string; label: string; href: string; display: string; sort: number }

const q = async <T>(sql: string, params: unknown[] = []) => (await getPool().query(sql, params)).rows as T[];

export async function getProfile() {
  return (await q<Profile>('select name, short_name, headline, description, about, quick_facts, dream from portfolio.profile where id = 1'))[0] ?? null;
}
export const getExperience = () => q<Experience>('select * from portfolio.experience order by sort, id');
export const getEducation = () => q<Education>('select * from portfolio.education order by sort, id');
export const getProjects = (all = false) =>
  q<Project>(`select * from portfolio.projects ${all ? '' : 'where is_published'} order by sort, slug`);
export async function getProject(slug: string) {
  return (await q<Project>('select * from portfolio.projects where slug = $1 and is_published', [slug]))[0] ?? null;
}
export const getLinks = () => q<Link>('select * from portfolio.links order by sort, id');
